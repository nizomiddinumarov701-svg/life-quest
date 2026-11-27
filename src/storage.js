/**
 * Local-first browser storage, defaults, JSON import/export & sample data generator.
 */

import {
  ATTRIBUTE_MAP,
  BOSS_DIFFICULTIES,
  GEAR_MAP,
  GEAR_SLOTS,
  RPG_THEME_MAP,
  calculateSessionXp,
  getLocalDateKey,
} from './rpgEngine.js';

export const STORAGE_KEY = 'lifequest_state_v1';
export const TIMER_STORAGE_KEY = 'lifequest_active_timer_v1';
export const SYNC_META_KEY = 'lifequest_sync_meta_v1';
export const SCHEMA_VERSION = 2;

export function generateId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 10)}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createStarterActivities() {
  const now = Date.now();
  return [
    {
      id: 'act_coding',
      name: 'Deep Work & Coding',
      icon: '💻',
      color: '#fbbf24',
      attribute: 'craft',
      dailyGoalMinutes: 60,
      createdAt: now,
    },
    {
      id: 'act_workout',
      name: 'Workout & Fitness',
      icon: '🏋️',
      color: '#34d399',
      attribute: 'body',
      dailyGoalMinutes: 30,
      createdAt: now,
    },
    {
      id: 'act_reading',
      name: 'Reading & Learning',
      icon: '📚',
      color: '#818cf8',
      attribute: 'mind',
      dailyGoalMinutes: 30,
      createdAt: now,
    },
    {
      id: 'act_creative',
      name: 'Creative Craft',
      icon: '🎨',
      color: '#f97316',
      attribute: 'craft',
      dailyGoalMinutes: 25,
      createdAt: now,
    },
    {
      id: 'act_social',
      name: 'Friends & Family',
      icon: '🤝',
      color: '#fb7185',
      attribute: 'social',
      dailyGoalMinutes: 20,
      createdAt: now,
    },
    {
      id: 'act_mindful',
      name: 'Walk & Mindfulness',
      icon: '🧘',
      color: '#38bdf8',
      attribute: 'rest',
      dailyGoalMinutes: 20,
      createdAt: now,
    },
  ];
}

export function createStarterRewards() {
  const now = Date.now();
  return [
    {
      id: 'rew_gaming',
      title: '1h Guilt-Free Gaming / Chilling',
      icon: '🎮',
      cost: 120,
      description: 'Kick back and enjoy an hour completely guilt-free.',
      epic: false,
      createdAt: now,
    },
    {
      id: 'rew_movie',
      title: 'Movie / Show / Anime Night',
      icon: '🎬',
      cost: 250,
      description: 'Cozy watch session with zero productivity guilt.',
      epic: false,
      createdAt: now,
    },
    {
      id: 'rew_energy_drink',
      title: 'Energy Drink',
      icon: '⚡',
      cost: 650,
      cooldownHours: 48,
      description: 'Occasional earned boost — priced so it stays a treat, not an everyday habit.',
      epic: false,
      createdAt: now,
    },
    {
      id: 'rew_keyboard',
      title: 'Magnetic Keyboard (750k sums)',
      icon: '⌨️',
      cost: 5000,
      cooldownHours: 0,
      description: 'Epic real-life savings quest — Hall-effect magnetic keyboard!',
      epic: true,
      createdAt: now,
    },
  ];
}

export function createDefaultState() {
  return {
    version: SCHEMA_VERSION,
    profile: {
      name: 'Adventurer',
      avatar: '🛡️',
    },
    settings: {
      theme: 'dark',
      soundEnabled: true,
      fxEnabled: true,
    },
    bossDifficulty: 'adaptive',
    vaultSplitPercent: 40,
    vaultManualDeposit: 0,
    activeTheme: 'twilight',
    unlockedThemes: ['twilight'],
    inventoryGear: [],
    equippedGear: { weapon: null, armor: null, relic: null, aura: null },
    openedChestMilestones: [],
    purchasedChests: [],
    shieldPurchases: [],
    shieldedDates: [],
    activities: createStarterActivities(),
    sessions: [],
    claimedQuests: [],
    customQuests: [],
    claimedBossWeeks: [],
    bossTrophies: [],
    rewards: createStarterRewards(),
    rewardRedemptions: [],
    unlockedAchievements: {},
    bonusXp: 0,
    bonusGold: 0,
    deletedIds: {},
    updatedAt: 0,
  };
}

