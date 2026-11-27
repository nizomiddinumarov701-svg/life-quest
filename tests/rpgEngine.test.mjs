import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GEAR_MAP,
  MAX_GEAR_XP_BONUS_PCT,
  REFUND_WINDOW_MS,
  calculateBossDamageForSession,
  calculateSessionGold,
  calculateSessionXp,
  calculateStreak,
  computeActivityHeatmap,
  computeAutoShieldDates,
  computeCampaignSummary,
  computeCompanionState,
  computeDerivedState,
  computeForgeSummary,
  computeGearBonuses,
  computeHeroClass,
  computeWeeklyBoss,
  filterSessionsByTimeframe,
  formatDurationShort,
  formatStopwatch,
  getActivityLevelInfo,
  getEffectiveGearXpBonus,
  getPendingLootChests,
  getPlayerLevelInfo,
  getRewardCooldownInfo,
  getScaledGearItem,
  getThemeStatusList,
  isRedemptionRefundable,
  rollLootChest,
  sumBonusLedger,
} from '../src/rpgEngine.js';

import {
  createDefaultState,
  createSampleAdventureState,
  exportStateToJson,
  parseImportedJson,
  sanitizeState,
} from '../src/storage.js';
import {
  GIST_FILENAME,
  buildGistVaultPayload,
  findLifeQuestGist,
  mergeActiveTimers,
  mergeStates,
  parseGistVaultPayload,
} from '../src/sync.js';

test('Activity level curve starts at Level 1 and levels up at 150 XP', () => {
  const lv1 = getActivityLevelInfo(0);
  assert.equal(lv1.level, 1);
  assert.equal(lv1.rankTitle, 'Novice');
  assert.equal(lv1.xpNeededForNext, 150);

  const lv2 = getActivityLevelInfo(150);
  assert.equal(lv2.level, 2);
  assert.equal(lv2.currentLevelXp, 0);

  const lv3 = getActivityLevelInfo(150 + 382);
  assert.equal(lv3.level, 3);
  assert.equal(lv3.rankTitle, 'Apprentice');
});

test('Session XP scales accurately with duration and streak multiplier', () => {
  assert.equal(calculateSessionXp(4, 1.0), 0);
  assert.equal(calculateSessionXp(15 * 60, 1.0), 150);
  assert.equal(calculateSessionXp(30 * 60, 1.5), 450);
  assert.equal(calculateSessionXp(10, 1.0), 2);
});

test('Streak calculation detects consecutive days and caps multiplier at 2.0x', () => {
  const now = new Date(2026, 10, 25, 14, 0, 0).getTime();
  const day = 86400000;
  const sessions = [
    { timestamp: now - 3 * day },
    { timestamp: now - 2 * day },
    { timestamp: now - 1 * day },
    { timestamp: now },
  ];
  const streak = calculateStreak(sessions, now);
  assert.equal(streak.current, 4);
  assert.equal(streak.longest, 4);
  assert.equal(streak.activeToday, true);
  assert.equal(streak.multiplier, 1.3);

  // 15 consecutive days caps multiplier at 2.0x
  const longSessions = Array.from({ length: 15 }, (_, i) => ({ timestamp: now - i * day }));
  const longStreak = calculateStreak(longSessions, now);
  assert.equal(longStreak.current, 15);
  assert.equal(longStreak.multiplier, 2.0);
});

test('Derived state computes activity totals, radar attributes, quests, and achievements', () => {
  const now = new Date(2026, 10, 25, 15, 0, 0).getTime();
  const state = createSampleAdventureState(now);
  const derived = computeDerivedState(state, now);

  assert.equal(derived.streak.current, 5);
  assert.ok(derived.totalSeconds > 0);
  assert.ok(derived.todaySeconds > 0);
  assert.equal(derived.attributeStats.length, 5);
  assert.ok(derived.playerLevelInfo.level >= 2);
  assert.ok(derived.dailyQuests.length >= 3);

  const warmUp = derived.dailyQuests.find((q) => q.title === 'Daily Spark');
  assert.ok(warmUp.completed);

  const unlocked = derived.achievements.filter((a) => a.unlocked);
  assert.ok(unlocked.length >= 5);
});

test('Timeframe filtering accurately slices today vs week vs all', () => {
  const now = new Date(2026, 10, 25, 15, 0, 0).getTime();
  const day = 86400000;
  const sessions = [
    { id: '1', timestamp: now - 1000, durationSeconds: 600 },
    { id: '2', timestamp: now - 3 * day, durationSeconds: 600 },
    { id: '3', timestamp: now - 15 * day, durationSeconds: 600 },
    { id: '4', timestamp: now - 45 * day, durationSeconds: 600 },
  ];

  assert.equal(filterSessionsByTimeframe(sessions, 'today', now).length, 1);
  assert.equal(filterSessionsByTimeframe(sessions, 'week', now).length, 2);
  assert.equal(filterSessionsByTimeframe(sessions, 'month', now).length, 3);
  assert.equal(filterSessionsByTimeframe(sessions, 'all', now).length, 4);
});

test('JSON backup export and import round-trips cleanly and rejects garbage', () => {
  const state = createSampleAdventureState();
  const json = exportStateToJson(state);
  const restored = parseImportedJson(json);

  assert.equal(restored.activities.length, state.activities.length);
  assert.equal(restored.sessions.length, state.sessions.length);
  assert.equal(restored.profile.name, state.profile.name);

  assert.throws(() => parseImportedJson('{"invalid": true}'));
  assert.throws(() => parseImportedJson('not json'));
});

