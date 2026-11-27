/**
 * LifeQuest RPG Progression & Time Analytics Engine
 * Pure functions — zero DOM dependencies so it can be unit-tested directly in Node.
 */

export const ATTRIBUTES = [
  { id: 'mind', label: 'Mind', icon: '🧠', color: '#818cf8', desc: 'Learning, reading, study & focus' },
  { id: 'body', label: 'Body', icon: '💪', color: '#34d399', desc: 'Exercise, sports, movement & health' },
  { id: 'craft', label: 'Craft', icon: '⚒️', color: '#fbbf24', desc: 'Building, coding, art, music & work' },
  { id: 'social', label: 'Social', icon: '🤝', color: '#fb7185', desc: 'Friends, family, community & kindness' },
  { id: 'rest', label: 'Vitality', icon: '🌿', color: '#38bdf8', desc: 'Mindfulness, nature, cooking & self-care' },
];

export const ATTRIBUTE_MAP = Object.fromEntries(ATTRIBUTES.map((a) => [a.id, a]));

export const ACTIVITY_ICONS = [
  '💻', '🏋️', '📚', '🎨', '🧘', '🤝', '🏃', '🎸',
  '🍳', '✍️', '🗣️', '🌱', '♟️', '🚴', '🧹', '📝',
  '🎯', '🧪', '📷', '🎧', '🏊', '🛠️', '🌍', '☕',
  '🎮', '🐶', '⚡', '🔥', '🌟', '🧩',
];

export const ACTIVITY_COLORS = [
  '#818cf8', '#34d399', '#fbbf24', '#fb7185', '#38bdf8',
  '#a78bfa', '#f97316', '#2dd4bf', '#f472b6', '#60a5fa',
];

export const REWARD_ICONS = [
  '🎮', '🎬', '⌨️', '⚡', '☕', '🍕', '🎧', '🛍️',
  '🌙', '📚', '🎁', '🏖️', '🍰', '🎟️', '🕹️', '✨',
];

export const BASE_XP_PER_MINUTE = 10;
export const SPRINT_BONUS_MULTIPLIER = 1.2; // +20% bonus XP & Gold for completing a Focus Sprint
export const SPRINT_PRESETS_MIN = [25, 45, 60];
export const GOLD_PER_XP_RATIO = 0.15; // 10 XP/min -> 1.5 Gold/min (90g/hr at 1x, up to 180g/hr at 2x)
export const BOSS_BOUNTY_XP = 300;
export const BOSS_BOUNTY_GOLD = 200;
export const STREAK_SHIELD_COST = 280;
export const STREAK_SHIELD_MAX = 3;
export const MYSTERY_CHEST_COST = 240;

/**
 * Unlockable RPG Visual Themes & Ambient Particle FX Styles
 */
export const RPG_THEMES = [
  {
    id: 'twilight',
    name: 'Twilight Tavern',
    icon: '🌙',
    particleLabel: 'Warm Embers & Fireflies',
    desc: 'Cozy twilight indigo with warm golden lantern glow.',
    unlockLevel: 1,
    cost: 0,
    swatches: ['#0f1221', '#818cf8', '#fbbf24'],
  },
  {
    id: 'cyber',
    name: 'Cyber Neon',
    icon: '⚡',
    particleLabel: 'Neon Digital Sparks',
    desc: 'Electric cyan & magenta grid glow — built for deep coding.',
    unlockLevel: 3,
    cost: 250,
    swatches: ['#07111f', '#22d3ee', '#f472b6'],
  },
  {
    id: 'sakura',
    name: 'Sakura Shrine',
    icon: '🌸',
    particleLabel: 'Drifting Blossom Petals',
    desc: 'Moonlit plum sky with gently falling pink sakura petals.',
    unlockLevel: 5,
    cost: 400,
    swatches: ['#181020', '#f472b6', '#fcd34d'],
  },
  {
    id: 'dragon',
    name: 'Dragon Forge',
    icon: '🐉',
    particleLabel: 'Molten Volcanic Embers',
    desc: 'Obsidian anvil warmth with blazing crimson & molten gold.',
    unlockLevel: 8,
    cost: 550,
    swatches: ['#180d12', '#f97316', '#fb7185'],
  },
  {
    id: 'astral',
    name: 'Astral Starlight',
    icon: '🌌',
    particleLabel: 'Twinkling Cosmic Stars',
    desc: 'Deep nebula skies glittering with celestial starlight.',
    unlockLevel: 10,
    cost: 750,
    swatches: ['#090c1d', '#a78bfa', '#38bdf8'],
  },
];

export const RPG_THEME_MAP = Object.fromEntries(RPG_THEMES.map((t) => [t.id, t]));

/**
 * RPG Equipment Slots, Rarities & Curated Gear Catalog
 */
export const GEAR_SLOTS = [
  { id: 'weapon', label: 'Tool / Weapon', icon: '⚔️' },
  { id: 'armor', label: 'Cloak / Armor', icon: '🛡️' },
  { id: 'relic', label: 'Relic / Charm', icon: '🔮' },
  { id: 'aura', label: 'Crest / Aura', icon: '✨' },
];

export const RARITY_META = {
  common: { id: 'common', label: 'Common', color: '#94a3b8', duplicateGold: 45 },
  rare: { id: 'rare', label: 'Rare', color: '#38bdf8', duplicateGold: 85 },
  epic: { id: 'epic', label: 'Epic', color: '#c084fc', duplicateGold: 145 },
  legendary: { id: 'legendary', label: 'Legendary', color: '#fbbf24', duplicateGold: 240 },
};