/**
 * Generate a lively 5-day sample adventure so the user can preview charts/levels if they wish.
 */
export function createSampleAdventureState(now = Date.now()) {
  const state = createDefaultState();
  state.profile = { name: 'Hero', avatar: '⚔️' };

  const day = 86400000;
  const templates = [
    // 4 days ago
    { offsetMs: 4 * day + 3 * 3600000, act: 'act_coding', min: 55, mult: 1.0, note: 'Built core prototype' },
    { offsetMs: 4 * day + 1 * 3600000, act: 'act_workout', min: 35, mult: 1.0, note: 'Strength circuit' },
    // 3 days ago
    { offsetMs: 3 * day + 4 * 3600000, act: 'act_reading', min: 40, mult: 1.1, note: 'Design book chapters' },
    { offsetMs: 3 * day + 2 * 3600000, act: 'act_mindful', min: 25, mult: 1.1, note: 'Evening park walk' },
    { offsetMs: 3 * day + 1 * 3600000, act: 'act_social', min: 45, mult: 1.1, note: 'Coffee catch-up' },
    // 2 days ago
    { offsetMs: 2 * day + 5 * 3600000, act: 'act_coding', min: 70, mult: 1.2, note: 'Refactored API & tests' },
    { offsetMs: 2 * day + 2 * 3600000, act: 'act_creative', min: 45, mult: 1.2, note: 'Sketching & music' },
    { offsetMs: 2 * day + 1 * 3600000, act: 'act_workout', min: 30, mult: 1.2, note: '5k outdoor run' },
    // Yesterday
    { offsetMs: 1 * day + 4 * 3600000, act: 'act_reading', min: 50, mult: 1.3, note: 'Deep study session' },
    { offsetMs: 1 * day + 2 * 3600000, act: 'act_coding', min: 60, mult: 1.3, note: 'UI polish & animations' },
    { offsetMs: 1 * day + 1 * 3600000, act: 'act_mindful', min: 20, mult: 1.3, note: 'Breathwork & stretch' },
    // Today
    { offsetMs: 2 * 3600000, act: 'act_workout', min: 40, mult: 1.4, note: 'Morning gym session' },
    { offsetMs: 45 * 60000, act: 'act_coding', min: 35, mult: 1.4, note: 'Shipped new feature' },
  ];

  state.sessions = templates.map((t, idx) => {
    const durationSeconds = t.min * 60;
    return {
      id: `sess_sample_${idx + 1}`,
      activityId: t.act,
      durationSeconds,
      xpEarned: calculateSessionXp(durationSeconds, t.mult),
      multiplier: t.mult,
      timestamp: now - t.offsetMs,
      source: idx % 2 === 0 ? 'timer' : 'manual',
      note: t.note,
    };
  });

  state.unlockedAchievements = {
    'first-steps': now - 4 * day,
    'first-hour': now - 4 * day,
    'deep-diver': now - 4 * day,
    'level-3': now - 2 * day,
    'streak-3': now - 2 * day,
    'renaissance': now - 2 * day,
    'session-ten': now - 1 * day,
  };
  state.claimedQuests = [`dq-warmup-${getLocalDateKey(now - day)}`];
  state.bonusXp = 75;
  return state;
}

/**
 * Validate and sanitize any loaded or imported state object.
 */