test('Duration formatters output clean human-readable strings', () => {
  assert.equal(formatDurationShort(0), '0m');
  assert.equal(formatDurationShort(42), '42s');
  assert.equal(formatDurationShort(900), '15m');
  assert.equal(formatDurationShort(3600), '1h');
  assert.equal(formatDurationShort(5400), '1h 30m');
  assert.equal(formatStopwatch(3665), '01:01:05');

  const pl = getPlayerLevelInfo(350);
  assert.equal(pl.level, 2);
  assert.equal(pl.rankTitle, 'Seeker');

  const def = createDefaultState();
  assert.equal(def.activities.length, 6);
});

test('RPG Attribute Radar scales by tiered levels instead of maxing out early', () => {
  const now = Date.now();
  const state = createDefaultState();
  // 1h 32m of Craft (~920 XP -> Lv.3) and 1h of Mind (~600 XP -> Lv.3)
  state.sessions.push(
    {
      id: 's1',
      activityId: 'act_coding',
      durationSeconds: 92 * 60,
      xpEarned: 920,
      multiplier: 1,
      timestamp: now,
      source: 'timer',
      note: '',
    },
    {
      id: 's2',
      activityId: 'act_reading',
      durationSeconds: 60 * 60,
      xpEarned: 600,
      multiplier: 1,
      timestamp: now,
      source: 'manual',
      note: '',
    }
  );

  const derived = computeDerivedState(state, now);
  const craft = derived.attributeStats.find((a) => a.id === 'craft');
  const mind = derived.attributeStats.find((a) => a.id === 'mind');
  const body = derived.attributeStats.find((a) => a.id === 'body');

  assert.equal(craft.radarCapLevel, 10);
  assert.equal(craft.radarTierLabel, 'Tier I');
  assert.ok(craft.radarScore > 0.25 && craft.radarScore < 0.45, `expected craft ~0.35, got ${craft.radarScore}`);
  assert.ok(mind.radarScore > 0.2 && mind.radarScore < craft.radarScore);
  assert.equal(body.radarScore, 0.08);

  // Pushing Craft past Lv.10 auto-expands the radar scale to Tier II (Lv.20)
  state.sessions.push({
    id: 's3',
    activityId: 'act_coding',
    durationSeconds: 30 * 3600,
    xpEarned: 18000,
    multiplier: 1,
    timestamp: now,
    source: 'manual',
    note: '',
  });
  const highDerived = computeDerivedState(state, now);
  const highCraft = highDerived.attributeStats.find((a) => a.id === 'craft');
  assert.equal(highCraft.radarCapLevel, 20);
  assert.equal(highCraft.radarTierLabel, 'Tier II');
  assert.ok(highCraft.radarScore < 0.9, `expected Tier II headroom, got ${highCraft.radarScore}`);
});

test('Dynamic Hero Class evolves accurately from top RPG attributes', () => {
  // Starter (<100 XP)
  const fresh = computeHeroClass([
    { id: 'mind', totalXp: 0, color: '#818cf8' },
    { id: 'body', totalXp: 0, color: '#34d399' },
    { id: 'craft', totalXp: 50, color: '#fbbf24' },
    { id: 'social', totalXp: 0, color: '#fb7185' },
    { id: 'rest', totalXp: 0, color: '#38bdf8' },
  ]);
  assert.equal(fresh.name, 'Novice Wanderer');

  // Craft + Mind -> Artificer
  const artificer = computeHeroClass([
    { id: 'mind', totalXp: 600, color: '#818cf8' },
    { id: 'body', totalXp: 0, color: '#34d399' },
    { id: 'craft', totalXp: 920, color: '#fbbf24' },
    { id: 'social', totalXp: 0, color: '#fb7185' },
    { id: 'rest', totalXp: 0, color: '#38bdf8' },
  ]);
  assert.equal(artificer.name, 'Artificer');

  // Social + Vitality -> Cozy Bard
  const bard = computeHeroClass([
    { id: 'mind', totalXp: 100, color: '#818cf8' },
    { id: 'body', totalXp: 50, color: '#34d399' },
    { id: 'craft', totalXp: 0, color: '#fbbf24' },
    { id: 'social', totalXp: 500, color: '#fb7185' },
    { id: 'rest', totalXp: 400, color: '#38bdf8' },
  ]);
  assert.equal(bard.name, 'Cozy Bard');

  // All 5 balanced -> Grand Polymath
  const polymath = computeHeroClass([
    { id: 'mind', totalXp: 500, color: '#818cf8' },
    { id: 'body', totalXp: 420, color: '#34d399' },
    { id: 'craft', totalXp: 480, color: '#fbbf24' },
    { id: 'social', totalXp: 350, color: '#fb7185' },
    { id: 'rest', totalXp: 400, color: '#38bdf8' },
  ]);
  assert.equal(polymath.name, 'Grand Polymath');
});

test('Secondary Combo Attribute splits 70% Primary and 30% Secondary XP & time', () => {
  const now = Date.now();
  const state = createDefaultState();
  state.activities.push({
    id: 'act_walk_friends',
    name: 'Street Walk with Friends',
    icon: '🚶',
    color: '#fb7185',
    attribute: 'social',
    secondaryAttribute: 'rest',
    dailyGoalMinutes: 30,
    createdAt: now,
  });
  state.sessions.push({
    id: 's_combo',
    activityId: 'act_walk_friends',
    durationSeconds: 60 * 60, // 60m
    xpEarned: 600,
    multiplier: 1,
    timestamp: now,
    source: 'timer',
    note: 'Evening walk',
  });

  const derived = computeDerivedState(state, now);
  const social = derived.attributeStats.find((a) => a.id === 'social');
  const vitality = derived.attributeStats.find((a) => a.id === 'rest');

  assert.equal(social.totalXp, 420); // 70% of 600
  assert.equal(vitality.totalXp, 180); // 30% of 600
  assert.equal(social.totalSeconds, 2520); // 42m
  assert.equal(vitality.totalSeconds, 1080); // 18m
  assert.equal(derived.heroClass.name, 'Cozy Bard');
});

