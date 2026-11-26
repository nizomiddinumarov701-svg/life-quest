import crypto from "node:crypto";
import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";

const db = getDatabase();

const NO_STORE_HEADERS = {
  "cache-control": "no-store",
  "content-type": "application/json; charset=utf-8",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: NO_STORE_HEADERS,
  });
}

function normalizeVaultId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,31}$/.test(cleaned)) return null;
  return cleaned;
}

function validatePasscode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (trimmed.length < 4 || trimmed.length > 128) return null;
  return trimmed;
}

function hashPasscode(passcode: string, saltHex: string): string {
  return crypto.scryptSync(passcode, saltHex, 32).toString("hex");
}

function verifyPasscode(passcode: string, saltHex: string, expectedHex: string): boolean {
  const actual = Buffer.from(hashPasscode(passcode, saltHex), "hex");
  const expected = Buffer.from(expectedHex, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function parseJsonColumn<T>(value: unknown): T {
  if (typeof value === "string") {
    return JSON.parse(value) as T;
  }
  return value as T;
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  return token.length >= 16 ? token : null;
}

interface VaultRow {
  vault_id: string;
  pass_salt: string;
  pass_hash: string;
  state_json: unknown;
  active_timer_json: unknown;
  active_timer_updated_at: number | string;
  version: number;
  updated_at: string;
}

async function authenticateRequest(req: Request): Promise<{ vault: VaultRow; tokenHash: string } | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  const tokenHash = hashToken(token);

  const rows = await db.sql<VaultRow>`
    SELECT v.vault_id, v.pass_salt, v.pass_hash, v.state_json, v.active_timer_json,
           v.active_timer_updated_at, v.version, v.updated_at
    FROM sync_sessions s
    JOIN sync_vaults v ON v.vault_id = s.vault_id
    WHERE s.token_hash = ${tokenHash}
    LIMIT 1
  `;

  if (!rows || rows.length === 0) return null;
  return { vault: rows[0], tokenHash };
}

function formatVaultPayload(vault: VaultRow) {
  return {
    vaultId: vault.vault_id,
    version: Number(vault.version) || 1,
    updatedAt: vault.updated_at,
    state: parseJsonColumn<Record<string, unknown>>(vault.state_json),
    activeTimer: vault.active_timer_json ? parseJsonColumn<Record<string, unknown>>(vault.active_timer_json) : null,
    activeTimerUpdatedAt: Number(vault.active_timer_updated_at) || 0,
  };
}

export default async (req: Request, _context: Context) => {
  try {
    if (req.method === "GET") {
      const auth = await authenticateRequest(req);
      if (!auth) {
        return jsonResponse({ ok: false, error: "Invalid or expired sync session." }, 401);
      }
      return jsonResponse({ ok: true, ...formatVaultPayload(auth.vault) });
    }

    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "Method not allowed." }, 405);
    }

    const rawText = await req.text();
    if (rawText.length > 2 * 1024 * 1024) {
      return jsonResponse({ ok: false, error: "Sync payload is too large." }, 413);
    }

    let body: Record<string, unknown>;
    try {
      body = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body." }, 400);
    }

    const action = typeof body.action === "string" ? body.action : "";

    if (action === "register") {
      const vaultId = normalizeVaultId(body.vaultId);
      if (!vaultId) {
        return jsonResponse(
          { ok: false, error: "Sync Name must be 3–32 characters (letters, numbers, - or _)." },
          400
        );
      }
      const passcode = validatePasscode(body.passcode);
      if (!passcode) {
        return jsonResponse({ ok: false, error: "Passcode must be at least 4 characters." }, 400);
      }
      if (!body.state || typeof body.state !== "object") {
        return jsonResponse({ ok: false, error: "Missing initial state." }, 400);
      }

      const existing = await db.sql<{ vault_id: string }>`
        SELECT vault_id FROM sync_vaults WHERE vault_id = ${vaultId} LIMIT 1
      `;
      if (existing.length > 0) {
        return jsonResponse(
          { ok: false, error: "That Sync Name already exists — switch to Sign In to connect to it!" },
          409
        );
      }

      const salt = crypto.randomBytes(16).toString("hex");
      const passHash = hashPasscode(passcode, salt);
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const stateStr = JSON.stringify(body.state);
      const timerStr = body.activeTimer ? JSON.stringify(body.activeTimer) : null;
      const timerUpdatedAt = Math.max(0, Math.round(Number(body.activeTimerUpdatedAt) || 0));

      const inserted = await db.sql<VaultRow>`
        INSERT INTO sync_vaults (vault_id, pass_salt, pass_hash, state_json, active_timer_json, active_timer_updated_at, version)
        VALUES (${vaultId}, ${salt}, ${passHash}, ${stateStr}::jsonb, ${timerStr}::jsonb, ${timerUpdatedAt}, 1)
        RETURNING vault_id, pass_salt, pass_hash, state_json, active_timer_json, active_timer_updated_at, version, updated_at
      `;

      await db.sql`
        INSERT INTO sync_sessions (token_hash, vault_id)
        VALUES (${tokenHash}, ${vaultId})
      `;

      return jsonResponse({ ok: true, token, ...formatVaultPayload(inserted[0]) }, 201);
    }

    if (action === "login") {
      const vaultId = normalizeVaultId(body.vaultId);
      const passcode = validatePasscode(body.passcode);
      if (!vaultId || !passcode) {
        return jsonResponse({ ok: false, error: "Enter a valid Sync Name and passcode." }, 400);
      }

      const rows = await db.sql<VaultRow>`
        SELECT vault_id, pass_salt, pass_hash, state_json, active_timer_json,
               active_timer_updated_at, version, updated_at
        FROM sync_vaults
        WHERE vault_id = ${vaultId}
        LIMIT 1
      `;

      if (rows.length === 0 || !verifyPasscode(passcode, rows[0].pass_salt, rows[0].pass_hash)) {
        return jsonResponse({ ok: false, error: "Wrong Sync Name or passcode." }, 401);
      }

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      await db.sql`
        INSERT INTO sync_sessions (token_hash, vault_id)
        VALUES (${tokenHash}, ${vaultId})
      `;

      return jsonResponse({ ok: true, token, ...formatVaultPayload(rows[0]) });
    }

    if (action === "pull") {
      const auth = await authenticateRequest(req);
      if (!auth) {
        return jsonResponse({ ok: false, error: "Invalid or expired sync session." }, 401);
      }
      return jsonResponse({ ok: true, ...formatVaultPayload(auth.vault) });
    }

    if (action === "push") {
      const auth = await authenticateRequest(req);
      if (!auth) {
        return jsonResponse({ ok: false, error: "Invalid or expired sync session." }, 401);
      }
      if (!body.state || typeof body.state !== "object") {
        return jsonResponse({ ok: false, error: "Missing state payload." }, 400);
      }

      const baseVersion = Math.max(0, Math.round(Number(body.baseVersion) || 0));
      const stateStr = JSON.stringify(body.state);
      const timerStr = body.activeTimer ? JSON.stringify(body.activeTimer) : null;
      const timerUpdatedAt = Math.max(0, Math.round(Number(body.activeTimerUpdatedAt) || 0));

      const updated = await db.sql<{ version: number; updated_at: string }>`
        UPDATE sync_vaults
        SET state_json = ${stateStr}::jsonb,
            active_timer_json = ${timerStr}::jsonb,
            active_timer_updated_at = ${timerUpdatedAt},
            version = version + 1,
            updated_at = NOW()
        WHERE vault_id = ${auth.vault.vault_id}
          AND version = ${baseVersion}
        RETURNING version, updated_at
      `;

      if (updated.length === 0) {
        const latest = await db.sql<VaultRow>`
          SELECT vault_id, pass_salt, pass_hash, state_json, active_timer_json,
                 active_timer_updated_at, version, updated_at
          FROM sync_vaults
          WHERE vault_id = ${auth.vault.vault_id}
          LIMIT 1
        `;
        if (latest.length === 0) {
          return jsonResponse({ ok: false, error: "Vault no longer exists." }, 404);
        }
        return jsonResponse({ ok: false, conflict: true, ...formatVaultPayload(latest[0]) }, 409);
      }

      return jsonResponse({
        ok: true,
        vaultId: auth.vault.vault_id,
        version: Number(updated[0].version),
        updatedAt: updated[0].updated_at,
      });
    }

    if (action === "logout") {
      const auth = await authenticateRequest(req);
      if (auth) {
        await db.sql`DELETE FROM sync_sessions WHERE token_hash = ${auth.tokenHash}`;
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: false, error: "Unknown sync action." }, 400);
  } catch (err) {
    console.error("LifeQuest sync error:", err);
    return jsonResponse({ ok: false, error: "Cloud sync service error. Please try again." }, 500);
  }
};

export const config: Config = {
  path: "/api/sync",
};