export const GEAR_CATALOG = [
  // Weapons / Tools
  { id: 'wpn_copper_stylus', slot: 'weapon', rarity: 'common', icon: '✒️', name: 'Copper Stylus', lore: 'Reliable tool of an eager apprentice.', bonus: { attrXp: { craft: 3 } }, bonusText: '+3% Craft XP' },
  { id: 'wpn_mech_blade', slot: 'weapon', rarity: 'rare', icon: '⌨️', name: 'Tactile Switchblade', lore: 'Crisp keystrokes slice cleanly through hard bugs.', bonus: { attrXp: { craft: 6 } }, bonusText: '+6% Craft XP' },
  { id: 'wpn_cyberdeck', slot: 'weapon', rarity: 'epic', icon: '💻', name: 'Neon Cyberdeck', lore: 'Hums softly whenever a Focus Sprint begins.', bonus: { attrXp: { craft: 9 }, sprintBonusPct: 4 }, bonusText: '+9% Craft XP · +4% Sprint' },
  { id: 'wpn_astral_forge', slot: 'weapon', rarity: 'legendary', icon: '⚒️', name: 'Astral Forge Hammer', lore: 'Turns every focused hour into pure mythic craft.', bonus: { attrXp: { craft: 12 }, goldPct: 6 }, bonusText: '+12% Craft XP · +6% Gold' },

  // Armor / Cloaks
  { id: 'arm_traveler_hoodie', slot: 'armor', rarity: 'common', icon: '🧥', name: 'Cozy Tavern Hoodie', lore: 'Warm, comfy, and ready for steady daily work.', bonus: { allXpPct: 3 }, bonusText: '+3% All XP' },
  { id: 'arm_iron_plate', slot: 'armor', rarity: 'rare', icon: '🛡️', name: 'Vanguard Gym Plate', lore: 'Forged from early workouts and grit.', bonus: { attrXp: { body: 7 }, bossDmgPct: 4 }, bonusText: '+7% Body XP · +4% Boss DMG' },
  { id: 'arm_shadow_cloak', slot: 'armor', rarity: 'epic', icon: '🥷', name: 'Shadow Focus Cloak', lore: 'Blocks distractions while your countdown ticks.', bonus: { sprintBonusPct: 8, allXpPct: 4 }, bonusText: '+8% Sprint · +4% All XP' },
  { id: 'arm_dragonscale', slot: 'armor', rarity: 'legendary', icon: '🐉', name: 'Dragonscale Mantle', lore: 'Woven from vanquished procrastination wyrms.', bonus: { allXpPct: 10, bossDmgPct: 8 }, bonusText: '+10% All XP · +8% Boss DMG' },

  // Relics / Charms
  { id: 'rel_compass', slot: 'relic', rarity: 'common', icon: '🧭', name: 'Merchant’s Compass', lore: 'Points straight toward golden opportunities.', bonus: { goldPct: 5 }, bonusText: '+5% Gold' },
  { id: 'rel_gm_knight', slot: 'relic', rarity: 'rare', icon: '♟️', name: 'Grandmaster’s Knight', lore: 'Sharpens calculation three moves ahead.', bonus: { attrXp: { mind: 7 } }, bonusText: '+7% Mind XP' },
  { id: 'rel_scholar_prism', slot: 'relic', rarity: 'epic', icon: '🔮', name: 'Arcane Study Prism', lore: 'Refracts deep reading into lasting mastery.', bonus: { attrXp: { mind: 9 }, goldPct: 5 }, bonusText: '+9% Mind XP · +5% Gold' },
  { id: 'rel_focus_crown', slot: 'relic', rarity: 'legendary', icon: '👑', name: 'Crown of Relentless Focus', lore: 'Worn only by heroes who show up every day.', bonus: { goldPct: 12, allXpPct: 6 }, bonusText: '+12% Gold · +6% All XP' },

  // Auras / Crests
  { id: 'aur_hearth_sigil', slot: 'aura', rarity: 'common', icon: '🔥', name: 'Hearthfire Sigil', lore: 'Kindles courage against weekly raid bosses.', bonus: { bossDmgPct: 6 }, bonusText: '+6% Boss DMG' },
  { id: 'aur_discipline_spark', slot: 'aura', rarity: 'rare', icon: '⚡', name: 'Spark of Discipline', lore: 'Calm mind, lethal focus crits.', bonus: { bossDmgPct: 10, attrXp: { rest: 5 } }, bonusText: '+10% Boss DMG · +5% Vitality XP' },
  { id: 'aur_wyrmslayer', slot: 'aura', rarity: 'epic', icon: '🏆', name: 'Wyrmslayer Crest', lore: 'Every tavern bard sings of your boss raids.', bonus: { bossDmgPct: 15, attrXp: { social: 7 } }, bonusText: '+15% Boss DMG · +7% Social XP' },
  { id: 'aur_polymath_halo', slot: 'aura', rarity: 'legendary', icon: '🌟', name: 'Eternal Polymath Halo', lore: 'Radiant mastery across every sphere of life.', bonus: { bossDmgPct: 20, allXpPct: 8 }, bonusText: '+20% Boss DMG · +8% All XP' },
];

export const GEAR_MAP = Object.fromEntries(GEAR_CATALOG.map((g) => [g.id, g]));

/**
 * Format local YYYY-MM-DD key from a timestamp or Date.
 */