test('Weekly Boss Battles calculate focus crits, adaptive HP, and victory state', () => {
  const now = new Date(2026, 10, 25, 16, 0, 0).getTime(); // Wed Nov 25, 2026
  const shortHit = calculateBossDamageForSession(15 * 60, 1.0);
  assert.equal(shortHit.damage, 15);
  assert.equal(shortHit.critType, null);

  const focusCrit = calculateBossDamageForSession(40 * 60, 1.0);
  assert.equal(focusCrit.damage, 50); // 40 * 1.25
  assert.equal(focusCrit.critType, 'focus');

  const megaCrit = calculateBossDamageForSession(60 * 60, 1.0);
  assert.equal(megaCrit.damage, 84); // 60 * 1.4
  assert.equal(megaCrit.critType, 'mega');

  const bossLv1 = computeWeeklyBoss([], 1, 'adaptive', [], now);
  const bossLv5 = computeWeeklyBoss([], 5, 'adaptive', [], now);
  assert.equal(bossLv1.maxHp, 210);
  assert.equal(bossLv5.maxHp, 350);

  // Deal enough damage this week to defeat Lv.1 adaptive boss (210 HP)
  const sessions = [
    { durationSeconds: 90 * 60, multiplier: 1.0, timestamp: now - 3600000 }, // 126 dmg
    { durationSeconds: 70 * 60, multiplier: 1.0, timestamp: now - 100000 }, // 98 dmg -> total 224 >= 210
  ];
  const defeatedBoss = computeWeeklyBoss(sessions, 1, 'adaptive', [], now);
  assert.equal(defeatedBoss.defeated, true);
  assert.equal(defeatedBoss.remainingHp, 0);
  assert.equal(defeatedBoss.critCount, 2);
});

test('Gold economy tracks retroactive earnings, spending, and starter rewards migration', () => {
  // Simulate an existing v1 user saved state (no rewards/bossDifficulty/bonusGold fields yet)
  const legacyV1 = {
    version: 1,
    profile: { name: 'Adventurer', avatar: '🛡️' },
    settings: { theme: 'dark', soundEnabled: true },
    activities: [
      { id: 'act_coding', name: 'Deep Work & Coding', icon: '💻', color: '#fbbf24', attribute: 'craft', dailyGoalMinutes: 60, createdAt: 1000 },
      { id: 'act_reading', name: 'Reading & Learning', icon: '📚', color: '#818cf8', attribute: 'mind', dailyGoalMinutes: 30, createdAt: 1000 },
    ],
    sessions: [
      { id: 's1', activityId: 'act_coding', durationSeconds: 92 * 60, xpEarned: 920, multiplier: 1, timestamp: Date.now(), source: 'timer', note: '' },
      { id: 's2', activityId: 'act_reading', durationSeconds: 60 * 60, xpEarned: 600, multiplier: 1, timestamp: Date.now(), source: 'manual', note: '' },
    ],
    claimedQuests: ['dq-warmup-2026-11-25'],
    customQuests: [],
    unlockedAchievements: { 'first-steps': Date.now() },
    bonusXp: 75,
  };

  const upgraded = sanitizeState(legacyV1);
  assert.equal(upgraded.activities.length, 2);
  assert.equal(upgraded.sessions.length, 2);
  assert.equal(upgraded.bossDifficulty, 'adaptive');
  assert.equal(upgraded.rewards.length, 4);
  const keyboard = upgraded.rewards.find((r) => r.title.includes('Magnetic Keyboard'));
  assert.ok(keyboard && keyboard.cost === 5000 && keyboard.epic === true);
  const energyDrink = upgraded.rewards.find((r) => r.title === 'Energy Drink');
  assert.ok(energyDrink && energyDrink.cost === 650 && energyDrink.icon === '⚡');

  const derived = computeDerivedState(upgraded);
  // Session gold: round(920*0.15)=138 + round(600*0.15)=90 = 228; Quest bonus: 30; Achievement ('first-steps' 50 XP): 15 -> 273g
  assert.equal(calculateSessionGold(920), 138);
  assert.equal(derived.gold.balance, 273);

  // Spend 120g on Gaming reward
  upgraded.rewardRedemptions.push({
    id: 'red_1',
    rewardId: 'rew_gaming',
    title: '1h Guilt-Free Gaming / Chilling',
    icon: '🎮',
    cost: 120,
    redeemedAt: Date.now(),
  });
  const afterSpend = computeDerivedState(upgraded);
  assert.equal(afterSpend.gold.balance, 153);
  assert.equal(afterSpend.gold.totalSpent, 120);
});