export function sanitizeState(raw) {
  const fallback = createDefaultState();
  if (!raw || typeof raw !== 'object') return fallback;

  const profile = {
    name: typeof raw.profile?.name === 'string' && raw.profile.name.trim()
      ? raw.profile.name.trim().slice(0, 32)
      : fallback.profile.name,
    avatar: typeof raw.profile?.avatar === 'string' && raw.profile.avatar.trim()
      ? raw.profile.avatar.trim().slice(0, 6)
      : fallback.profile.avatar,
  };

  const settings = {
    theme: raw.settings?.theme === 'light' ? 'light' : 'dark',
    soundEnabled: typeof raw.settings?.soundEnabled === 'boolean' ? raw.settings.soundEnabled : true,
    fxEnabled: typeof raw.settings?.fxEnabled === 'boolean' ? raw.settings.fxEnabled : true,
  };

  const activities = Array.isArray(raw.activities)
    ? raw.activities
        .filter((a) => a && typeof a.id === 'string' && typeof a.name === 'string' && a.name.trim())
        .map((a) => {
          const primaryAttr = ATTRIBUTE_MAP[a.attribute] ? a.attribute : 'craft';
          const secondaryAttr =
            a.secondaryAttribute &&
            ATTRIBUTE_MAP[a.secondaryAttribute] &&
            a.secondaryAttribute !== primaryAttr
              ? a.secondaryAttribute
              : null;
          return {
            id: a.id,
            name: a.name.trim().slice(0, 48),
            icon: typeof a.icon === 'string' && a.icon.trim() ? a.icon.trim().slice(0, 6) : '⭐',
            color: typeof a.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(a.color) ? a.color : '#818cf8',
            attribute: primaryAttr,
            secondaryAttribute: secondaryAttr,
            dailyGoalMinutes: Math.max(0, Math.min(720, Number(a.dailyGoalMinutes) || 0)),
            createdAt: Number(a.createdAt) || Date.now(),
            updatedAt: Number(a.updatedAt) || Number(a.createdAt) || 0,
          };
        })
    : fallback.activities;

  const validActivityIds = new Set(activities.map((a) => a.id));

  const sessions = Array.isArray(raw.sessions)
    ? raw.sessions
        .filter(
          (s) =>
            s &&
            typeof s.id === 'string' &&
            validActivityIds.has(s.activityId) &&
            Number(s.durationSeconds) > 0 &&
            Number(s.timestamp) > 0
        )
        .map((s) => {
          const base = {
            id: s.id,
            activityId: s.activityId,
            durationSeconds: Math.max(1, Math.round(Number(s.durationSeconds))),
            xpEarned: Math.max(1, Math.round(Number(s.xpEarned) || calculateSessionXp(Number(s.durationSeconds), 1))),
            multiplier: Math.max(1, Math.min(3, Number(s.multiplier) || 1)),
            timestamp: Number(s.timestamp),
            source: s.source === 'sprint' ? 'sprint' : s.source === 'timer' ? 'timer' : 'manual',
            sprintBonus: Boolean(s.sprintBonus),
            note: typeof s.note === 'string' ? s.note.trim().slice(0, 120) : '',
          };
          if (typeof s.goldEarned === 'number' && s.goldEarned > 0) {
            base.goldEarned = Math.round(s.goldEarned);
          }
          return base;
        })
    : [];

  const claimedQuests = Array.isArray(raw.claimedQuests)
    ? raw.claimedQuests.filter((id) => typeof id === 'string')
    : [];

  const customQuests = Array.isArray(raw.customQuests)
    ? raw.customQuests
        .filter((q) => q && typeof q.id === 'string' && typeof q.title === 'string' && q.title.trim())
        .map((q) => ({
          id: q.id,
          title: q.title.trim().slice(0, 64),
          description: typeof q.description === 'string' ? q.description.trim().slice(0, 120) : 'Custom daily quest',
          icon: typeof q.icon === 'string' && q.icon.trim() ? q.icon.trim().slice(0, 6) : '🎯',
          xpReward: Math.max(10, Math.min(500, Number(q.xpReward) || 50)),
          dateKey: typeof q.dateKey === 'string' ? q.dateKey : getLocalDateKey(),
          completed: Boolean(q.completed),
          claimed: Boolean(q.claimed),
        }))
    : [];

  const unlockedAchievements =
    raw.unlockedAchievements && typeof raw.unlockedAchievements === 'object'
      ? Object.fromEntries(
          Object.entries(raw.unlockedAchievements).filter(
            ([k, v]) => typeof k === 'string' && typeof v === 'number' && v > 0
          )
        )
      : {};

  const bonusXp = Math.max(0, Math.round(Number(raw.bonusXp) || 0));
  const bonusGold =
    typeof raw.bonusGold === 'number'
      ? Math.max(0, Math.round(raw.bonusGold))
      : claimedQuests.length * 30;

  const bossDifficulty = BOSS_DIFFICULTIES[raw.bossDifficulty] ? raw.bossDifficulty : 'adaptive';

  const claimedBossWeeks = Array.isArray(raw.claimedBossWeeks)
    ? raw.claimedBossWeeks.filter((id) => typeof id === 'string')
    : [];

  const bossTrophies = Array.isArray(raw.bossTrophies)
    ? raw.bossTrophies
        .filter((t) => t && typeof t.weekKey === 'string' && typeof t.bossName === 'string')
        .map((t) => ({
          weekKey: t.weekKey,
          bossId: typeof t.bossId === 'string' ? t.bossId : 'wyrm',
          bossName: t.bossName.trim().slice(0, 64),
          bossIcon: typeof t.bossIcon === 'string' && t.bossIcon.trim() ? t.bossIcon.trim().slice(0, 6) : '🐉',
          maxHp: Math.max(1, Math.round(Number(t.maxHp) || 210)),
          defeatedAt: Number(t.defeatedAt) || Date.now(),
        }))
    : [];

  const rewards = Array.isArray(raw.rewards)
    ? raw.rewards
        .filter((r) => r && typeof r.id === 'string' && typeof r.title === 'string' && r.title.trim())
        .map((r) => ({
          id: r.id,
          title: r.title.trim().slice(0, 64),
          icon: typeof r.icon === 'string' && r.icon.trim() ? r.icon.trim().slice(0, 6) : '🎁',
          cost: Math.max(10, Math.min(1000000, Math.round(Number(r.cost) || 100))),
          cooldownHours: Math.max(0, Math.min(720, Math.round(Number(r.cooldownHours) || 0))),
          description: typeof r.description === 'string' ? r.description.trim().slice(0, 140) : '',
          epic: Boolean(r.epic),
          createdAt: Number(r.createdAt) || Date.now(),
          updatedAt: Number(r.updatedAt) || Number(r.createdAt) || 0,
        }))
    : createStarterRewards();

  const rewardRedemptions = Array.isArray(raw.rewardRedemptions)
    ? raw.rewardRedemptions
        .filter((r) => r && typeof r.id === 'string' && typeof r.title === 'string')
        .map((r) => ({
          id: r.id,
          rewardId: typeof r.rewardId === 'string' ? r.rewardId : '',
          title: r.title.trim().slice(0, 64),
          icon: typeof r.icon === 'string' && r.icon.trim() ? r.icon.trim().slice(0, 6) : '🎁',
          cost: Math.max(1, Math.round(Number(r.cost) || 1)),
          epic: Boolean(r.epic),
          refundable: r.refundable !== false,
          redeemedAt: Number(r.redeemedAt) || Date.now(),
        }))
    : [];

  const vaultSplitPercent =
    typeof raw.vaultSplitPercent === 'number'
      ? Math.max(0, Math.min(80, Math.round(raw.vaultSplitPercent)))
      : 40;
  const vaultManualDeposit =
    typeof raw.vaultManualDeposit === 'number' ? Math.round(raw.vaultManualDeposit) : 0;

  const activeTheme = RPG_THEME_MAP[raw.activeTheme] ? raw.activeTheme : 'twilight';
  const unlockedThemes = Array.from(
    new Set([
      'twilight',
      ...(Array.isArray(raw.unlockedThemes)
        ? raw.unlockedThemes.filter((id) => typeof id === 'string' && Boolean(RPG_THEME_MAP[id]))
        : []),
    ])
  );

  const inventoryGear = Array.isArray(raw.inventoryGear)
    ? raw.inventoryGear
        .filter((g) => g && typeof g.gearId === 'string' && Boolean(GEAR_MAP[g.gearId]))
        .map((g) => ({
          id: typeof g.id === 'string' ? g.id : `gear_${g.gearId}`,
          gearId: g.gearId,
          obtainedAt: Number(g.obtainedAt) || Date.now(),
          source: typeof g.source === 'string' ? g.source.slice(0, 64) : 'Loot Chest',
        }))
    : [];

  const ownedGearSet = new Set(inventoryGear.map((g) => g.gearId));
  const equippedGear = {};
  for (const slot of GEAR_SLOTS) {
    const candidate = raw.equippedGear && typeof raw.equippedGear[slot.id] === 'string' ? raw.equippedGear[slot.id] : null;
    equippedGear[slot.id] =
      candidate && ownedGearSet.has(candidate) && GEAR_MAP[candidate] && GEAR_MAP[candidate].slot === slot.id
        ? candidate
        : null;
  }

  const openedChestMilestones = Array.isArray(raw.openedChestMilestones)
    ? Array.from(new Set(raw.openedChestMilestones.filter((id) => typeof id === 'string')))
    : [];

  const purchasedChests = Array.isArray(raw.purchasedChests)
    ? raw.purchasedChests
        .filter((c) => c && typeof c.id === 'string')
        .map((c) => ({
          id: c.id,
          tier: c.tier === 'standard' || c.tier === 'sprint' || c.tier === 'boss' ? c.tier : 'boss',
          purchasedAt: Number(c.purchasedAt) || Date.now(),
        }))
    : [];

  const shieldPurchases = Array.isArray(raw.shieldPurchases)
    ? raw.shieldPurchases
        .filter((s) => s && typeof s.id === 'string')
        .map((s) => ({
          id: s.id,
          purchasedAt: Number(s.purchasedAt) || Date.now(),
        }))
    : [];

  const shieldedDates = Array.isArray(raw.shieldedDates)
    ? Array.from(
        new Set(raw.shieldedDates.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)))
      ).sort()
    : [];

  const deletedIds =
    raw.deletedIds && typeof raw.deletedIds === 'object'
      ? Object.fromEntries(
          Object.entries(raw.deletedIds)
            .filter(([k, v]) => typeof k === 'string' && typeof v === 'number' && v > 0)
            .slice(-500)
        )
      : {};

  const updatedAt = Math.max(0, Number(raw.updatedAt) || 0);

  return {
    version: SCHEMA_VERSION,
    profile,
    settings,
    bossDifficulty,
    vaultSplitPercent,
    vaultManualDeposit,
    activeTheme,
    unlockedThemes,
    inventoryGear,
    equippedGear,
    openedChestMilestones,
    purchasedChests,
    shieldPurchases,
    shieldedDates,
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
  };
}