export function getLocalDateKey(input = Date.now()) {
  const d = input instanceof Date ? input : new Date(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a YYYY-MM-DD string as local midnight Date.
 */
export function parseLocalDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * XP required to advance from `level` to `level + 1` for a single activity.
 * Level 1 -> 2 = 150 XP (~15 min), gentle ramp thereafter.
 */
export function xpForNextActivityLevel(level) {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(150 * Math.pow(safeLevel, 1.35));
}

/**
 * XP required to advance from `level` to `level + 1` for overall player level.
 */
export function xpForNextPlayerLevel(level) {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(300 * Math.pow(safeLevel, 1.4));
}

export function getActivityRankTitle(level) {
  if (level >= 30) return { title: 'Legend', tier: 'legend' };
  if (level >= 20) return { title: 'Grandmaster', tier: 'grandmaster' };
  if (level >= 15) return { title: 'Master', tier: 'master' };
  if (level >= 10) return { title: 'Expert', tier: 'expert' };
  if (level >= 6) return { title: 'Adept', tier: 'adept' };
  if (level >= 3) return { title: 'Apprentice', tier: 'apprentice' };
  return { title: 'Novice', tier: 'novice' };
}

export function getPlayerRankTitle(level) {
  if (level >= 30) return 'Luminary';
  if (level >= 22) return 'Mythic Hero';
  if (level >= 16) return 'Champion';
  if (level >= 11) return 'Vanguard';
  if (level >= 7) return 'Pathfinder';
  if (level >= 4) return 'Adventurer';
  if (level >= 2) return 'Seeker';
  return 'Wanderer';
}

/**
 * Compute detailed level breakdown from total XP using the provided curve function.
 */
export function computeLevelFromXp(totalXp, curveFn = xpForNextActivityLevel) {
  const safeXp = Math.max(0, Math.floor(totalXp || 0));
  let level = 1;
  let remaining = safeXp;
  let needed = curveFn(level);

  while (remaining >= needed && level < 999) {
    remaining -= needed;
    level += 1;
    needed = curveFn(level);
  }

  const progress = needed > 0 ? Math.min(100, (remaining / needed) * 100) : 100;
  return {
    level,
    totalXp: safeXp,
    currentLevelXp: remaining,
    xpNeededForNext: needed,
    xpToNext: Math.max(0, needed - remaining),
    progressPercent: Math.round(progress * 10) / 10,
  };
}

export function getActivityLevelInfo(totalXp) {
  const base = computeLevelFromXp(totalXp, xpForNextActivityLevel);
  const rank = getActivityRankTitle(base.level);
  return { ...base, rankTitle: rank.title, rankTier: rank.tier };
}

export function getPlayerLevelInfo(totalXp) {
  const base = computeLevelFromXp(totalXp, xpForNextPlayerLevel);
  return { ...base, rankTitle: getPlayerRankTitle(base.level) };
}

/**
 * Calculate consecutive day streak ending today (or yesterday if today hasn't been logged yet).
 * Optional `shieldedDates` (array of YYYY-MM-DD strings) acts as protected Streak Freeze bridge days.
 */
export function calculateStreak(sessions, now = Date.now(), shieldedDates = []) {
  if (!sessions || sessions.length === 0) {
    return { current: 0, longest: 0, activeToday: false, shieldedCount: 0, multiplier: 1.0 };
  }

  const sessionDateSet = new Set(sessions.map((s) => getLocalDateKey(s.timestamp)));
  const shieldSet = new Set((shieldedDates || []).filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)));
  const combinedSet = new Set([...sessionDateSet, ...shieldSet]);
  const sortedKeys = Array.from(combinedSet).sort();

  // Longest streak ever
  let longest = 0;
  let run = 0;
  let prevDate = null;
  for (const key of sortedKeys) {
    const curDate = parseLocalDateKey(key);
    if (prevDate) {
      const diffDays = Math.round((curDate - prevDate) / 86400000);
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prevDate = curDate;
  }

  // Current streak (counts if active/shielded today OR yesterday)
  const todayDate = parseLocalDateKey(getLocalDateKey(now));
  const todayKey = getLocalDateKey(todayDate);
  const yesterdayDate = new Date(todayDate.getTime() - 86400000);
  const yesterdayKey = getLocalDateKey(yesterdayDate);

  const activeToday = sessionDateSet.has(todayKey);
  let cursor = combinedSet.has(todayKey) ? todayDate : combinedSet.has(yesterdayKey) ? yesterdayDate : null;
  let current = 0;
  let hasRealSessionInCurrent = false;
  let shieldedInCurrent = 0;

  while (cursor && combinedSet.has(getLocalDateKey(cursor))) {
    const k = getLocalDateKey(cursor);
    current += 1;
    if (sessionDateSet.has(k)) hasRealSessionInCurrent = true;
    else if (shieldSet.has(k)) shieldedInCurrent += 1;
    cursor = new Date(cursor.getTime() - 86400000);
  }
  if (!hasRealSessionInCurrent) current = 0;

  // Multiplier: Day 1 = 1.0x, Day 2 = 1.1x ... Day 11+ = 2.0x
  const effectiveDays = Math.max(1, current);
  const multiplier = Number((1 + Math.min(effectiveDays - 1, 10) * 0.1).toFixed(1));

  return { current, longest, activeToday, shieldedCount: shieldedInCurrent, multiplier };
}

/**
 * Determine if available Streak Freeze Shields should auto-protect recently missed days
 * to preserve an active streak. Returns array of YYYY-MM-DD date keys to shield.
 */
export function computeAutoShieldDates(sessions, shieldedDates = [], availableShields = 0, now = Date.now()) {
  const avail = Math.max(0, Math.floor(Number(availableShields) || 0));
  if (avail <= 0 || !sessions || sessions.length === 0) return [];

  const sessionDates = new Set(sessions.map((s) => getLocalDateKey(s.timestamp)));
  const existingShields = new Set(shieldedDates || []);
  const combined = new Set([...sessionDates, ...existingShields]);

  const today = parseLocalDateKey(getLocalDateKey(now));
  const todayKey = getLocalDateKey(today);
  const yesterday = new Date(today.getTime() - 86400000);
  const yesterdayKey = getLocalDateKey(yesterday);

  // If already active or shielded yesterday (or today with yesterday covered), no emergency gap right now
  if (combined.has(yesterdayKey)) return [];
  // If today was logged, we only check gap immediately before today (yesterday..N days back)
  // If today wasn't logged yet, we ALSO check gap starting from yesterday backwards
  const missingDays = [];
  for (let offset = 1; offset <= Math.min(avail, STREAK_SHIELD_MAX); offset++) {
    const d = new Date(today.getTime() - offset * 86400000);
    const key = getLocalDateKey(d);
    if (combined.has(key)) {
      // Found the anchor day of the previous streak! Bridge all missingDays!
      return missingDays;
    }
    missingDays.push(key);
  }

  // Check if the day right after our max bridge window has activity (e.g. missed 1 day with 1 shield -> check 2 days ago!)
  const anchorDay = new Date(today.getTime() - (missingDays.length + 1) * 86400000);
  if (missingDays.length > 0 && missingDays.length <= avail && combined.has(getLocalDateKey(anchorDay))) {
    return missingDays;
  }

  // Wait: if today is active and yesterday was missed, the loop above checked offset=1 (missing) and anchorDay=2 days ago!
  // Don't burn shields if user hasn't even had a prior day before yesterday.
  if (todayKey && missingDays.length === 0) return [];
  return [];
}

/**
 * Calculate XP earned for a duration in seconds given streak multiplier,
 * optional completed Focus Sprint bonus, and optional equipped RPG gear bonus.
 */
export function calculateSessionXp(durationSeconds, streakMultiplier = 1.0, sprintCompleted = false, gearBonus = null) {
  const safeSec = Math.max(0, Number(durationSeconds) || 0);
  if (safeSec < 5) return 0;
  const minutes = safeSec / 60;
  const extraSprintPct = gearBonus ? Math.max(0, Number(gearBonus.sprintBonusPct) || 0) : 0;
  const sprintFactor = sprintCompleted ? SPRINT_BONUS_MULTIPLIER + extraSprintPct / 100 : 1.0;
  const gearXpPct = gearBonus
    ? Math.max(0, (Number(gearBonus.allXpPct) || 0) + (Number(gearBonus.attrXpPct) || 0))
    : 0;
  const gearFactor = 1 + gearXpPct / 100;
  return Math.max(1, Math.round(minutes * BASE_XP_PER_MINUTE * streakMultiplier * sprintFactor * gearFactor));
}

/**
 * Filter sessions by timeframe: 'today' | 'week' | 'month' | 'all'
 */
export function filterSessionsByTimeframe(sessions, timeframe = 'all', now = Date.now()) {
  if (!sessions || sessions.length === 0) return [];
  if (timeframe === 'all') return sessions;

  const todayStart = parseLocalDateKey(getLocalDateKey(now)).getTime();
  if (timeframe === 'today') {
    return sessions.filter((s) => s.timestamp >= todayStart);
  }
  if (timeframe === 'week') {
    const start = todayStart - 6 * 86400000;
    return sessions.filter((s) => s.timestamp >= start);
  }
  if (timeframe === 'month') {
    const start = todayStart - 29 * 86400000;
    return sessions.filter((s) => s.timestamp >= start);
  }
  return sessions;
}

/**
 * Compute comprehensive per-activity statistics (XP, Level, Time Today/Week/All, Sessions, Streak).
 */
export function computeActivityStats(activities, sessions, now = Date.now()) {
  const todayStart = parseLocalDateKey(getLocalDateKey(now)).getTime();
  const weekStart = todayStart - 6 * 86400000;

  const grouped = new Map();
  for (const act of activities) {
    grouped.set(act.id, []);
  }
  for (const session of sessions) {
    if (grouped.has(session.activityId)) {
      grouped.get(session.activityId).push(session);
    }
  }

  return activities.map((act) => {
    const actSessions = grouped.get(act.id) || [];
    let totalSeconds = 0;
    let todaySeconds = 0;
    let weekSeconds = 0;
    let totalXp = 0;
    let lastTimestamp = 0;

    for (const s of actSessions) {
      totalSeconds += s.durationSeconds;
      totalXp += s.xpEarned;
      if (s.timestamp >= todayStart) todaySeconds += s.durationSeconds;
      if (s.timestamp >= weekStart) weekSeconds += s.durationSeconds;
      if (s.timestamp > lastTimestamp) lastTimestamp = s.timestamp;
    }

    const levelInfo = getActivityLevelInfo(totalXp);
    const streak = calculateStreak(actSessions, now);
    const dailyGoalSeconds = (act.dailyGoalMinutes || 0) * 60;
    const dailyGoalPercent =
      dailyGoalSeconds > 0 ? Math.min(100, Math.round((todaySeconds / dailyGoalSeconds) * 100)) : null;

    return {
      ...act,
      totalSeconds,
      todaySeconds,
      weekSeconds,
      sessionCount: actSessions.length,
      lastTimestamp,
      streak,
      levelInfo,
      dailyGoalPercent,
    };
  });
}

/**
 * Compute RPG Attribute radar scores & stats from activity stats.
 * Supports optional Secondary Attribute combo split (70% Primary / 30% Secondary).
 * Uses a tiered level-based scale (Lv.1 -> Lv.10 -> Lv.20 -> Lv.30 -> Lv.50+)
 * so early sessions show steady progress instead of maxing out the outer ring.
 */
export function computeAttributeStats(activityStats) {
  const buckets = Object.fromEntries(
    ATTRIBUTES.map((a) => [
      a.id,
      { ...a, totalXp: 0, totalSeconds: 0, activityCount: 0, levelInfo: getActivityLevelInfo(0) },
    ])
  );

  for (const act of activityStats) {
    const primaryId = buckets[act.attribute] ? act.attribute : 'craft';
    const secondaryId =
      act.secondaryAttribute &&
      buckets[act.secondaryAttribute] &&
      act.secondaryAttribute !== primaryId
        ? act.secondaryAttribute
        : null;

    if (secondaryId) {
      const primaryXp = Math.round(act.levelInfo.totalXp * 0.7);
      const secondaryXp = act.levelInfo.totalXp - primaryXp;
      const primarySec = Math.round(act.totalSeconds * 0.7);
      const secondarySec = act.totalSeconds - primarySec;

      buckets[primaryId].totalXp += primaryXp;
      buckets[primaryId].totalSeconds += primarySec;
      buckets[primaryId].activityCount += 1;

      buckets[secondaryId].totalXp += secondaryXp;
      buckets[secondaryId].totalSeconds += secondarySec;
      buckets[secondaryId].activityCount += 1;
    } else {
      buckets[primaryId].totalXp += act.levelInfo.totalXp;
      buckets[primaryId].totalSeconds += act.totalSeconds;
      buckets[primaryId].activityCount += 1;
    }
  }

  const list = ATTRIBUTES.map((a) => {
    const b = buckets[a.id];
    const levelInfo = getActivityLevelInfo(b.totalXp);
    const effectiveLevel = levelInfo.level + levelInfo.progressPercent / 100;
    return { ...b, levelInfo, effectiveLevel };
  });

  const highestLevel = Math.max(1, ...list.map((a) => a.effectiveLevel));
  const tiers = [
    { capLevel: 10, tierLabel: 'Tier I' },
    { capLevel: 20, tierLabel: 'Tier II' },
    { capLevel: 30, tierLabel: 'Tier III' },
    { capLevel: 50, tierLabel: 'Tier IV' },
  ];
  const matchedTier =
    tiers.find((t) => highestLevel < t.capLevel) || {
      capLevel: Math.ceil((highestLevel + 1) / 25) * 25,
      tierLabel: 'Mythic Tier',
    };

  const { capLevel, tierLabel } = matchedTier;

  return list.map((a) => {
    const levelFraction = Math.min(1, Math.max(0, (a.effectiveLevel - 1) / (capLevel - 1)));
    const radarScore = a.totalXp === 0 ? 0.08 : Number((0.08 + levelFraction * 0.92).toFixed(3));
    return {
      ...a,
      radarScore,
      radarCapLevel: capLevel,
      radarTierLabel: tierLabel,
    };
  });
}

const SINGLE_CLASSES = {
  mind: { name: 'Arcane Scholar', icon: '🔮', desc: 'Pure Mind focus — sharp intellect & endless curiosity.' },
  body: { name: 'Iron Vanguard', icon: '🛡️', desc: 'Pure Body focus — strength, stamina, and grit.' },
  craft: { name: 'Master Tinkerer', icon: '⚒️', desc: 'Pure Craft focus — turning raw time into mastery.' },
  social: { name: 'Tavern Herald', icon: '🎺', desc: 'Pure Social focus — warmth, friendship, and spirit.' },
  rest: { name: 'Grove Mystic', icon: '🌿', desc: 'Pure Vitality focus — calm clarity and deep recharge.' },
};

const DUAL_CLASSES = {
  'craft+mind': { name: 'Artificer', icon: '⚙️', desc: 'Mind & Craft — turning sharp ideas into real creations.' },
  'body+mind': { name: 'Astral Monk', icon: '🥋', desc: 'Mind & Body — disciplined intellect and physical flow.' },
  'mind+social': { name: 'Grand Strategist', icon: '♟️', desc: 'Mind & Social — tactical brilliance and inspiring wit.' },
  'mind+rest': { name: 'Serene Sage', icon: '📜', desc: 'Mind & Vitality — deep wisdom with steady calm.' },
  'body+craft': { name: 'Forgemaster', icon: '🔨', desc: 'Body & Craft — tireless stamina and skilled hands.' },
  'body+social': { name: 'Radiant Captain', icon: '🦁', desc: 'Body & Social — bold energy that lifts every room.' },
  'body+rest': { name: 'Wild Ranger', icon: '🏹', desc: 'Body & Vitality — strong, grounded, and resilient.' },
  'craft+social': { name: 'Guildmaster', icon: '👑', desc: 'Craft & Social — building great work with great people.' },
  'craft+rest': { name: 'Flow Alchemist', icon: '⚗️', desc: 'Craft & Vitality — creating in calm, sustainable flow.' },
  'rest+social': { name: 'Cozy Bard', icon: '🎸', desc: 'Social & Vitality — joyful presence and warm memories.' },
};

/**
 * Dynamic RPG Hero Class automatically determined from the player's top attributes.
 */
export function computeHeroClass(attributeStats) {
  const sorted = [...attributeStats].sort((a, b) => b.totalXp - a.totalXp);
  const totalXp = sorted.reduce((acc, a) => acc + a.totalXp, 0);

  if (totalXp < 100) {
    return {
      name: 'Novice Wanderer',
      icon: '🧭',
      desc: 'Log activities to awaken your dynamic RPG Class!',
      topAttributes: [],
      accentColor: '#818cf8',
    };
  }

  const active = sorted.filter((a) => a.totalXp > 0);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  // All 5 attributes active & well-balanced
  if (active.length === 5 && lowest.totalXp >= highest.totalXp * 0.55) {
    return {
      name: 'Grand Polymath',
      icon: '🌟',
      desc: 'Balanced master of Mind, Body, Craft, Social & Vitality.',
      topAttributes: sorted.slice(0, 2),
      accentColor: '#fbbf24',
    };
  }

  // Only 1 dominant attribute so far (or #2 is less than 20% of #1)
  if (active.length === 1 || sorted[1].totalXp < highest.totalXp * 0.2) {
    const single = SINGLE_CLASSES[highest.id] || SINGLE_CLASSES.craft;
    return {
      ...single,
      topAttributes: [highest],
      accentColor: highest.color,
    };
  }

  // Top 2 attributes pair
  const topTwo = sorted.slice(0, 2);
  const pairKey = [topTwo[0].id, topTwo[1].id].sort().join('+');
  const combo = DUAL_CLASSES[pairKey] || SINGLE_CLASSES[topTwo[0].id];
  return {
    ...combo,
    topAttributes: topTwo,
    accentColor: topTwo[0].color,
  };
}

/**
 * Weekly Boss Battles engine
 */
export const BOSS_DIFFICULTIES = {
  adaptive: { id: 'adaptive', label: 'Adaptive', desc: 'Starts ~3.5h/wk & scales gently with Hero Level' },
  chill: { id: 'chill', label: 'Chill', desc: '~3 hours / week (180 HP)' },
  balanced: { id: 'balanced', label: 'Balanced', desc: '~5 hours / week (300 HP)' },
  hardcore: { id: 'hardcore', label: 'Hardcore', desc: '~10 hours / week (600 HP)' },
};

export const BOSS_ROSTER = [
  { id: 'wyrm', name: 'The Procrastination Wyrm', icon: '🐉', subtitle: 'Feeds on "I’ll start in five minutes."', accent: '#fb7185' },
  { id: 'golem', name: 'Sloth Golem', icon: '🪨', subtitle: 'Heavy stone titan of endless scrolling.', accent: '#f97316' },
  { id: 'fog', name: 'Fog of Distraction', icon: '🌫️', subtitle: 'Scatters focus across twenty open tabs.', accent: '#818cf8' },
  { id: 'weaver', name: 'Doomscroll Weaver', icon: '🕸️', subtitle: 'Spins glowing webs that quietly steal hours.', accent: '#c084fc' },
  { id: 'owl', name: 'Burnout Owl', icon: '🦉', subtitle: 'Challenges your rhythm and steady consistency.', accent: '#38bdf8' },
  { id: 'frostling', name: 'Comfort-Zone Frostling', icon: '🧊', subtitle: 'Freezes ambitious quests before step one.', accent: '#2dd4bf' },
  { id: 'phantom', name: 'Perfectionism Phantom', icon: '🪞', subtitle: 'Whispers that nothing is ever good enough.', accent: '#a78bfa' },
  { id: 'thief', name: 'Chrono Thief', icon: '⏳', subtitle: 'Silently pockets unguarded afternoons.', accent: '#fbbf24' },
];

/**
 * Local Monday 00:00 of the current week.
 */
export function getLocalWeekStartDate(now = Date.now()) {
  const today = parseLocalDateKey(getLocalDateKey(now));
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return new Date(today.getTime() + diffToMonday * 86400000);
}

/**
 * Damage dealt to the Weekly Boss by a single session.
 * Base: 1 DMG/min; 30m+ session = 1.25x Focus Crit; 60m+ = 1.4x Mega Crit!
 */
export function calculateBossDamageForSession(durationSeconds, multiplier = 1.0, bossDmgBonusPct = 0) {
  const minutes = Math.max(0, Number(durationSeconds) || 0) / 60;
  if (minutes <= 0) return { damage: 0, critType: null };

  let critMultiplier = 1.0;
  let critType = null;
  if (minutes >= 60) {
    critMultiplier = 1.4;
    critType = 'mega';
  } else if (minutes >= 30) {
    critMultiplier = 1.25;
    critType = 'focus';
  }

  // Gentle streak synergy (+5% per streak step above 1.0, capped at +25%)
  const streakBonus = Math.min(0.25, Math.max(0, (multiplier - 1) * 0.5));
  const gearFactor = 1 + Math.max(0, Number(bossDmgBonusPct) || 0) / 100;
  const damage = Math.max(1, Math.round(minutes * critMultiplier * (1 + streakBonus) * gearFactor));
  return { damage, critType };
}

export function computeWeeklyBoss(
  sessions,
  playerLevel = 1,
  difficulty = 'adaptive',
  claimedBossWeeks = [],
  now = Date.now(),
  bossDmgBonusPct = 0
) {
  const weekStart = getLocalWeekStartDate(now);
  const weekKey = `week-${getLocalDateKey(weekStart)}`;
  const weekStartMs = weekStart.getTime();
  const weekEndMs = weekStartMs + 7 * 86400000;
  const daysLeft = Math.max(1, Math.ceil((weekEndMs - now) / 86400000));

  // Deterministic weekly boss pick from week number
  const weekIndex = Math.floor(weekStartMs / (7 * 86400000));
  const boss = BOSS_ROSTER[Math.abs(weekIndex) % BOSS_ROSTER.length];

  let maxHp = 210;
  if (difficulty === 'chill') {
    maxHp = 180;
  } else if (difficulty === 'balanced') {
    maxHp = 300;
  } else if (difficulty === 'hardcore') {
    maxHp = 600;
  } else {
    // Adaptive: 210 HP at Lv.1, +35 HP per Hero Level, capped cleanly at 600 HP
    maxHp = Math.min(600, Math.round(210 + Math.max(0, playerLevel - 1) * 35));
  }

  const weekSessions = (sessions || []).filter((s) => s.timestamp >= weekStartMs && s.timestamp < weekEndMs);
  let damageDealt = 0;
  let critCount = 0;

  for (const s of weekSessions) {
    const hit = calculateBossDamageForSession(s.durationSeconds, s.multiplier || 1.0, bossDmgBonusPct);
    damageDealt += hit.damage;
    if (hit.critType) critCount += 1;
  }

  const remainingHp = Math.max(0, maxHp - damageDealt);
  const hpPercent = Math.max(0, Math.min(100, Math.round((remainingHp / maxHp) * 100)));
  const damagePercent = Math.min(100, Math.round((damageDealt / maxHp) * 100));
  const defeated = remainingHp === 0;
  const claimed = (claimedBossWeeks || []).includes(weekKey);

  return {
    weekKey,
    boss,
    difficulty: BOSS_DIFFICULTIES[difficulty] ? difficulty : 'adaptive',
    maxHp,
    damageDealt,
    remainingHp,
    hpPercent,
    damagePercent,
    critCount,
    hitCount: weekSessions.length,
    daysLeft,
    defeated,
    claimed,
    bountyXp: BOSS_BOUNTY_XP,
    bountyGold: BOSS_BOUNTY_GOLD,
  };
}

/**
 * Gold economy helpers
 */
export function calculateSessionGold(xpEarned, goldBonusPct = 0) {
  const safeXp = Math.max(0, Number(xpEarned) || 0);
  if (safeXp === 0) return 0;
  const gearFactor = 1 + Math.max(0, Number(goldBonusPct) || 0) / 100;
  return Math.max(1, Math.round(safeXp * GOLD_PER_XP_RATIO * gearFactor));
}

export function computeGoldSummary(state, achievements) {
  const sessionGold = (state.sessions || []).reduce(
    (acc, s) =>
      acc + (typeof s.goldEarned === 'number' && s.goldEarned > 0 ? s.goldEarned : calculateSessionGold(s.xpEarned)),
    0
  );
  const achievementGold = (achievements || [])
    .filter((a) => state.unlockedAchievements && state.unlockedAchievements[a.id])
    .reduce((acc, a) => acc + Math.round(a.xpReward * 0.3), 0);
  const bossGold = (state.claimedBossWeeks || []).length * BOSS_BOUNTY_GOLD;
  // Bonus gold from quests (either explicitly tracked or derived smoothly from claimed quests)
  const bonusGold =
    typeof state.bonusGold === 'number'
      ? state.bonusGold
      : (state.claimedQuests || []).length * 30;

  const totalEarned = sessionGold + achievementGold + bossGold + bonusGold;

  const epicRewardIds = new Set((state.rewards || []).filter((r) => r.epic).map((r) => r.id));
  let totalSpent = 0;
  let epicSpent = 0;
  let regularSpent = 0;

  for (const r of state.rewardRedemptions || []) {
    const cost = Math.max(0, Number(r.cost) || 0);
    totalSpent += cost;
    const isEpicRedemption = Boolean(r.epic) || epicRewardIds.has(r.rewardId);
    if (isEpicRedemption) epicSpent += cost;
    else regularSpent += cost;
  }

  const balance = Math.max(0, totalEarned - totalSpent);

  const vaultSplitPercent = Math.max(0, Math.min(80, Math.round(Number(state.vaultSplitPercent) || 0)));
  const vaultManualDeposit = Math.round(Number(state.vaultManualDeposit) || 0);
  const vaultEnabled = vaultSplitPercent > 0 || vaultManualDeposit > 0;

  let vaultBalance = 0;
  let pocketBalance = balance;

  if (vaultEnabled) {
    const autoVaultEarned = Math.round(totalEarned * (vaultSplitPercent / 100));
    vaultBalance = Math.max(0, Math.min(balance, autoVaultEarned + vaultManualDeposit - epicSpent));
    pocketBalance = Math.max(0, balance - vaultBalance);
  }

  return {
    balance,
    pocketBalance,
    vaultBalance,
    vaultEnabled,
    vaultSplitPercent,
    vaultManualDeposit,
    totalEarned,
    totalSpent,
    epicSpent,
    regularSpent,
    sessionGold,
    achievementGold,
    bossGold,
    bonusGold,
  };
}

/**
 * Format remaining cooldown duration cleanly (e.g. "1d 14h", "5h 20m", "35m").
 */
export function formatCooldownRemaining(ms) {
  const totalMin = Math.max(1, Math.ceil((Number(ms) || 0) / 60000));
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  return `${mins}m`;
}

/**
 * Check whether a Tavern Shop reward is currently on cooldown.
 */
export function getRewardCooldownInfo(reward, rewardRedemptions = [], now = Date.now()) {
  const cooldownHours = Math.max(0, Number(reward?.cooldownHours) || 0);
  if (!cooldownHours) {
    return { onCooldown: false, cooldownHours: 0, remainingMs: 0, remainingLabel: '', unlocksAt: 0 };
  }

  let lastRedeemedAt = 0;
  for (const r of rewardRedemptions || []) {
    if (!r) continue;
    const match = r.rewardId === reward.id || (!r.rewardId && r.title === reward.title);
    if (match && Number(r.redeemedAt) > lastRedeemedAt) {
      lastRedeemedAt = Number(r.redeemedAt);
    }
  }

  if (!lastRedeemedAt) {
    return { onCooldown: false, cooldownHours, remainingMs: 0, remainingLabel: '', unlocksAt: 0 };
  }

  const unlocksAt = lastRedeemedAt + cooldownHours * 3600000;
  const remainingMs = Math.max(0, unlocksAt - now);
  return {
    onCooldown: remainingMs > 0,
    cooldownHours,
    remainingMs,
    remainingLabel: remainingMs > 0 ? formatCooldownRemaining(remainingMs) : '',
    unlocksAt,
  };
}

/**
 * Build deterministic Daily Quests for a given dateKey.
 */
export function buildDailyQuests(activities, sessions, claimedQuestIds = [], customQuests = [], now = Date.now()) {
  const todayKey = getLocalDateKey(now);
  const todaySessions = filterSessionsByTimeframe(sessions, 'today', now);
  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.durationSeconds / 60, 0);
  const distinctActivitiesToday = new Set(todaySessions.map((s) => s.activityId)).size;

  // Deterministic spotlight activity based on date
  const dayHash = todayKey.split('-').reduce((acc, p) => acc + Number(p), 0);
  const activeList = activities.filter((a) => !a.archived);
  const spotlight = activeList.length > 0 ? activeList[dayHash % activeList.length] : null;
  const spotlightMinutes = spotlight
    ? todaySessions
        .filter((s) => s.activityId === spotlight.id)
        .reduce((acc, s) => acc + s.durationSeconds / 60, 0)
    : 0;

  const autoQuests = [
    {
      id: `dq-warmup-${todayKey}`,
      title: 'Daily Spark',
      description: 'Log at least 15 minutes on any activity today',
      icon: '✨',
      target: 15,
      current: Math.min(15, Math.round(todayMinutes * 10) / 10),
      unit: 'min',
      xpReward: 75,
      auto: true,
    },
    {
      id: `dq-focus-${todayKey}`,
      title: 'Hero’s Hour',
      description: 'Spend 45 total minutes leveling up today',
      icon: '⏳',
      target: 45,
      current: Math.min(45, Math.round(todayMinutes * 10) / 10),
      unit: 'min',
      xpReward: 150,
      auto: true,
    },
    spotlight
      ? {
          id: `dq-spotlight-${todayKey}`,
          title: `Spotlight: ${spotlight.name}`,
          description: `Spend 20 minutes practicing ${spotlight.name} today`,
          icon: spotlight.icon,
          target: 20,
          current: Math.min(20, Math.round(spotlightMinutes * 10) / 10),
          unit: 'min',
          xpReward: 120,
          auto: true,
          activityId: spotlight.id,
        }
      : {
          id: `dq-variety-${todayKey}`,
          title: 'Balanced Explorer',
          description: 'Log time in 2 different activities today',
          icon: '🧭',
          target: 2,
          current: Math.min(2, distinctActivitiesToday),
          unit: 'skills',
          xpReward: 120,
          auto: true,
        },
  ];

  // Add variety bonus if spotlight was used and user has 2+ activities
  if (spotlight && activeList.length >= 2) {
    autoQuests.push({
      id: `dq-variety-${todayKey}`,
      title: 'Multi-Class Day',
      description: 'Practice at least 2 different activities today',
      icon: '🧭',
      target: 2,
      current: Math.min(2, distinctActivitiesToday),
      unit: 'skills',
      xpReward: 100,
      auto: true,
    });
  }

  const normalizedAuto = autoQuests.map((q) => ({
    ...q,
    completed: q.current >= q.target,
    claimed: claimedQuestIds.includes(q.id),
    progressPercent: Math.min(100, Math.round((q.current / q.target) * 100)),
  }));

  const normalizedCustom = (customQuests || [])
    .filter((q) => q.dateKey === todayKey)
    .map((q) => ({
      ...q,
      auto: false,
      current: q.completed ? 1 : 0,
      target: 1,
      unit: 'done',
      progressPercent: q.completed ? 100 : 0,
    }));

  return [...normalizedAuto, ...normalizedCustom];
}