test('Cloud Sync mergeStates unions PC & Phone sessions, honors deletions, and keeps device settings', () => {
  const now = Date.now();
  const pc = createDefaultState();
  pc.settings.theme = 'dark';
  pc.settings.soundEnabled = true;
  pc.updatedAt = now + 5000;
  pc.sessions.push(
    { id: 'sess_pc_1', activityId: 'act_coding', durationSeconds: 3600, xpEarned: 600, multiplier: 1, timestamp: now, source: 'timer', note: '1h coding on PC' },
    { id: 'sess_deleted', activityId: 'act_reading', durationSeconds: 600, xpEarned: 100, multiplier: 1, timestamp: now - 1000, source: 'manual', note: 'mistake' }
  );

  const phone = createDefaultState();
  phone.settings.theme = 'light';
  phone.settings.soundEnabled = false;
  phone.updatedAt = now + 2000;
  phone.sessions.push({
    id: 'sess_phone_1',
    activityId: 'act_workout',
    durationSeconds: 1800,
    xpEarned: 300,
    multiplier: 1,
    timestamp: now + 1000,
    source: 'manual',
    note: 'Gym on Phone',
  });
  // Phone deleted sess_deleted
  phone.deletedIds = { sess_deleted: now + 3000 };

  const mergedOnPhone = mergeStates(phone, pc);
  const ids = mergedOnPhone.sessions.map((s) => s.id);
  assert.ok(ids.includes('sess_pc_1'), 'keeps 1h PC coding session');
  assert.ok(ids.includes('sess_phone_1'), 'keeps phone workout session');
  assert.ok(!ids.includes('sess_deleted'), 'honors deletion tombstone');
  // Phone keeps its own local theme/sound preferences
  assert.equal(mergedOnPhone.settings.theme, 'light');
  assert.equal(mergedOnPhone.settings.soundEnabled, false);

  // Active timer merge picks most recent timer interaction
  const pcTimer = { activityId: 'act_coding', isRunning: true, startedAt: now + 4000, accumulatedMs: 0, note: '' };
  const mergedTimer = mergeActiveTimers(null, now, pcTimer, now + 4000);
  assert.equal(mergedTimer.activeTimer.activityId, 'act_coding');
  assert.equal(mergedTimer.activeTimerUpdatedAt, now + 4000);
});

test('Focus Sprint completion awards +20% bonus XP and proportional Gold', () => {
  const normalXp = calculateSessionXp(25 * 60, 1.0, false);
  const sprintXp = calculateSessionXp(25 * 60, 1.0, true);
  assert.equal(normalXp, 250);
  assert.equal(sprintXp, 300); // +20%
  assert.ok(calculateSessionGold(sprintXp) > calculateSessionGold(normalXp));
});

test('Epic Savings Vault protects 40% of Gold while everyday treats spend only Pocket Gold', () => {
  const state = createDefaultState();
  state.vaultSplitPercent = 40;
  // 1000g earned via sessions (~6667 XP)
  state.sessions.push({
    id: 's_gold',
    activityId: 'act_coding',
    durationSeconds: 10 * 3600,
    xpEarned: 6000,
    multiplier: 1,
    timestamp: Date.now(),
    source: 'timer',
    note: '',
  });
  state.bonusGold = 100; // 900g + 100g = 1000g earned

  const before = computeDerivedState(state);
  assert.equal(before.gold.totalEarned, 1000);
  assert.equal(before.gold.vaultBalance, 400); // 40% locked
  assert.equal(before.gold.pocketBalance, 600); // 60% pocket
  assert.equal(before.gold.pocketBalance + before.gold.vaultBalance, before.gold.balance);

  // Spend 120g on regular Gaming reward -> pocket drops to 480g, Vault STAYS 400g!
  state.rewardRedemptions.push({
    id: 'r1',
    rewardId: 'rew_gaming',
    title: '1h Guilt-Free Gaming / Chilling',
    icon: '🎮',
    cost: 120,
    epic: false,
    redeemedAt: Date.now(),
  });
  const afterTreat = computeDerivedState(state);
  assert.equal(afterTreat.gold.vaultBalance, 400);
  assert.equal(afterTreat.gold.pocketBalance, 480);

  // Stash +100g manually from Pocket -> Vault becomes 500g, Pocket 380g
  state.vaultManualDeposit = 100;
  const afterStash = computeDerivedState(state);
  assert.equal(afterStash.gold.vaultBalance, 500);
  assert.equal(afterStash.gold.pocketBalance, 380);
});

test('Reward Cooldowns lock items for configured hours and unlock cleanly when expired', () => {
  const now = new Date(2026, 10, 26, 12, 0, 0).getTime();
  const energyDrink = { id: 'rew_energy_drink', title: 'Energy Drink', cooldownHours: 48 };

  // Never redeemed -> not on cooldown
  assert.equal(getRewardCooldownInfo(energyDrink, [], now).onCooldown, false);

  // Redeemed 2 hours ago -> 46h remaining (1d 22h)
  const redemptions = [{ id: 'r1', rewardId: 'rew_energy_drink', title: 'Energy Drink', redeemedAt: now - 2 * 3600000 }];
  const activeCd = getRewardCooldownInfo(energyDrink, redemptions, now);
  assert.equal(activeCd.onCooldown, true);
  assert.equal(activeCd.remainingLabel, '1d 22h');

  // 49 hours later -> unlocked!
  const expiredCd = getRewardCooldownInfo(energyDrink, redemptions, now + 47 * 3600000);
  assert.equal(expiredCd.onCooldown, false);
});