export function loadSyncMeta() {
  const empty = {
    provider: null, // 'gist'
    vaultId: null,
    gistId: null,
    gistUrl: null,
    username: null,
    token: null,
    version: 0,
    lastSyncedAt: 0,
    activeTimerUpdatedAt: 0,
    dirty: false,
  };
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) return empty;
    const m = JSON.parse(raw);
    const provider = m.provider === 'gist' ? 'gist' : null;
    if (!provider) return empty;
    return {
      provider,
      vaultId: typeof m.vaultId === 'string' ? m.vaultId : null,
      gistId: typeof m.gistId === 'string' ? m.gistId : null,
      gistUrl: typeof m.gistUrl === 'string' ? m.gistUrl : null,
      username: typeof m.username === 'string' ? m.username : null,
      token: typeof m.token === 'string' ? m.token : null,
      version: Math.max(0, Number(m.version) || 0),
      lastSyncedAt: Math.max(0, Number(m.lastSyncedAt) || 0),
      activeTimerUpdatedAt: Math.max(0, Number(m.activeTimerUpdatedAt) || 0),
      dirty: Boolean(m.dirty),
    };
  } catch {
    return empty;
  }
}

export function saveSyncMeta(meta) {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  } catch (err) {
    console.warn('LifeQuest: Could not save sync metadata', err);
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultState();
    return sanitizeState(JSON.parse(raw));
  } catch {
    return createDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('LifeQuest: Could not save state to localStorage', err);
  }
}