/**
 * Achievement definitions & evaluation.
 */
export const ACHIEVEMENT_DEFS = [
  {
    id: 'first-steps',
    title: 'First Footsteps',
    description: 'Log your very first action',
    icon: '🌱',
    xpReward: 50,
    category: 'Milestones',
    evaluate: (ctx) => ({ current: Math.min(1, ctx.sessions.length), target: 1, unit: 'session' }),
  },
  {
    id: 'first-hour',
    title: 'Hourglass Initiate',
    description: 'Accumulate 1 total hour of tracked time',
    icon: '⏱️',
    xpReward: 75,
    category: 'Time',
    evaluate: (ctx) => ({ current: Math.min(60, Math.floor(ctx.totalSeconds / 60)), target: 60, unit: 'min' }),
  },
  {
    id: 'ten-hours',
    title: 'Time Sculptor',
    description: 'Accumulate 10 total hours of tracked time',
    icon: '⌛',
    xpReward: 250,
    category: 'Time',
    evaluate: (ctx) => ({ current: Math.min(600, Math.floor(ctx.totalSeconds / 60)), target: 600, unit: 'min' }),
  },
  {
    id: 'deep-diver',
    title: 'Deep Diver',
    description: 'Complete a single action lasting 45+ minutes',
    icon: '🌊',
    xpReward: 100,
    category: 'Focus',
    evaluate: (ctx) => ({
      current: Math.min(45, Math.floor(ctx.longestSessionSeconds / 60)),
      target: 45,
      unit: 'min',
    }),
  },
  {
    id: 'level-3',
    title: 'Apprentice Ascendant',
    description: 'Reach Level 3 in any activity',
    icon: '⭐',
    xpReward: 100,
    category: 'Mastery',
    evaluate: (ctx) => ({ current: Math.min(3, ctx.highestActivityLevel), target: 3, unit: 'lvl' }),
  },
  {
    id: 'level-6',
    title: 'True Adept',
    description: 'Reach Level 6 in any activity',
    icon: '🏅',
    xpReward: 200,
    category: 'Mastery',
    evaluate: (ctx) => ({ current: Math.min(6, ctx.highestActivityLevel), target: 6, unit: 'lvl' }),
  },
  {
    id: 'level-10',
    title: 'Guild Expert',
    description: 'Reach Level 10 in any activity',
    icon: '👑',
    xpReward: 400,
    category: 'Mastery',
    evaluate: (ctx) => ({ current: Math.min(10, ctx.highestActivityLevel), target: 10, unit: 'lvl' }),
  },
  {
    id: 'streak-3',
    title: 'Kindled Flame',
    description: 'Maintain a 3-day activity streak',
    icon: '🔥',
    xpReward: 100,
    category: 'Consistency',
    evaluate: (ctx) => ({ current: Math.min(3, ctx.streak.longest), target: 3, unit: 'days' }),
  },
  {
    id: 'streak-7',
    title: 'Unstoppable Ember',
    description: 'Maintain a 7-day activity streak',
    icon: '☄️',
    xpReward: 250,
    category: 'Consistency',
    evaluate: (ctx) => ({ current: Math.min(7, ctx.streak.longest), target: 7, unit: 'days' }),
  },
  {
    id: 'renaissance',
    title: 'Renaissance Soul',
    description: 'Log time across 4 different RPG attributes',
    icon: '🧭',
    xpReward: 150,
    category: 'Balance',
    evaluate: (ctx) => ({ current: Math.min(4, ctx.activeAttributesCount), target: 4, unit: 'stats' }),
  },
  {
    id: 'quest-hunter',
    title: 'Quest Hunter',
    description: 'Claim 3 Daily Quests',
    icon: '📜',
    xpReward: 125,
    category: 'Quests',
    evaluate: (ctx) => ({ current: Math.min(3, ctx.claimedQuestsCount), target: 3, unit: 'quests' }),
  },
  {
    id: 'session-ten',
    title: 'Momentum Builder',
    description: 'Complete 10 logged sessions',
    icon: '⚡',
    xpReward: 120,
    category: 'Milestones',
    evaluate: (ctx) => ({ current: Math.min(10, ctx.sessions.length), target: 10, unit: 'sessions' }),
  },
  {
    id: 'boss-slayer',
    title: 'Boss Slayer',
    description: 'Defeat & claim your first Weekly Boss',
    icon: '🐉',
    xpReward: 150,
    category: 'Bosses',
    evaluate: (ctx) => ({ current: Math.min(1, ctx.bossesSlain), target: 1, unit: 'boss' }),
  },
  {
    id: 'dragon-tamer',
    title: 'Legend of the Guild',
    description: 'Defeat & claim 3 Weekly Bosses',
    icon: '🏆',
    xpReward: 350,
    category: 'Bosses',
    evaluate: (ctx) => ({ current: Math.min(3, ctx.bossesSlain), target: 3, unit: 'bosses' }),
  },
];