test('GitHub Gist Sync round-trips vault payload and auto-discovers the latest private Gist', () => {
  const sample = createSampleAdventureState();
  const timer = { activityId: sample.activities[0].id, isRunning: true, startedAt: Date.now(), accumulatedMs: 0, mode: 'sprint', targetSeconds: 1500, sprintCompleted: false, note: 'GitHub Pages test' };
  const content = buildGistVaultPayload({
    version: 7,
    state: sample,
    activeTimer: timer,
    activeTimerUpdatedAt: 123456789,
  });

  const gistObj = {
    id: 'gist_abc123',
    updated_at: '2026-11-26T16:00:00Z',
    files: {
      [GIST_FILENAME]: { content, truncated: false },
    },
  };

  const parsed = parseGistVaultPayload(gistObj);
  assert.equal(parsed.needsRawFetch, false);
  assert.equal(parsed.version, 7);
  assert.equal(parsed.state.sessions.length, sample.sessions.length);
  assert.equal(parsed.activeTimer.note, 'GitHub Pages test');
  assert.equal(parsed.activeTimerUpdatedAt, 123456789);

  // Truncated gist signals raw fetch
  const trunc = parseGistVaultPayload({
    id: 'gist_big',
    files: { [GIST_FILENAME]: { truncated: true, raw_url: 'https://gist.githubusercontent.com/raw/big' } },
  });
  assert.equal(trunc.needsRawFetch, true);
  assert.equal(trunc.rawUrl, 'https://gist.githubusercontent.com/raw/big');

  // Auto-discovery ignores unrelated gists and picks most recently updated LifeQuest gist
  const found = findLifeQuestGist([
    { id: 'other', updated_at: '2026-11-26T20:00:00Z', files: { 'notes.md': {} } },
    { id: 'older', updated_at: '2026-11-25T10:00:00Z', files: { [GIST_FILENAME]: {} } },
    { id: 'newest', updated_at: '2026-11-26T18:00:00Z', files: { [GIST_FILENAME]: {} } },
  ]);
  assert.equal(found.id, 'newest');
});

test('RPG Visual Themes unlock automatically by Hero Level or early Gold purchase', () => {
  const state = createDefaultState();
  const atLv1 = getThemeStatusList(state, 1);
  assert.equal(atLv1.filter((t) => t.unlocked).length, 1); // twilight only

  // At Lv.6 -> twilight (1), cyber (3), sakura (5) unlock automatically!
  const atLv6 = getThemeStatusList(state, 6);
  assert.deepEqual(
    atLv6.filter((t) => t.unlocked).map((t) => t.id),
    ['twilight', 'cyber', 'sakura']
  );

  // Buying dragon early unlocks it immediately
  state.unlockedThemes.push('dragon');
  state.activeTheme = 'dragon';
  const afterBuy = getThemeStatusList(state, 6);
  const dragon = afterBuy.find((t) => t.id === 'dragon');
  assert.equal(dragon.unlocked, true);
  assert.equal(dragon.active, true);
});

test('RPG Loot Chests, Equipment Buffs & Boss Raid drops work cleanly', () => {
  const state = createDefaultState();
  state.bossTrophies.push({ weekKey: 'week-2026-11-23', bossId: 'wyrm', bossName: 'Wyrm', bossIcon: '🐉', maxHp: 300, defeatedAt: Date.now() });
  for (let i = 0; i < 3; i++) {
    state.sessions.push({ id: `sp_${i}`, activityId: 'act_coding', durationSeconds: 1500, xpEarned: 300, multiplier: 1, timestamp: Date.now(), source: 'sprint', sprintBonus: true, note: '' });
  }
  const chests = getPendingLootChests(state, 6);
  // Lv.2, Lv.4, Lv.6 + 1 Boss chest + 1 3-Sprint chest = 5 chests!
  assert.equal(chests.length, 5);

  // Boss tier never rolls Common
  for (let i = 0; i < 20; i++) {
    const drop = rollLootChest({ tier: 'boss', ownedGearIds: [] });
    assert.notEqual(drop.gear.rarity, 'common');
  }

  // Equip Neon Cyberdeck (+9% Craft XP, +4% Sprint) + Merchant's Compass (+5% Gold) + Hearthfire Sigil (+6% Boss DMG)
  state.inventoryGear = [
    { id: 'g1', gearId: 'wpn_cyberdeck', obtainedAt: Date.now(), source: 'Test' },
    { id: 'g2', gearId: 'rel_compass', obtainedAt: Date.now(), source: 'Test' },
    { id: 'g3', gearId: 'aur_hearth_sigil', obtainedAt: Date.now(), source: 'Test' },
  ];
  state.equippedGear = { weapon: 'wpn_cyberdeck', armor: null, relic: 'rel_compass', aura: 'aur_hearth_sigil' };
  const bonuses = computeGearBonuses(state.equippedGear, state.inventoryGear);
  assert.equal(bonuses.attrXp.craft, 9);
  assert.equal(bonuses.sprintBonusPct, 4);
  assert.equal(bonuses.goldPct, 5);
  assert.equal(bonuses.bossDmgPct, 6);

  const baseXp = calculateSessionXp(1500, 1.0, true);
  const boostedXp = calculateSessionXp(1500, 1.0, true, { allXpPct: bonuses.allXpPct, attrXpPct: bonuses.attrXp.craft, sprintBonusPct: bonuses.sprintBonusPct });
  assert.ok(boostedXp > baseXp, 'Equipped gear boosts Sprint & Craft XP');
  assert.ok(calculateSessionGold(boostedXp, bonuses.goldPct) > calculateSessionGold(boostedXp, 0));
  assert.ok(calculateBossDamageForSession(1800, 1.0, bonuses.bossDmgPct).damage > calculateBossDamageForSession(1800, 1.0, 0).damage);
});

