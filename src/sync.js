/**
 * LifeQuest Cloud Sync client & deterministic multi-device state merger.
 */

import { sanitizeState } from './storage.js';

const GITHUB_API = 'https://api.github.com';
export const GIST_FILENAME = 'lifequest-sync-vault.json';
export const GIST_DESCRIPTION = 'LifeQuest Cloud Sync Vault (Private — Do not delete)';
export const GITHUB_TOKEN_CREATE_URL =
  'https://github.com/settings/tokens/new?scopes=gist&description=LifeQuest+Sync';

/**
 * Union-merge two arrays of objects keyed by `idField`, honoring deletion tombstones
 * and picking the newer `updatedAt` version when the same item exists on both devices.
 */
function mergeById(localItems = [], remoteItems = [], deletedIds = {}, idField = 'id') {
  const map = new Map();

  for (const item of remoteItems) {
    if (!item || !item[idField] || deletedIds[item[idField]]) continue;
    map.set(item[idField], item);
  }

  for (const item of localItems) {
    if (!item || !item[idField] || deletedIds[item[idField]]) continue;
    const prev = map.get(item[idField]);
    if (!prev) {
      map.set(item[idField], item);
    } else {
      const localTs = Number(item.updatedAt || item.createdAt || item.timestamp || item.redeemedAt || 0);
      const remoteTs = Number(prev.updatedAt || prev.createdAt || prev.timestamp || prev.redeemedAt || 0);
      if (localTs >= remoteTs) {
        map.set(item[idField], item);
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Merge local and remote LifeQuest states cleanly without losing sessions from either device.
 * Keeps local device theme & sound preferences intact.
 */
export function mergeStates(localRaw, remoteRaw) {
  const local = sanitizeState(localRaw);
  const remote = sanitizeState(remoteRaw);

  // Merge deletion tombstones (keep latest timestamp)
  const deletedIds = { ...(remote.deletedIds || {}) };
  for (const [id, ts] of Object.entries(local.deletedIds || {})) {
    deletedIds[id] = Math.max(Number(deletedIds[id] || 0), Number(ts || 0));
  }

  const activities = mergeById(local.activities, remote.activities, deletedIds, 'id');
  const validActIds = new Set(activities.map((a) => a.id));

  const sessions = mergeById(local.sessions, remote.sessions, deletedIds, 'id')
    .filter((s) => validActIds.has(s.activityId))
    .sort((a, b) => a.timestamp - b.timestamp);

  const claimedQuests = Array.from(new Set([...(remote.claimedQuests || []), ...(local.claimedQuests || [])]));
  const claimedBossWeeks = Array.from(new Set([...(remote.claimedBossWeeks || []), ...(local.claimedBossWeeks || [])]));

  // Merge custom quests (keep completed/claimed true if true on either device)
  const cqMap = new Map();
  for (const q of [...(remote.customQuests || []), ...(local.customQuests || [])]) {
    if (!q || !q.id || deletedIds[q.id]) continue;
    const prev = cqMap.get(q.id);
    if (!prev) {
      cqMap.set(q.id, { ...q });
    } else {
      cqMap.set(q.id, {
        ...prev,
        ...q,
        completed: Boolean(prev.completed || q.completed),
        claimed: Boolean(prev.claimed || q.claimed),
      });
    }
  }
  const customQuests = Array.from(cqMap.values());

  const bossTrophies = mergeById(local.bossTrophies, remote.bossTrophies, {}, 'weekKey');
  const rewards = mergeById(local.rewards, remote.rewards, deletedIds, 'id');
  const rewardRedemptions = mergeById(local.rewardRedemptions, remote.rewardRedemptions, deletedIds, 'id');

  // Merge unlocked achievements (earliest unlock timestamp wins)
  const unlockedAchievements = { ...(remote.unlockedAchievements || {}) };
  for (const [id, ts] of Object.entries(local.unlockedAchievements || {})) {
    unlockedAchievements[id] = unlockedAchievements[id]
      ? Math.min(unlockedAchievements[id], ts)
      : ts;
  }

  const remoteIsNewer = (remote.updatedAt || 0) > (local.updatedAt || 0);
  const profile = remoteIsNewer ? { ...remote.profile } : { ...local.profile };
  const bossDifficulty = remoteIsNewer ? remote.bossDifficulty : local.bossDifficulty;
  const vaultSplitPercent = remoteIsNewer ? remote.vaultSplitPercent : local.vaultSplitPercent;
  const vaultManualDeposit = remoteIsNewer ? remote.vaultManualDeposit : local.vaultManualDeposit;

  // Keep each device's local theme, sound & FX preferences
  const settings = { ...local.settings };

  const bonusXp = Math.max(Number(local.bonusXp) || 0, Number(remote.bonusXp) || 0);
  const bonusGold = Math.max(Number(local.bonusGold) || 0, Number(remote.bonusGold) || 0);
  const updatedAt = Math.max(Number(local.updatedAt) || 0, Number(remote.updatedAt) || 0);

  return sanitizeState({
    version: local.version,
    profile,
    settings,
    bossDifficulty,
    vaultSplitPercent,
    vaultManualDeposit,
    activities,
    sessions,
    claimedQuests,
    customQuests,
    claimedBossWeeks,
    bossTrophies,
    rewards,
    rewardRedemptions,
    unlockedAchievements,
    bonusXp,
    bonusGold,
    deletedIds,
    updatedAt,
  });
}

/**
 * Pick the most recently updated live timer across devices.
 */
export function mergeActiveTimers(localTimer, localUpdatedAt, remoteTimer, remoteUpdatedAt) {
  const lTs = Number(localUpdatedAt) || 0;
  const rTs = Number(remoteUpdatedAt) || 0;
  if (rTs > lTs) {
    return { activeTimer: remoteTimer || null, activeTimerUpdatedAt: rTs };
  }
  return { activeTimer: localTimer || null, activeTimerUpdatedAt: lTs };
}

/**
 * Build the JSON string stored inside the private GitHub Gist vault file.
 */
export function buildGistVaultPayload({ version = 1, state, activeTimer = null, activeTimerUpdatedAt = 0 }) {
  return JSON.stringify(
    {
      app: 'LifeQuest',
      schemaVersion: 2,
      version: Math.max(1, Number(version) || 1),
      updatedAt: Date.now(),
      activeTimer: activeTimer || null,
      activeTimerUpdatedAt: Math.max(0, Number(activeTimerUpdatedAt) || 0),
      state: sanitizeState(state),
    },
    null,
    2
  );
}

/**
 * Parse a GitHub Gist API object into a normalized LifeQuest sync snapshot.
 */
export function parseGistVaultPayload(gistObj) {
  const file = gistObj && gistObj.files ? gistObj.files[GIST_FILENAME] : null;
  if (!file) {
    throw new Error(`Sync file "${GIST_FILENAME}" was not found inside this Gist.`);
  }
  if (file.truncated && file.raw_url) {
    return { needsRawFetch: true, rawUrl: file.raw_url };
  }
  return parseGistVaultText(file.content || '');
}

export function parseGistVaultText(jsonText) {
  let parsed;
  try {
    parsed = JSON.parse(String(jsonText || ''));
  } catch {
    throw new Error('Could not parse LifeQuest sync data from GitHub Gist.');
  }
  const rawState = parsed && parsed.state && typeof parsed.state === 'object' ? parsed.state : parsed;
  if (!rawState || !Array.isArray(rawState.activities)) {
    throw new Error('GitHub Gist does not contain valid LifeQuest vault data.');
  }
  return {
    needsRawFetch: false,
    version: Math.max(1, Number(parsed.version) || 1),
    state: sanitizeState(rawState),
    activeTimer: parsed.activeTimer && typeof parsed.activeTimer === 'object' ? parsed.activeTimer : null,
    activeTimerUpdatedAt: Math.max(0, Number(parsed.activeTimerUpdatedAt) || 0),
  };
}

/**
 * Locate the most recently updated LifeQuest sync Gist from a user's Gist list.
 */
export function findLifeQuestGist(gists = []) {
  if (!Array.isArray(gists)) return null;
  const matches = gists.filter((g) => g && g.id && g.files && Boolean(g.files[GIST_FILENAME]));
  if (matches.length === 0) return null;
  matches.sort((a, b) => Date.parse(b.updated_at || 0) - Date.parse(a.updated_at || 0));
  return matches[0];
}

async function githubFetch(path, token, { method = 'GET', body = null } = {}) {
  const cleanToken = String(token || '').trim();
  if (!cleanToken) {
    throw new Error('Please paste your GitHub Sync Token first.');
  }

  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${cleanToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (body !== null) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers,
    body: body !== null ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (!res.ok) {
    if (res.status === 401) {
      const err = new Error('Invalid or expired GitHub token. Please generate a new token with "gist" permission.');
      err.status = 401;
      throw err;
    }
    if (res.status === 403) {
      const msg = (data && data.message) || '';
      const err = new Error(
        msg.toLowerCase().includes('rate limit')
          ? 'GitHub API rate limit reached — please wait a minute and try again.'
          : 'GitHub token is missing "gist" permission. Create a token with the "gist" box checked!'
      );
      err.status = 403;
      throw err;
    }
    if (res.status === 404) {
      const err = new Error('Private sync Gist not found. Click Connect again to recreate it.');
      err.status = 404;
      throw err;
    }
    const err = new Error((data && data.message) || `GitHub sync error (${res.status}).`);
    err.status = res.status;
    throw err;
  }

  return { status: res.status, data };
}

async function hydrateGistSnapshot(gistObj, token) {
  const parsed = parseGistVaultPayload(gistObj);
  if (!parsed.needsRawFetch) return parsed;

  const rawRes = await fetch(parsed.rawUrl, {
    headers: { Authorization: `Bearer ${String(token || '').trim()}` },
    cache: 'no-store',
  });
  if (!rawRes.ok) {
    throw new Error(`Could not download full sync vault (${rawRes.status}).`);
  }
  const rawText = await rawRes.text();
  return parseGistVaultText(rawText);
}

/**
 * Connect with a GitHub token:
 * 1. Verify token & fetch GitHub username.
 * 2. Auto-discover an existing private LifeQuest Gist (seamless 2nd-device phone login!).
 * 3. If none exists yet, create a brand-new private Gist seeded with local progress.
 */
export async function apiGistConnect({ token, state, activeTimer, activeTimerUpdatedAt }) {
  const cleanToken = String(token || '').trim();
  const { data: user } = await githubFetch('/user', cleanToken);
  const username = (user && user.login) || 'github-user';

  // Scan user's gists (up to 100) to auto-discover existing LifeQuest vault
  const { data: gists } = await githubFetch('/gists?per_page=100', cleanToken);
  const existing = findLifeQuestGist(gists);

  if (existing) {
    const { data: fullGist } = await githubFetch(`/gists/${encodeURIComponent(existing.id)}`, cleanToken);
    const snapshot = await hydrateGistSnapshot(fullGist, cleanToken);
    return {
      ok: true,
      created: false,
      username,
      gistId: fullGist.id,
      gistUrl: fullGist.html_url || `https://gist.github.com/${fullGist.id}`,
      version: snapshot.version,
      state: snapshot.state,
      activeTimer: snapshot.activeTimer,
      activeTimerUpdatedAt: snapshot.activeTimerUpdatedAt,
    };
  }

  // First device — create a brand-new secret Gist with local progress
  const content = buildGistVaultPayload({
    version: 1,
    state,
    activeTimer,
    activeTimerUpdatedAt,
  });

  const { data: created } = await githubFetch('/gists', cleanToken, {
    method: 'POST',
    body: {
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILENAME]: { content },
      },
    },
  });

  return {
    ok: true,
    created: true,
    username,
    gistId: created.id,
    gistUrl: created.html_url || `https://gist.github.com/${created.id}`,
    version: 1,
    state: sanitizeState(state),
    activeTimer: activeTimer || null,
    activeTimerUpdatedAt: Math.max(0, Number(activeTimerUpdatedAt) || 0),
  };
}

export async function apiGistPull({ token, gistId }) {
  const { status, data: fullGist } = await githubFetch(`/gists/${encodeURIComponent(gistId)}`, token);
  const snapshot = await hydrateGistSnapshot(fullGist, token);
  return {
    status,
    data: {
      ok: true,
      version: snapshot.version,
      state: snapshot.state,
      activeTimer: snapshot.activeTimer,
      activeTimerUpdatedAt: snapshot.activeTimerUpdatedAt,
      gistUrl: fullGist.html_url || `https://gist.github.com/${gistId}`,
    },
  };
}

export async function apiGistPush({ token, gistId, version, state, activeTimer, activeTimerUpdatedAt }) {
  const nextVersion = Math.max(1, Number(version) || 1);
  const content = buildGistVaultPayload({
    version: nextVersion,
    state,
    activeTimer,
    activeTimerUpdatedAt,
  });

  const { status, data: updated } = await githubFetch(`/gists/${encodeURIComponent(gistId)}`, token, {
    method: 'PATCH',
    body: {
      description: GIST_DESCRIPTION,
      files: {
        [GIST_FILENAME]: { content },
      },
    },
  });

  return {
    status,
    data: {
      ok: true,
      version: nextVersion,
      gistUrl: (updated && updated.html_url) || `https://gist.github.com/${gistId}`,
    },
  };
}