export function evaluateAchievements(state, activityStats, streak) {
  const sessions = state.sessions || [];
  const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const longestSessionSeconds = sessions.reduce((max, s) => Math.max(max, s.durationSeconds), 0);
  const highestActivityLevel = activityStats.reduce((max, a) => Math.max(max, a.levelInfo.level), 1);

  const activeAttrSet = new Set();
  for (const a of activityStats) {
    if (a.totalSeconds > 0) {
      activeAttrSet.add(a.attribute);
      if (a.secondaryAttribute) activeAttrSet.add(a.secondaryAttribute);
    }
  }
  const activeAttributesCount = activeAttrSet.size;
  const claimedQuestsCount = (state.claimedQuests || []).length;
  const bossesSlain = (state.claimedBossWeeks || []).length;

  const ctx = {
    sessions,
    totalSeconds,
    longestSessionSeconds,
    highestActivityLevel,
    streak,
    activeAttributesCount,
    claimedQuestsCount,
    bossesSlain,
  };

  const unlockedMap = state.unlockedAchievements || {};

  return ACHIEVEMENT_DEFS.map((def) => {
    const res = def.evaluate(ctx);
    const qualified = res.current >= res.target;
    const unlockedAt = unlockedMap[def.id] || null;
    const unlocked = Boolean(unlockedAt) || qualified;
    return {
      ...def,
      ...res,
      unlocked,
      unlockedAt,
      progressPercent: Math.min(100, Math.round((res.current / res.target) * 100)),
    };
  });
}