test('90-Day Heatmap & Streak Freeze Shield protect missed days and merge cleanly in Cloud Sync', () => {
  const now = new Date(2026, 10, 27, 12, 0, 0).getTime(); // Nov 27, 2026
  const dayMs = 86400000;
  // Active Nov 24 & Nov 25, missed Nov 26 (yesterday!)
  const sessions = [
    { id: 's1', activityId: 'act_coding', durationSeconds: 3600, xpEarned: 600, multiplier: 1, timestamp: now - 3 * dayMs },
    { id: 's2', activityId: 'act_coding', durationSeconds: 7500, xpEarned: 1250, multiplier: 1.1, timestamp: now - 2 * dayMs },
  ];

  // Without a shield, streak broke to 0 on Nov 27
  assert.equal(calculateStreak(sessions, now, []).current, 0);

  // With 1 available shield, auto-shield detects Nov 26 ('2026-11-26')!
  const toShield = computeAutoShieldDates(sessions, [], 1, now);
  assert.deepEqual(toShield, ['2026-11-26']);

  // Applying that shield restores the 3-day unbroken streak!
  const protectedStreak = calculateStreak(sessions, now, toShield);
  assert.equal(protectedStreak.current, 3);
  assert.equal(protectedStreak.shieldedCount, 1);

  // 90-Day Heatmap marks active days & shielded day accurately
  const heatmap = computeActivityHeatmap(sessions, toShield, 13, now);
  assert.equal(heatmap.activeDays, 2);
  assert.ok(heatmap.cells.some((c) => c.dateKey === '2026-11-26' && c.shielded === true));
  assert.ok(heatmap.cells.some((c) => c.dateKey === '2026-11-25' && c.level === 4));

  // Cloud Sync mergeStates unions gear, unlocked themes, opened chests & shields
  const pc = createDefaultState();
  pc.unlockedThemes = ['twilight', 'dragon'];
  pc.inventoryGear = [{ id: 'g1', gearId: 'wpn_cyberdeck', obtainedAt: now, source: 'PC' }];
  pc.shieldPurchases = [{ id: 'sh1', purchasedAt: now }];
  pc.shieldedDates = ['2026-11-26'];

  const phone = createDefaultState();
  phone.unlockedThemes = ['twilight', 'astral'];
  phone.inventoryGear = [{ id: 'g2', gearId: 'rel_gm_knight', obtainedAt: now, source: 'Phone' }];
  phone.openedChestMilestones = ['chest-lvl-2'];

  const merged = mergeStates(pc, phone);
  assert.ok(merged.unlockedThemes.includes('dragon') && merged.unlockedThemes.includes('astral'));
  assert.equal(merged.inventoryGear.length, 2);
  assert.ok(merged.openedChestMilestones.includes('chest-lvl-2'));
  assert.equal(merged.shieldPurchases.length, 1);
  assert.deepEqual(merged.shieldedDates, ['2026-11-26']);
});

test('Bonus XP/Gold ledger preserves offline multi-device claims and migrates legacy totals losslessly', () => {
  const now = Date.now();
  // Legacy state with scalar bonusXp/bonusGold migrates deterministically into legacy_bonus_baseline
  const legacyMigrated = sanitizeState({
    ...createDefaultState(),
    bonusXp: 350,
    bonusGold: 120,
    bonusLedger: undefined,
  });
  assert.equal(legacyMigrated.bonusLedger.length, 1);
  assert.equal(legacyMigrated.bonusLedger[0].id, 'legacy_bonus_baseline');
  assert.deepEqual(sumBonusLedger(legacyMigrated), { bonusXp: 350, bonusGold: 120 });

  // Multi-device offline claims: PC claims +150 XP / +30g, Phone claims +75 XP / +30g + 150g duplicate dismantle
  const pc = sanitizeState(legacyMigrated);
  pc.bonusLedger.push({ id: 'quest:dq-focus-2026-11-27', xp: 150, gold: 30, reason: 'Daily Quest', timestamp: now });
  pc.bonusXp = 500;
  pc.bonusGold = 150;

  const phone = sanitizeState(legacyMigrated);
  phone.bonusLedger.push(
    { id: 'quest:dq-warmup-2026-11-27', xp: 75, gold: 30, reason: 'Daily Quest', timestamp: now + 100 },
    { id: 'chest_dupe:chest-lvl-4', xp: 0, gold: 150, reason: 'Duplicate Dismantle', timestamp: now + 200 }
  );
  phone.bonusXp = 425;
  phone.bonusGold = 300;

  const merged = mergeStates(pc, phone);
  // All 3 unique entries + single shared baseline are kept with zero loss or double-counting!
  assert.equal(merged.bonusLedger.length, 4);
  assert.equal(merged.bonusXp, 350 + 150 + 75);
  assert.equal(merged.bonusGold, 120 + 30 + 30 + 150);
  const derived = computeDerivedState(merged, now);
  assert.equal(derived.gold.totalEarned, 330);
});

test('Streak Freeze Shield requires shield ownership before missed day ends (anti-loophole)', () => {
  const now = new Date(2026, 10, 27, 12, 0, 0).getTime(); // Nov 27, 2026 12:00
  const dayMs = 86400000;
  const sessions = [
    { id: 's1', activityId: 'act_coding', durationSeconds: 3600, xpEarned: 600, multiplier: 1, timestamp: now - 3 * dayMs },
    { id: 's2', activityId: 'act_coding', durationSeconds: 3600, xpEarned: 600, multiplier: 1, timestamp: now - 2 * dayMs },
  ];

  // Bought AFTER missing Nov 26 -> cannot retroactively patch Nov 26!
  const boughtTooLate = [{ id: 'sh_late', purchasedAt: now }];
  assert.deepEqual(computeAutoShieldDates(sessions, [], 1, now, boughtTooLate), []);

  // Bought BEFORE end of Nov 26 -> legitimately saves Nov 26!
  const boughtInTime = [{ id: 'sh_early', purchasedAt: new Date(2026, 10, 25, 18, 0, 0).getTime() }];
  assert.deepEqual(computeAutoShieldDates(sessions, [], 1, now, boughtInTime), ['2026-11-26']);
});

