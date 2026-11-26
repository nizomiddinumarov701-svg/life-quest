/**
 * LifeQuest Cloud Sync client & deterministic multi-device state merger.
 */

import { sanitizeState } from './storage.js';

const SYNC_ENDPOINT = '/api/sync';

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

async function callSyncApi(payload, token = null) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(SYNC_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      res.status === 404
        ? 'Cloud Sync is available on the live Netlify URL (not on local server.js).'
        : `Sync server returned unexpected response (${res.status}).`
    );
  }

  return { status: res.status, data };
}

export async function apiRegisterVault({ vaultId, passcode, state, activeTimer, activeTimerUpdatedAt }) {
  return callSyncApi({
    action: 'register',
    vaultId,
    passcode,
    state,
    activeTimer,
    activeTimerUpdatedAt,
  });
}

export async function apiLoginVault({ vaultId, passcode }) {
  return callSyncApi({
    action: 'login',
    vaultId,
    passcode,
  });
}

export async function apiPullVault(token) {
  return callSyncApi({ action: 'pull' }, token);
}

export async function apiPushVault({ token, baseVersion, state, activeTimer, activeTimerUpdatedAt }) {
  return callSyncApi(
    {
      action: 'push',
      baseVersion,
      state,
      activeTimer,
      activeTimerUpdatedAt,
    },
    token
  );
}

export async function apiLogoutVault(token) {
  return callSyncApi({ action: 'logout' }, token);
}