/**
 * Compute daily minutes for the last N days (for 7-day chart).
 */
export function computeDailySeries(sessions, days = 7, now = Date.now()) {
  const todayMidnight = parseLocalDateKey(getLocalDateKey(now));
  const series = [];
  const map = new Map();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(todayMidnight.getTime() - i * 86400000);
    const key = getLocalDateKey(d);
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });
    const entry = { dateKey: key, label, seconds: 0, minutes: 0, xp: 0, sessions: 0, isToday: i === 0 };
    series.push(entry);
    map.set(key, entry);
  }

  for (const s of sessions || []) {
    const key = getLocalDateKey(s.timestamp);
    if (map.has(key)) {
      const entry = map.get(key);
      entry.seconds += s.durationSeconds;
      entry.minutes = Math.round((entry.seconds / 60) * 10) / 10;
      entry.xp += s.xpEarned;
      entry.sessions += 1;
    }
  }

  return series;
}

/**
 * Aggregate passive RPG buffs from currently equipped gear.
 */
export function computeGearBonuses(equippedGear = {}, inventoryGear = []) {
  const ownedIds = new Set((inventoryGear || []).map((g) => g.gearId));
  const attrXp = { mind: 0, body: 0, craft: 0, social: 0, rest: 0 };
  let allXpPct = 0;
  let goldPct = 0;
  let bossDmgPct = 0;
  let sprintBonusPct = 0;
  const equippedItems = {};
  const equippedList = [];

  for (const slot of GEAR_SLOTS) {
    const gearId = equippedGear && equippedGear[slot.id];
    const def = gearId && ownedIds.has(gearId) ? GEAR_MAP[gearId] : null;
    equippedItems[slot.id] = def || null;
    if (!def) continue;
    equippedList.push(def);
    const b = def.bonus || {};
    allXpPct += Number(b.allXpPct) || 0;
    goldPct += Number(b.goldPct) || 0;
    bossDmgPct += Number(b.bossDmgPct) || 0;
    sprintBonusPct += Number(b.sprintBonusPct) || 0;
    if (b.attrXp) {
      for (const [attrId, pct] of Object.entries(b.attrXp)) {
        if (attrId in attrXp) attrXp[attrId] += Number(pct) || 0;
      }
    }
  }

  const summaryTags = [];
  if (allXpPct > 0) summaryTags.push(`+${allXpPct}% All XP`);
  for (const a of ATTRIBUTES) {
    if (attrXp[a.id] > 0) summaryTags.push(`+${attrXp[a.id]}% ${a.label} XP`);
  }
  if (sprintBonusPct > 0) summaryTags.push(`+${sprintBonusPct}% Sprint`);
  if (goldPct > 0) summaryTags.push(`+${goldPct}% Gold`);
  if (bossDmgPct > 0) summaryTags.push(`+${bossDmgPct}% Boss DMG`);

  return {
    allXpPct,
    attrXp,
    goldPct,
    bossDmgPct,
    sprintBonusPct,
    equippedItems,
    equippedList,
    summaryTags,
  };
}