test('Effective gear XP blends 70/30 combo attributes and enforces the 30% gear XP cap', () => {
  const bonuses = {
    allXpPct: 4,
    attrXp: { craft: 10, mind: 10, body: 0, social: 0, rest: 0 },
    sprintBonusPct: 4,
    goldPct: 5,
    bossDmgPct: 6,
  };

  // Single-attribute activity gets full primary attribute bonus
  const craftOnly = getEffectiveGearXpBonus(bonuses, { attribute: 'craft', secondaryAttribute: null });
  assert.equal(craftOnly.attrXpPct, 10);
  assert.equal(craftOnly.allXpPct, 4);

  // Combo activity blends 70% Primary (craft: 10) + 30% Secondary (body: 0) = 7%
  const comboCraftBody = getEffectiveGearXpBonus(bonuses, { attribute: 'craft', secondaryAttribute: 'body' });
  assert.equal(comboCraftBody.attrXpPct, 7);

  // Combo activity with bonuses in secondary (body: 0, mind: 10) gets 30% of mind = 3%!
  const comboBodyMind = getEffectiveGearXpBonus(bonuses, { attribute: 'body', secondaryAttribute: 'mind' });
  assert.equal(comboBodyMind.attrXpPct, 3);

  // Gear XP boost caps cleanly at MAX_GEAR_XP_BONUS_PCT (30%) even with extreme bonuses
  const capped = getEffectiveGearXpBonus(
    { allXpPct: 25, attrXp: { craft: 20, mind: 0, body: 0, social: 0, rest: 0 }, sprintBonusPct: 10 },
    { attribute: 'craft', secondaryAttribute: null }
  );
  assert.equal(capped.allXpPct + capped.attrXpPct, MAX_GEAR_XP_BONUS_PCT);
  assert.equal(calculateSessionXp(600, 1.0, false, capped), Math.round(100 * (1 + MAX_GEAR_XP_BONUS_PCT / 100)));
});

test('Tavern reward refunds enforce the 10-minute grace window', () => {
  const now = new Date(2026, 10, 27, 15, 0, 0).getTime();
  assert.equal(isRedemptionRefundable({ id: 'r1', redeemedAt: now - 2 * 60 * 1000 }, now), true);
  assert.equal(isRedemptionRefundable({ id: 'r2', redeemedAt: now - REFUND_WINDOW_MS }, now), true);
  assert.equal(isRedemptionRefundable({ id: 'r3', redeemedAt: now - REFUND_WINDOW_MS - 1000 }, now), false);
});

test('Blacksmith Forge scales upgraded gear to Masterwork, tracks Shards, and merges monotonically', () => {
  const base = GEAR_MAP.wpn_cyberdeck; // +9% Craft XP · +4% Sprint
  const lv1 = getScaledGearItem(base, 1);
  const lv3 = getScaledGearItem(base, 3);
  assert.equal(lv1.displayName, 'Neon Cyberdeck +1');
  assert.ok(lv1.bonus.attrXp.craft > base.bonus.attrXp.craft);
  assert.ok(lv1.bonus.sprintBonusPct > base.bonus.sprintBonusPct);
  assert.equal(lv3.isMasterwork, true);
  assert.equal(lv3.displayName, 'Neon Cyberdeck ★');
  assert.ok(lv3.bonus.attrXp.craft > lv1.bonus.attrXp.craft);

  // Forge Shard balance counts Hero Levels (Lv.6 -> 3*3=9), Boss Trophies (+6), and shardLedger
  const state = createDefaultState();
  state.bossTrophies = [{ weekKey: 'week-2026-11-23', bossId: 'wyrm', bossName: 'Wyrm', bossIcon: '🐉', maxHp: 300, defeatedAt: Date.now() }];
  state.shardLedger = [
    { id: 'shard_dup_1', delta: 4, reason: 'Duplicate Rare', timestamp: 1000 },
    { id: 'shard_upg_1', delta: -3, reason: 'Tempered +1', timestamp: 2000 },
  ];
  const forge = computeForgeSummary(state, 6);
  assert.equal(forge.levelShards, 9);
  assert.equal(forge.bossShards, 6);
  assert.equal(forge.balance, 9 + 6 + 4 - 3);

  // Equipped upgraded gear flows into computeGearBonuses
  state.inventoryGear = [{ id: 'g1', gearId: 'wpn_cyberdeck', obtainedAt: 1000, source: 'Forge' }];
  state.equippedGear = { weapon: 'wpn_cyberdeck', armor: null, relic: null, aura: null };
  state.gearUpgrades = { wpn_cyberdeck: 3 };
  const bonuses = computeGearBonuses(state.equippedGear, state.inventoryGear, state.gearUpgrades);
  assert.equal(bonuses.attrXp.craft, lv3.bonus.attrXp.craft);
  assert.equal(bonuses.equippedItems.weapon.isMasterwork, true);

  // Duplicate roll returns duplicateShards
  const allIds = Object.keys(GEAR_MAP);
  const dupDrop = rollLootChest({ tier: 'boss', ownedGearIds: allIds });
  assert.equal(dupDrop.isDuplicate, true);
  assert.ok(dupDrop.duplicateShards >= 4);

  // Cloud sync merges upgrades monotonically & unions shardLedger
  const pc = createDefaultState();
  pc.gearUpgrades = { wpn_cyberdeck: 2 };
  pc.shardLedger = [{ id: 's_pc', delta: 4, reason: 'PC', timestamp: 100 }];
  const phone = createDefaultState();
  phone.gearUpgrades = { wpn_cyberdeck: 1, rel_compass: 3 };
  phone.shardLedger = [{ id: 's_ph', delta: 8, reason: 'Phone', timestamp: 200 }];
  const merged = mergeStates(pc, phone);
  assert.equal(merged.gearUpgrades.wpn_cyberdeck, 2);
  assert.equal(merged.gearUpgrades.rel_compass, 3);
  assert.equal(merged.shardLedger.length, 2);
});