export function loadActiveTimer() {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const t = JSON.parse(raw);
    if (!t || typeof t.activityId !== 'string') return null;
    return {
      activityId: t.activityId,
      isRunning: Boolean(t.isRunning),
      startedAt: typeof t.startedAt === 'number' ? t.startedAt : null,
      accumulatedMs: Math.max(0, Number(t.accumulatedMs) || 0),
      mode: t.mode === 'sprint' ? 'sprint' : 'stopwatch',
      targetSeconds: Math.max(60, Math.round(Number(t.targetSeconds) || 1500)),
      sprintCompleted: Boolean(t.sprintCompleted),
      note: typeof t.note === 'string' ? t.note.slice(0, 120) : '',
    };
  } catch {
    return null;
  }
}

export function saveActiveTimer(timer) {
  try {
    if (!timer) {
      localStorage.removeItem(TIMER_STORAGE_KEY);
    } else {
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
    }
  } catch (err) {
    console.warn('LifeQuest: Could not save active timer', err);
  }
}

export function exportStateToJson(state) {
  return JSON.stringify(
    {
      app: 'LifeQuest',
      exportedAt: new Date().toISOString(),
      data: state,
    },
    null,
    2
  );
}

export function parseImportedJson(jsonText) {
  const parsed = JSON.parse(jsonText);
  const candidate = parsed && parsed.data && typeof parsed.data === 'object' ? parsed.data : parsed;
  if (!candidate || !Array.isArray(candidate.activities)) {
    throw new Error('This file does not look like a valid LifeQuest backup.');
  }
  return sanitizeState(candidate);
}