/**
 * Compute all unopened RPG Loot Chests earned from Hero Levels, Boss Trophies,
 * Focus Sprints, and Shop Mystery Chests.
 */
export function getPendingLootChests(state, playerLevel = 1) {
  const openedSet = new Set(state.openedChestMilestones || []);
  const pending = [];

  // 1. Level milestone chests (Lv.2, 4, 6, 8, 10, 12, 14, ...)
  for (let lv = 2; lv <= Math.min(playerLevel, 60); lv += 2) {
    const id = `chest-lvl-${lv}`;
    if (!openedSet.has(id)) {
      pending.push({
        id,
        tier: lv >= 6 ? 'sprint' : 'standard',
        icon: '🎁',
        label: `Level ${lv} Hero Chest`,
        source: `Reached Hero Level ${lv}`,
      });
    }
  }

  // 2. Boss Raid chests (1 guaranteed Rare+ chest per defeated Weekly Boss!)
  for (const trophy of state.bossTrophies || []) {
    if (!trophy || !trophy.weekKey) continue;
    const id = `chest-boss-${trophy.weekKey}`;
    if (!openedSet.has(id)) {
      pending.push({
        id,
        tier: 'boss',
        icon: '🐉',
        label: `${trophy.bossName || 'Boss'} Raid Chest`,
        source: 'Weekly Boss Victory (Rare+ guaranteed)',
      });
    }
  }

  // 3. Focus Sprint chests (every 3 completed Focus Sprints)
  const completedSprints = (state.sessions || []).filter((s) => Boolean(s.sprintBonus)).length;
  for (let n = 3; n <= completedSprints; n += 3) {
    const id = `chest-sprint-${n}`;
    if (!openedSet.has(id)) {
      pending.push({
        id,
        tier: 'sprint',
        icon: '⚡',
        label: `${n}-Sprint Supply Chest`,
        source: `Completed ${n} Focus Sprints`,
      });
    }
  }

  // 4. Shop-purchased Mystery Chests
  for (const c of state.purchasedChests || []) {
    if (!c || !c.id || openedSet.has(c.id)) continue;
    pending.push({
      id: c.id,
      tier: c.tier || 'boss',
      icon: '🧰',
      label: 'Tavern Mystery Chest',
      source: 'Tavern Shop (Rare+ guaranteed)',
    });
  }

  return pending;
}

/**
 * Roll a single RPG Loot Chest drop with duplicate-friendly smart weighting.
 */