test('Cozy Companion Pet evolves across 4 stages, reacts to focus state, and merges cleanly', () => {
  const unadopted = computeCompanionState(null, { totalSeconds: 0 });
  assert.equal(unadopted.adopted, false);

  const stage1 = computeCompanionState(
    { species: 'owl', name: 'Athena', petsCount: 2 },
    { totalSeconds: 1800, longestStreak: 1, streak: { current: 1 }, todaySeconds: 1800, isTimerRunning: false }
  );
  assert.equal(stage1.adopted, true);
  assert.equal(stage1.stage, 1);
  assert.equal(stage1.bonus.allXpPct, 2);
  assert.equal(stage1.mood, 'happy');

  const stage3 = computeCompanionState(
    { species: 'owl', name: 'Athena', petsCount: 9 },
    { totalSeconds: 16 * 3600, longestStreak: 4, streak: { current: 4 }, todaySeconds: 0, isTimerRunning: true }
  );
  assert.equal(stage3.stage, 3);
  assert.equal(stage3.bonus.allXpPct, 4);
  assert.equal(stage3.mood, 'focused');

  const stage4ByStreak = computeCompanionState(
    { species: 'drake', name: 'Cinder', petsCount: 15 },
    { totalSeconds: 10 * 3600, longestStreak: 14, streak: { current: 14 }, todaySeconds: 600, isTimerRunning: false }
  );
  assert.equal(stage4ByStreak.stage, 4);
  assert.equal(stage4ByStreak.bonus.bossDmgPct, 12);

  // Companion merge never wipes an adopted pet with an empty local slot
  const emptyLocal = createDefaultState();
  const remoteWithPet = createDefaultState();
  remoteWithPet.companion = { species: 'cat', name: 'Mochi', adoptedAt: 5000, petsCount: 7, updatedAt: 6000 };
  const merged = mergeStates(emptyLocal, remoteWithPet);
  assert.equal(merged.companion.species, 'cat');
  assert.equal(merged.companion.name, 'Mochi');
  assert.equal(merged.companion.petsCount, 7);
});

test('Story Campaigns track chapters, drop Epic+ Victory Chests, and union progress across devices', () => {
  const now = Date.now();
  const state = createDefaultState();
  state.campaigns = [
    {
      id: 'camp_cert',
      title: 'Security Cert Arc',
      icon: '🎓',
      color: '#818cf8',
      description: 'Finish all modules',
      linkedActivityId: 'act_reading',
      chapters: [
        { id: 'c1', title: 'Basics', completed: true, completedAt: now - 3000 },
        { id: 'c2', title: 'Labs', completed: true, completedAt: now - 2000 },
        { id: 'c3', title: 'Exam', completed: true, completedAt: now - 1000 },
      ],
      claimedVictory: false,
      completedAt: 0,
      createdAt: now - 5000,
      updatedAt: now - 1000,
    },
  ];

  const beforeClaim = computeCampaignSummary(state.campaigns);
  assert.equal(beforeClaim.claimableCount, 1);
  assert.equal(beforeClaim.items[0].canClaimVictory, true);
  assert.equal(beforeClaim.items[0].earnsEpicChest, true);

  // After claiming victory, a guaranteed Epic+ campaign chest appears in pendingChests
  state.campaigns[0].claimedVictory = true;
  const chests = getPendingLootChests(state, 1);
  const campChest = chests.find((c) => c.id === 'chest-camp-camp_cert');
  assert.ok(campChest && campChest.tier === 'campaign');

  // Campaign tier chest NEVER rolls Common or Rare
  for (let i = 0; i < 25; i++) {
    const drop = rollLootChest({ tier: 'campaign', ownedGearIds: [] });
    assert.ok(drop.gear.rarity === 'epic' || drop.gear.rarity === 'legendary');
  }

  // Multi-device merge unions chapter completion from PC and Phone
  const pc = createDefaultState();
  pc.campaigns = [
    {
      id: 'camp_sync',
      title: 'Portfolio',
      icon: '💻',
      color: '#fbbf24',
      description: '',
      linkedActivityId: null,
      chapters: [
        { id: 'ch1', title: 'Step 1', completed: true, completedAt: now },
        { id: 'ch2', title: 'Step 2', completed: false, completedAt: 0 },
        { id: 'ch3', title: 'Step 3', completed: false, completedAt: 0 },
      ],
      claimedVictory: false,
      completedAt: 0,
      createdAt: now - 1000,
      updatedAt: now,
    },
  ];
  const phone = createDefaultState();
  phone.campaigns = [
    {
      ...pc.campaigns[0],
      chapters: [
        { id: 'ch1', title: 'Step 1', completed: false, completedAt: 0 },
        { id: 'ch2', title: 'Step 2', completed: true, completedAt: now + 500 },
        { id: 'ch3', title: 'Step 3', completed: false, completedAt: 0 },
      ],
      updatedAt: now + 500,
    },
  ];
  const merged = mergeStates(pc, phone);
  assert.equal(merged.campaigns.length, 1);
  assert.equal(merged.campaigns[0].chapters[0].completed, true);
  assert.equal(merged.campaigns[0].chapters[1].completed, true);
  assert.equal(merged.campaigns[0].chapters[2].completed, false);
});