export function rollLootChest({ tier = 'standard', ownedGearIds = [], rng = Math.random } = {}) {
  const weights =
    tier === 'boss'
      ? { common: 0, rare: 45, epic: 38, legendary: 17 }
      : tier === 'sprint'
        ? { common: 28, rare: 42, epic: 22, legendary: 8 }
        : { common: 48, rare: 34, epic: 14, legendary: 4 };

  const roll = rng() * 100;
  let rarity = 'common';
  let acc = 0;
  for (const r of ['common', 'rare', 'epic', 'legendary']) {
    acc += weights[r];
    if (roll < acc) {
      rarity = r;
      break;
    }
  }

  const ownedSet = new Set(ownedGearIds || []);
  const rarityPool = GEAR_CATALOG.filter((g) => g.rarity === rarity);
  const unownedInRarity = rarityPool.filter((g) => !ownedSet.has(g.id));
  const unownedAny = GEAR_CATALOG.filter((g) => !ownedSet.has(g.id) && (tier !== 'boss' || g.rarity !== 'common'));

  let chosen = null;
  if (unownedInRarity.length > 0) {
    chosen = unownedInRarity[Math.floor(rng() * unownedInRarity.length)];
  } else if (unownedAny.length > 0 && rng() < 0.72) {
    chosen = unownedAny[Math.floor(rng() * unownedAny.length)];
  } else {
    const fallbackPool = rarityPool.length > 0 ? rarityPool : GEAR_CATALOG;
    chosen = fallbackPool[Math.floor(rng() * fallbackPool.length)];
  }

  const isDuplicate = ownedSet.has(chosen.id);
  const duplicateGold = isDuplicate ? RARITY_META[chosen.rarity].duplicateGold : 0;

  return {
    gear: chosen,
    rarityMeta: RARITY_META[chosen.rarity],
    isDuplicate,
    duplicateGold,
  };
}

/**
 * Evaluate unlock & active status of all RPG Visual Themes.
 */
export function getThemeStatusList(state, playerLevel = 1) {
  const purchasedSet = new Set(state.unlockedThemes || ['twilight']);
  const activeId = RPG_THEME_MAP[state.activeTheme] ? state.activeTheme : 'twilight';

  return RPG_THEMES.map((theme) => {
    const unlockedByLevel = playerLevel >= theme.unlockLevel;
    const purchased = purchasedSet.has(theme.id);
    const unlocked = theme.id === 'twilight' || unlockedByLevel || purchased;
    return {
      ...theme,
      unlocked,
      unlockedByLevel,
      purchased,
      active: activeId === theme.id && unlocked,
    };
  });
}

/**
 * Build a 91-day (13-week) Monday-aligned RPG Activity Heatmap ending today.
 */
export function computeActivityHeatmap(sessions = [], shieldedDates = [], weeks = 13, now = Date.now()) {
  const today = parseLocalDateKey(getLocalDateKey(now));
  const todayKey = getLocalDateKey(today);
  // Align end of grid to Sunday of the current week so rows are clean Mon..Sun (0..6)
  const todayDow = (today.getDay() + 6) % 7; // Mon=0 .. Sun=6
  const startDay = new Date(today.getTime() - ((weeks - 1) * 7 + todayDow) * 86400000);
  const totalDays = (weeks - 1) * 7 + todayDow + 1;

  const byDate = new Map();
  for (const s of sessions || []) {
    const key = getLocalDateKey(s.timestamp);
    const prev = byDate.get(key) || { seconds: 0, xp: 0, sessions: 0 };
    prev.seconds += Number(s.durationSeconds) || 0;
    prev.xp += Number(s.xpEarned) || 0;
    prev.sessions += 1;
    byDate.set(key, prev);
  }

  const shieldSet = new Set(shieldedDates || []);
  const cells = [];
  const monthLabels = [];
  let lastMonth = -1;
  let activeDays = 0;
  let totalSeconds = 0;
  let bestDay = null;

  for (let i = 0; i < totalDays; i++) {
    const d = new Date(startDay.getTime() + i * 86400000);
    const dateKey = getLocalDateKey(d);
    const col = Math.floor(i / 7);
    const row = i % 7; // 0=Mon .. 6=Sun
    const agg = byDate.get(dateKey) || { seconds: 0, xp: 0, sessions: 0 };
    const mins = agg.seconds / 60;
    let level = 0;
    if (mins >= 120) level = 4;
    else if (mins >= 60) level = 3;
    else if (mins >= 30) level = 2;
    else if (mins > 0) level = 1;

    const shielded = shieldSet.has(dateKey);
    if (agg.seconds > 0) {
      activeDays += 1;
      totalSeconds += agg.seconds;
      if (!bestDay || agg.seconds > bestDay.seconds) {
        bestDay = { dateKey, seconds: agg.seconds, sessions: agg.sessions };
      }
    }

    if (row === 0 && d.getMonth() !== lastMonth) {
      monthLabels.push({
        col,
        label: d.toLocaleDateString(undefined, { month: 'short' }),
      });
      lastMonth = d.getMonth();
    }

    cells.push({
      dateKey,
      col,
      row,
      seconds: agg.seconds,
      xp: agg.xp,
      sessions: agg.sessions,
      level,
      shielded,
      isToday: dateKey === todayKey,
    });
  }

  return {
    weeks,
    totalDays,
    cells,
    monthLabels,
    activeDays,
    totalSeconds,
    bestDay,
  };
}

/**
 * Compute full derived snapshot of the game state for rendering.
 */
export function computeDerivedState(state, now = Date.now()) {
  const activities = state.activities || [];
  const sessions = state.sessions || [];
  const shieldedDates = state.shieldedDates || [];
  const streak = calculateStreak(sessions, now, shieldedDates);
  const activityStats = computeActivityStats(activities, sessions, now);
  const attributeStats = computeAttributeStats(activityStats);
  const heroClass = computeHeroClass(attributeStats);
  const dailyQuests = buildDailyQuests(
    activities,
    sessions,
    state.claimedQuests || [],
    state.customQuests || [],
    now
  );
  const achievements = evaluateAchievements(state, activityStats, streak);

  const sessionXp = sessions.reduce((acc, s) => acc + s.xpEarned, 0);
  const bonusXp = state.bonusXp || 0;
  const achievementXp = achievements
    .filter((a) => state.unlockedAchievements && state.unlockedAchievements[a.id])
    .reduce((acc, a) => acc + a.xpReward, 0);
  const totalPlayerXp = sessionXp + bonusXp + achievementXp;
  const playerLevelInfo = getPlayerLevelInfo(totalPlayerXp);

  const gearBonuses = computeGearBonuses(state.equippedGear || {}, state.inventoryGear || []);
  const pendingChests = getPendingLootChests(state, playerLevelInfo.level);
  const themes = getThemeStatusList(state, playerLevelInfo.level);
  const activeThemeObj = themes.find((t) => t.active) || themes[0];

  const shieldPurchased = (state.shieldPurchases || []).length;
  const shieldUsed = shieldedDates.length;
  const shieldAvailable = Math.max(0, shieldPurchased - shieldUsed);
  const streakShields = {
    available: shieldAvailable,
    purchased: shieldPurchased,
    used: shieldUsed,
    max: STREAK_SHIELD_MAX,
    cost: STREAK_SHIELD_COST,
  };

  const weeklyBoss = computeWeeklyBoss(
    sessions,
    playerLevelInfo.level,
    state.bossDifficulty || 'adaptive',
    state.claimedBossWeeks || [],
    now,
    gearBonuses.bossDmgPct
  );
  const gold = computeGoldSummary(state, achievements);

  const todaySessions = filterSessionsByTimeframe(sessions, 'today', now);
  const todaySeconds = todaySessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const todayXp = todaySessions.reduce((acc, s) => acc + s.xpEarned, 0);
  const totalSeconds = sessions.reduce((acc, s) => acc + s.durationSeconds, 0);

  return {
    streak,
    streakShields,
    activityStats,
    attributeStats,
    heroClass,
    gearBonuses,
    pendingChests,
    themes,
    activeTheme: activeThemeObj,
    weeklyBoss,
    gold,
    dailyQuests,
    achievements,
    playerLevelInfo,
    totalPlayerXp,
    todaySeconds,
    todayXp,
    totalSeconds,
    dailySeries7d: computeDailySeries(sessions, 7, now),
    heatmap90d: computeActivityHeatmap(sessions, shieldedDates, 13, now),
  };
}

/**
 * Human-friendly duration formatters.
 */
export function formatDurationShort(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  if (sec === 0) return '0m';
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatStopwatch(totalSeconds) {
  const sec = Math.max(0, Math.floor(totalSeconds || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
