/**
 * LifeQuest Application Controller
 */

import {
  BOSS_BOUNTY_GOLD,
  BOSS_BOUNTY_XP,
  calculateBossDamageForSession,
  calculateSessionGold,
  calculateSessionXp,
  computeDerivedState,
  formatDurationShort,
  formatStopwatch,
  getLocalDateKey,
  getRewardCooldownInfo,
} from './rpgEngine.js';
import {
  createDefaultState,
  createSampleAdventureState,
  exportStateToJson,
  generateId,
  loadActiveTimer,
  loadState,
  loadSyncMeta,
  parseImportedJson,
  sanitizeState,
  saveActiveTimer,
  saveState,
  saveSyncMeta,
} from './storage.js';
import {
  apiLoginVault,
  apiLogoutVault,
  apiPullVault,
  apiPushVault,
  apiRegisterVault,
  mergeActiveTimers,
  mergeStates,
} from './sync.js';
import { sound } from './sound.js';
import { launchConfetti } from './confetti.js';
import {
  initAmbientCanvas,
  initInteractiveCardEffects,
  isFxEnabled,
  setFxEnabled,
  spawnFloatingText,
  triggerBossHitEffect,
  triggerButtonRipple,
} from './fx.js';
import {
  esc,
  renderActiveTimerBar,
  renderActivitiesView,
  renderDashboardView,
  renderModal,
  renderQuestsAndBadgesView,
  renderShopView,
  renderStatsView,
} from './ui.js';

let state = loadState();
let activeTimer = loadActiveTimer();
let syncMeta = loadSyncMeta();
let modalState = null;
let timerInterval = null;
let pushDebounceTimer = null;
let lastClickPos = { x: null, y: null };

const syncRuntime = {
  status: 'idle', // 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
  error: '',
  inFlight: false,
};

const uiState = {
  tab: 'dashboard', // 'dashboard' | 'activities' | 'stats' | 'quests' | 'shop'
  dashSort: 'recent',
  attrFilter: 'all',
  activitiesSort: 'level',
  statsTimeframe: 'week',
  historyActivityFilter: 'all',
  sprintPresetMin: 25,
  sprintActivityId: null,
};

// Ensure activeTimer still refers to an existing activity
if (activeTimer && !state.activities.some((a) => a.id === activeTimer.activityId)) {
  activeTimer = null;
  saveActiveTimer(null);
}

function getSyncInfo() {
  return {
    connected: Boolean(syncMeta.token && syncMeta.vaultId),
    vaultId: syncMeta.vaultId,
    version: syncMeta.version,
    lastSyncedAt: syncMeta.lastSyncedAt,
    status: syncRuntime.status,
    error: syncRuntime.error,
  };
}

function updateSyncButtonUi() {
  const btn = document.getElementById('sync-status-btn');
  if (!btn) return;
  const connected = Boolean(syncMeta.token && syncMeta.vaultId);
  btn.classList.toggle('is-connected', connected);

  if (!connected) {
    btn.innerHTML = '☁️ Sync';
    btn.title = 'Set up PC ↔ Phone Cloud Sync';
    return;
  }

  if (syncRuntime.status === 'syncing') {
    btn.innerHTML = '<span class="sync-dot is-busy"></span> Syncing…';
    btn.title = `Syncing vault "${syncMeta.vaultId}"`;
  } else if (syncRuntime.status === 'error' || syncRuntime.status === 'offline') {
    btn.innerHTML = '<span class="sync-dot is-warn"></span> Retry';
    btn.title = syncRuntime.error || 'Offline — click to retry sync';
  } else {
    btn.innerHTML = '<span class="sync-dot is-ok"></span> Synced';
    btn.title = `Cloud Sync active (${syncMeta.vaultId}) — click to manage`;
  }
}

function persistState({ deletedId = null } = {}) {
  if (deletedId) {
    if (!state.deletedIds || typeof state.deletedIds !== 'object') state.deletedIds = {};
    state.deletedIds[deletedId] = Date.now();
  }
  state.updatedAt = Date.now();
  saveState(state);

  if (syncMeta.token) {
    syncMeta.dirty = true;
    saveSyncMeta(syncMeta);
    scheduleCloudPush(350);
  }
}

function persistTimer(nextTimer) {
  activeTimer = nextTimer;
  syncMeta.activeTimerUpdatedAt = Date.now();
  saveActiveTimer(activeTimer);
  if (syncMeta.token) {
    syncMeta.dirty = true;
  }
  saveSyncMeta(syncMeta);
  if (syncMeta.token) {
    scheduleCloudPush(200);
  }
}

function scheduleCloudPush(delayMs = 350) {
  if (!syncMeta.token) return;
  if (pushDebounceTimer) clearTimeout(pushDebounceTimer);
  pushDebounceTimer = setTimeout(() => {
    pushDebounceTimer = null;
    syncWithCloud({ forcePull: false });
  }, delayMs);
}

function applyRemoteTimer(remoteTimer, remoteUpdatedAt) {
  const merged = mergeActiveTimers(
    activeTimer,
    syncMeta.activeTimerUpdatedAt,
    remoteTimer,
    remoteUpdatedAt
  );
  const validTimer =
    merged.activeTimer && state.activities.some((a) => a.id === merged.activeTimer.activityId)
      ? merged.activeTimer
      : null;

  const changed = JSON.stringify(activeTimer) !== JSON.stringify(validTimer);
  activeTimer = validTimer;
  syncMeta.activeTimerUpdatedAt = merged.activeTimerUpdatedAt;
  saveActiveTimer(activeTimer);
  if (changed) {
    ensureTimerLoop();
  }
  return changed;
}

async function syncWithCloud({ forcePull = false, manual = false } = {}) {
  if (!syncMeta.token || !syncMeta.vaultId) return;
  if (syncRuntime.inFlight) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    syncRuntime.status = 'offline';
    syncRuntime.error = 'Device is offline. Changes will auto-sync when reconnected.';
    updateSyncButtonUi();
    return;
  }

  syncRuntime.inFlight = true;
  syncRuntime.status = 'syncing';
  syncRuntime.error = '';
  updateSyncButtonUi();

  try {
    if (syncMeta.dirty) {
      let res = await apiPushVault({
        token: syncMeta.token,
        baseVersion: syncMeta.version,
        state,
        activeTimer,
        activeTimerUpdatedAt: syncMeta.activeTimerUpdatedAt,
      });

      if (res.status === 409 && res.data && res.data.conflict) {
        // Another device updated first — merge both cleanly and retry push!
        state = mergeStates(state, res.data.state);
        saveState(state);
        applyRemoteTimer(res.data.activeTimer, res.data.activeTimerUpdatedAt);
        syncMeta.version = Number(res.data.version) || syncMeta.version;

        res = await apiPushVault({
          token: syncMeta.token,
          baseVersion: syncMeta.version,
          state,
          activeTimer,
          activeTimerUpdatedAt: syncMeta.activeTimerUpdatedAt,
        });
      }

      if (res.status === 401) {
        handleSyncSessionExpired();
        return;
      }

      if (!res.data || !res.data.ok) {
        throw new Error((res.data && res.data.error) || 'Could not push progress to cloud.');
      }

      syncMeta.version = Number(res.data.version) || syncMeta.version;
      syncMeta.dirty = false;
      syncMeta.lastSyncedAt = Date.now();
      saveSyncMeta(syncMeta);
      syncRuntime.status = 'synced';
      if (manual) {
        showToast({ icon: '☁️', title: 'Synced to Cloud!', subtitle: `Vault "${syncMeta.vaultId}" is up to date.` });
      }
      render();
      return;
    }

    if (forcePull || !syncMeta.dirty) {
      const res = await apiPullVault(syncMeta.token);
      if (res.status === 401) {
        handleSyncSessionExpired();
        return;
      }
      if (!res.data || !res.data.ok) {
        throw new Error((res.data && res.data.error) || 'Could not pull cloud state.');
      }

      const remoteVersion = Number(res.data.version) || 0;
      const remoteTimerTs = Number(res.data.activeTimerUpdatedAt) || 0;
      const needsApply =
        remoteVersion !== syncMeta.version || remoteTimerTs > syncMeta.activeTimerUpdatedAt;

      syncMeta.lastSyncedAt = Date.now();
      if (needsApply) {
        const isCleanLocal = state.sessions.length === 0 && (state.updatedAt || 0) === 0;
        if (isCleanLocal) {
          const keepSettings = { ...state.settings };
          state = sanitizeState(res.data.state);
          state.settings = keepSettings;
        } else {
          state = mergeStates(state, res.data.state);
        }
        saveState(state);
        applyRemoteTimer(res.data.activeTimer, remoteTimerTs);
        syncMeta.version = remoteVersion;
      }
      saveSyncMeta(syncMeta);
      syncRuntime.status = 'synced';

      if (manual) {
        showToast({ icon: '☁️', title: 'Synced!', subtitle: `Up to date with vault "${syncMeta.vaultId}".` });
      }
      if (needsApply || manual || (modalState && modalState.type === 'sync')) {
        render();
      } else {
        updateSyncButtonUi();
      }
    }
  } catch (err) {
    syncRuntime.status = 'error';
    syncRuntime.error = err.message || 'Cloud sync failed.';
    if (manual) {
      showToast({ icon: '⚠️', title: 'Sync failed', subtitle: syncRuntime.error });
    }
    updateSyncButtonUi();
    if (modalState && modalState.type === 'sync') {
      render();
    }
  } finally {
    syncRuntime.inFlight = false;
    updateSyncButtonUi();
  }
}

function handleSyncSessionExpired() {
  syncMeta = {
    vaultId: null,
    token: null,
    version: 0,
    lastSyncedAt: 0,
    activeTimerUpdatedAt: syncMeta.activeTimerUpdatedAt,
    dirty: false,
  };
  saveSyncMeta(syncMeta);
  syncRuntime.status = 'idle';
  syncRuntime.error = 'Your sync session expired — please sign in again.';
  showToast({ icon: '☁️', title: 'Cloud Sync signed out', subtitle: 'Sign in again to resume syncing.' });
  render();
}

function getTimerElapsedSeconds(timer = activeTimer) {
  if (!timer) return 0;
  const runningMs = timer.isRunning && timer.startedAt ? Math.max(0, Date.now() - timer.startedAt) : 0;
  return Math.floor((timer.accumulatedMs + runningMs) / 1000);
}

function applyThemeAndAudio() {
  document.documentElement.setAttribute('data-theme', state.settings.theme || 'dark');
  const fxOn = state.settings.fxEnabled !== false;
  document.documentElement.classList.toggle('fx-off', !fxOn);
  setFxEnabled(fxOn);
  sound.setEnabled(state.settings.soundEnabled);

  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) {
    themeBtn.textContent = state.settings.theme === 'dark' ? '☀️' : '🌙';
    themeBtn.title = state.settings.theme === 'dark' ? 'Switch to Cozy Light Mode' : 'Switch to Cozy Dark Mode';
  }
  const soundBtn = document.getElementById('sound-toggle-btn');
  if (soundBtn) {
    soundBtn.textContent = state.settings.soundEnabled ? '🔊' : '🔇';
    soundBtn.title = state.settings.soundEnabled ? 'Mute sound effects' : 'Enable sound effects';
  }
}

function showToast({ icon = '✨', title, subtitle = '', tone = 'default' }) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${tone}`;
  toast.innerHTML = `
    <span class="toast-icon">${esc(icon)}</span>
    <div class="toast-body">
      <div class="toast-title">${esc(title)}</div>
      ${subtitle ? `<div class="toast-sub">${esc(subtitle)}</div>` : ''}
    </div>
  `;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('is-visible'));

  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 260);
  }, 3800);
}

function checkAndUnlockAchievements(derived) {
  const newlyUnlocked = [];
  const now = Date.now();
  for (const ach of derived.achievements) {
    if (ach.unlocked && !state.unlockedAchievements[ach.id]) {
      state.unlockedAchievements[ach.id] = now;
      newlyUnlocked.push(ach);
    }
  }
  if (newlyUnlocked.length > 0) {
    persistState();
    sound.playAchievement();
    newlyUnlocked.forEach((ach, idx) => {
      const bonusGold = Math.round(ach.xpReward * 0.3);
      setTimeout(() => {
        showToast({
          icon: ach.icon,
          title: `Badge Unlocked: ${ach.title}!`,
          subtitle: `+${ach.xpReward} XP · +${bonusGold}g`,
          tone: 'gold',
        });
      }, idx * 450);
    });
  }
  return newlyUnlocked;
}

function recordSession({ activityId, durationSeconds, source = 'manual', note = '', sprintBonus = false }) {
  const act = state.activities.find((a) => a.id === activityId);
  if (!act) return;

  const safeSeconds = Math.max(5, Math.round(durationSeconds));
  const before = computeDerivedState(state);
  const beforeAct = before.activityStats.find((a) => a.id === activityId);
  const beforeActLevel = beforeAct ? beforeAct.levelInfo.level : 1;
  const beforePlayerLevel = before.playerLevelInfo.level;
  const wasBossDefeated = before.weeklyBoss.defeated;

  const multiplier = before.streak.multiplier;
  const xpEarned = calculateSessionXp(safeSeconds, multiplier, sprintBonus);
  const goldEarned = calculateSessionGold(xpEarned);
  const bossHit = calculateBossDamageForSession(safeSeconds, multiplier);

  const session = {
    id: generateId('sess'),
    activityId,
    durationSeconds: safeSeconds,
    xpEarned,
    multiplier,
    timestamp: Date.now(),
    source,
    sprintBonus: Boolean(sprintBonus),
    note: note.trim().slice(0, 120),
  };

  state.sessions.push(session);
  persistState();

  let after = computeDerivedState(state);
  const newBadges = checkAndUnlockAchievements(after);
  if (newBadges.length > 0) {
    after = computeDerivedState(state);
  }

  const afterAct = after.activityStats.find((a) => a.id === activityId);
  const afterActLevel = afterAct ? afterAct.levelInfo.level : beforeActLevel;
  const afterPlayerLevel = after.playerLevelInfo.level;
  const justDefeatedBoss = !wasBossDefeated && after.weeklyBoss.defeated;

  const critText =
    bossHit.critType === 'mega'
      ? ` · 💥 MEGA CRIT -${bossHit.damage} Boss HP!`
      : bossHit.critType === 'focus'
        ? ` · 💥 Focus Crit -${bossHit.damage} Boss HP!`
        : ` · ⚔️ -${bossHit.damage} Boss HP`;

  if (afterActLevel > beforeActLevel) {
    sound.playLevelUp();
    if (isFxEnabled()) launchConfetti({ style: 'levelup', count: 120, durationMs: 2500 });
    modalState = {
      type: 'levelup',
      payload: {
        icon: act.icon,
        title: act.name,
        oldLevel: beforeActLevel,
        newLevel: afterActLevel,
        rankTitle: afterAct.levelInfo.rankTitle,
        subtitle:
          afterPlayerLevel > beforePlayerLevel
            ? `Plus your Hero leveled up to Level ${afterPlayerLevel} (${after.playerLevelInfo.rankTitle})! Earned +${goldEarned}g.`
            : `Earned +${xpEarned} XP & +${goldEarned}g from ${formatDurationShort(safeSeconds)}.`,
      },
    };
  } else if (afterPlayerLevel > beforePlayerLevel) {
    sound.playLevelUp();
    if (isFxEnabled()) launchConfetti({ style: 'levelup', count: 120, durationMs: 2500 });
    modalState = {
      type: 'levelup',
      payload: {
        icon: state.profile.avatar,
        title: `${state.profile.name} (Hero Level)`,
        oldLevel: beforePlayerLevel,
        newLevel: afterPlayerLevel,
        rankTitle: after.playerLevelInfo.rankTitle,
        subtitle: `Earned +${goldEarned}g — your consistent adventures paid off!`,
      },
    };
  } else {
    sound.playXpGain();
    if (isFxEnabled()) {
      launchConfetti({
        style: 'spark',
        count: 16,
        durationMs: 680,
        originX: lastClickPos.x,
        originY: lastClickPos.y,
      });
    }
    showToast({
      icon: act.icon,
      title: `+${xpEarned} XP · +${goldEarned}g · ${act.name}${sprintBonus ? ' ⚡ +20%' : ''}`,
      subtitle: `${formatDurationShort(safeSeconds)} logged${critText}`,
    });
  }

  // Floating RPG loot & boss combat numbers
  spawnFloatingText({ text: `+${xpEarned} XP`, x: lastClickPos.x, y: lastClickPos.y, tone: 'xp' });
  spawnFloatingText({
    text: `+${goldEarned}g 🪙`,
    x: lastClickPos.x,
    y: lastClickPos.y ? lastClickPos.y - 16 : null,
    tone: 'gold',
    delayMs: 130,
  });
  if (!wasBossDefeated && bossHit.damage > 0) {
    spawnFloatingText({
      text: bossHit.critType ? `💥 CRIT! -${bossHit.damage} HP` : `⚔️ -${bossHit.damage} HP`,
      x: lastClickPos.x,
      y: lastClickPos.y ? lastClickPos.y - 30 : null,
      tone: bossHit.critType ? 'crit' : 'boss',
      delayMs: 260,
      big: Boolean(bossHit.critType),
    });
  }

  if (justDefeatedBoss) {
    setTimeout(() => {
      sound.playBossVictory();
      if (isFxEnabled()) launchConfetti({ style: 'boss', count: 145, durationMs: 2700 });
      showToast({
        icon: after.weeklyBoss.boss.icon,
        title: `Weekly Boss Vanquished: ${after.weeklyBoss.boss.name}!`,
        subtitle: `Claim +${BOSS_BOUNTY_XP} XP & +${BOSS_BOUNTY_GOLD}g in the Boss Arena!`,
        tone: 'gold',
      });
    }, 500);
  }

  render();
  if (!wasBossDefeated && bossHit.damage > 0) {
    triggerBossHitEffect(Boolean(bossHit.critType));
  }
}

function startTimerForActivity(activityId, { mode = 'stopwatch', targetMinutes = 25 } = {}) {
  const act = state.activities.find((a) => a.id === activityId);
  if (!act) return;

  // If another timer is running with >= 5 seconds, save it smoothly before switching
  if (activeTimer && activeTimer.activityId !== activityId) {
    const prevElapsed = getTimerElapsedSeconds(activeTimer);
    const prevId = activeTimer.activityId;
    const prevNote = activeTimer.note || '';
    const prevSprint = activeTimer.mode === 'sprint';
    const prevBonus = prevSprint && prevElapsed >= (activeTimer.targetSeconds || 1500);
    persistTimer(null);
    if (prevElapsed >= 5) {
      recordSession({
        activityId: prevId,
        durationSeconds: prevElapsed,
        source: prevSprint ? 'sprint' : 'timer',
        note: prevNote,
        sprintBonus: prevBonus,
      });
    }
  }

  const targetSeconds = Math.max(60, Math.round((Number(targetMinutes) || 25) * 60));
  persistTimer({
    activityId,
    isRunning: true,
    startedAt: Date.now(),
    accumulatedMs: 0,
    mode: mode === 'sprint' ? 'sprint' : 'stopwatch',
    targetSeconds,
    sprintCompleted: false,
    note: '',
  });
  sound.playStart();
  if (mode === 'sprint') {
    showToast({
      icon: '⚡',
      title: `${Math.round(targetSeconds / 60)}m Focus Sprint Started!`,
      subtitle: `Finish the countdown on ${act.name} for +20% bonus XP & Gold.`,
    });
  }
  ensureTimerLoop();
  render();
}

function setActiveTimerMode(mode, targetMinutes = 25) {
  if (!activeTimer) return;
  const elapsedSec = getTimerElapsedSeconds(activeTimer);
  const targetSeconds = Math.max(60, Math.round((Number(targetMinutes) || 25) * 60));
  const nextTimer = {
    ...activeTimer,
    mode: mode === 'sprint' ? 'sprint' : 'stopwatch',
    targetSeconds: mode === 'sprint' ? targetSeconds : activeTimer.targetSeconds || 1500,
    sprintCompleted: mode === 'sprint' ? elapsedSec >= targetSeconds : false,
  };
  persistTimer(nextTimer);
  ensureTimerLoop();
  render();
}

function toggleTimerPause() {
  if (!activeTimer) return;
  const nextTimer = { ...activeTimer };
  if (nextTimer.isRunning) {
    const delta = nextTimer.startedAt ? Math.max(0, Date.now() - nextTimer.startedAt) : 0;
    nextTimer.accumulatedMs += delta;
    nextTimer.startedAt = null;
    nextTimer.isRunning = false;
    sound.playPause();
  } else {
    nextTimer.startedAt = Date.now();
    nextTimer.isRunning = true;
    sound.playStart();
  }
  persistTimer(nextTimer);
  ensureTimerLoop();
  render();
}

function finishActiveTimer() {
  if (!activeTimer) return;
  const elapsedSec = getTimerElapsedSeconds(activeTimer);
  const actId = activeTimer.activityId;
  const note = (activeTimer.note || '').trim();
  const isSprint = activeTimer.mode === 'sprint';
  const targetSec = Math.max(60, Number(activeTimer.targetSeconds) || 1500);
  const sprintBonus = isSprint && elapsedSec >= targetSec;

  if (elapsedSec < 5) {
    showToast({
      icon: '⏱️',
      title: 'Keep going a tiny bit longer!',
      subtitle: 'Track at least 5 seconds to claim XP (or click ✕ to discard).',
    });
    return;
  }

  persistTimer(null);
  stopTimerLoop();
  document.title = 'LifeQuest — Gamify Your Life';

  recordSession({
    activityId: actId,
    durationSeconds: elapsedSec,
    source: isSprint ? 'sprint' : 'timer',
    note,
    sprintBonus,
  });
}

function discardActiveTimer() {
  if (!activeTimer) return;
  persistTimer(null);
  stopTimerLoop();
  document.title = 'LifeQuest — Gamify Your Life';
  showToast({ icon: '🗑️', title: 'Timer discarded' });
  render();
}

function updateLiveTimerTick() {
  if (!activeTimer) {
    document.title = 'LifeQuest — Gamify Your Life';
    stopTimerLoop();
    return;
  }
  const elapsedSec = getTimerElapsedSeconds(activeTimer);
  const act = state.activities.find((a) => a.id === activeTimer.activityId);
  const isSprint = activeTimer.mode === 'sprint';
  const targetSec = Math.max(60, Number(activeTimer.targetSeconds) || 1500);
  const sprintDone = isSprint && elapsedSec >= targetSec;

  // Trigger celebratory chime & toast the exact moment a Focus Sprint completes!
  if (sprintDone && !activeTimer.sprintCompleted && activeTimer.isRunning) {
    activeTimer.sprintCompleted = true;
    saveActiveTimer(activeTimer);
    sound.playSprintComplete();
    if (isFxEnabled()) {
      launchConfetti({ style: 'coins', count: 55, durationMs: 1800 });
    }
    spawnFloatingText({ text: '⚡ SPRINT COMPLETE! +20%', tone: 'gold', big: true });
    showToast({
      icon: '⚡',
      title: 'Focus Sprint Complete! (+20% Bonus)',
      subtitle: 'Hit "Finish & Claim" now or keep going in overtime!',
      tone: 'gold',
    });
    const statusEl = document.getElementById('live-timer-status');
    if (statusEl) statusEl.textContent = '🎉 Sprint Complete! +20% Bonus XP & Gold unlocked';
    const barEl = document.querySelector('.active-timer-bar');
    if (barEl) barEl.classList.add('is-sprint-done');
  }

  const digitsEl = document.getElementById('live-timer-digits');
  const xpEl = document.getElementById('live-timer-xp');
  const barFillEl = document.getElementById('live-sprint-bar-fill');
  const sprintLabelEl = document.getElementById('live-sprint-label');
  const sprintPctEl = document.getElementById('live-sprint-pct');

  const remainingSec = Math.max(0, targetSec - elapsedSec);
  const overtimeSec = Math.max(0, elapsedSec - targetSec);
  const displayDigits = isSprint
    ? sprintDone
      ? `+${formatStopwatch(overtimeSec)}`
      : formatStopwatch(remainingSec)
    : formatStopwatch(elapsedSec);

  if (digitsEl) {
    digitsEl.textContent = displayDigits;
  }
  if (isSprint) {
    const rawPct = Math.min(100, (elapsedSec / targetSec) * 100);
    const displayPct = Math.floor(rawPct);
    const barWidth =
      rawPct === 0 && activeTimer.isRunning
        ? 1.5
        : Number(Math.max(rawPct > 0 ? 1.5 : 0, rawPct).toFixed(2));
    if (barFillEl) {
      barFillEl.style.width = `${barWidth}%`;
    }
    if (sprintPctEl) {
      sprintPctEl.textContent = `${displayPct}%`;
    }
    if (sprintLabelEl) {
      sprintLabelEl.textContent = sprintDone
        ? '🎉 Sprint Target Reached! +20% Bonus XP & Gold Locked In'
        : `⚡ Live Sprint Bar · ${formatStopwatch(elapsedSec)} / ${formatStopwatch(targetSec)}`;
    }
  }
  if (xpEl) {
    const derived = computeDerivedState(state);
    const liveXp = calculateSessionXp(elapsedSec, derived.streak.multiplier, sprintDone);
    const liveGold = calculateSessionGold(liveXp);
    xpEl.textContent = `+${liveXp} XP · +${liveGold}g${sprintDone ? ' ⚡' : ''}`;
  }
  if (act) {
    const prefix = activeTimer.isRunning ? (isSprint ? '⚡' : '▶') : '⏸';
    document.title = `${prefix} ${displayDigits} · ${act.name} | LifeQuest`;
  }
}

function ensureTimerLoop() {
  stopTimerLoop();
  if (activeTimer && activeTimer.isRunning) {
    updateLiveTimerTick();
    timerInterval = setInterval(updateLiveTimerTick, 1000);
  } else {
    updateLiveTimerTick();
  }
}

function stopTimerLoop() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function claimDailyQuest(questId) {
  const before = computeDerivedState(state);
  const quest = before.dailyQuests.find((q) => q.id === questId);
  if (!quest || !quest.completed || quest.claimed) return;

  if (quest.auto) {
    state.claimedQuests.push(quest.id);
  } else {
    const cq = state.customQuests.find((c) => c.id === quest.id);
    if (cq) cq.claimed = true;
    state.claimedQuests.push(quest.id);
  }
  const goldReward = Math.round(quest.xpReward * 0.3);
  state.bonusXp = (state.bonusXp || 0) + quest.xpReward;
  state.bonusGold = (state.bonusGold || 0) + goldReward;
  persistState();

  let after = computeDerivedState(state);
  const newBadges = checkAndUnlockAchievements(after);
  if (newBadges.length > 0) after = computeDerivedState(state);

  if (isFxEnabled()) {
    launchConfetti({
      style: 'coins',
      count: 68,
      durationMs: 1900,
      originX: lastClickPos.x,
      originY: lastClickPos.y,
    });
  }
  spawnFloatingText({ text: `+${quest.xpReward} XP`, x: lastClickPos.x, y: lastClickPos.y, tone: 'xp' });
  spawnFloatingText({
    text: `+${goldReward}g 🪙`,
    x: lastClickPos.x,
    y: lastClickPos.y ? lastClickPos.y - 18 : null,
    tone: 'gold',
    delayMs: 140,
  });

  if (after.playerLevelInfo.level > before.playerLevelInfo.level) {
    sound.playLevelUp();
    modalState = {
      type: 'levelup',
      payload: {
        icon: state.profile.avatar,
        title: `${state.profile.name} (Hero Level)`,
        oldLevel: before.playerLevelInfo.level,
        newLevel: after.playerLevelInfo.level,
        rankTitle: after.playerLevelInfo.rankTitle,
        subtitle: `Quest "${quest.title}" awarded +${quest.xpReward} XP & +${goldReward}g!`,
      },
    };
  } else {
    sound.playQuestClaim();
    showToast({
      icon: '📜',
      title: `Quest Complete: ${quest.title}`,
      subtitle: `+${quest.xpReward} XP · +${goldReward}g claimed!`,
      tone: 'gold',
    });
  }

  render();
}

function claimWeeklyBoss() {
  const before = computeDerivedState(state);
  const wb = before.weeklyBoss;
  if (!wb.defeated || wb.claimed) return;

  if (!Array.isArray(state.claimedBossWeeks)) state.claimedBossWeeks = [];
  if (!Array.isArray(state.bossTrophies)) state.bossTrophies = [];

  state.claimedBossWeeks.push(wb.weekKey);
  state.bossTrophies.push({
    weekKey: wb.weekKey,
    bossId: wb.boss.id,
    bossName: wb.boss.name,
    bossIcon: wb.boss.icon,
    maxHp: wb.maxHp,
    defeatedAt: Date.now(),
  });
  state.bonusXp = (state.bonusXp || 0) + BOSS_BOUNTY_XP;
  persistState();

  let after = computeDerivedState(state);
  const newBadges = checkAndUnlockAchievements(after);
  if (newBadges.length > 0) after = computeDerivedState(state);

  sound.playBossVictory();
  if (isFxEnabled()) launchConfetti({ style: 'boss', count: 150, durationMs: 2800 });
  spawnFloatingText({ text: '🏆 BOSS SLAIN!', tone: 'crit', big: true });
  spawnFloatingText({ text: `+${BOSS_BOUNTY_XP} XP · +${BOSS_BOUNTY_GOLD}g`, tone: 'gold', delayMs: 180, big: true });

  if (after.playerLevelInfo.level > before.playerLevelInfo.level) {
    modalState = {
      type: 'levelup',
      payload: {
        icon: wb.boss.icon,
        title: `${wb.boss.name} Vanquished!`,
        oldLevel: before.playerLevelInfo.level,
        newLevel: after.playerLevelInfo.level,
        rankTitle: after.playerLevelInfo.rankTitle,
        subtitle: `Claimed Boss Trophy, +${BOSS_BOUNTY_XP} XP & +${BOSS_BOUNTY_GOLD}g!`,
      },
    };
  } else {
    showToast({
      icon: '🏆',
      title: `Boss Trophy Claimed: ${wb.boss.name}!`,
      subtitle: `+${BOSS_BOUNTY_XP} XP · +${BOSS_BOUNTY_GOLD} Gold added!`,
      tone: 'gold',
    });
  }

  render();
}

function completeCustomQuest(questId) {
  const cq = state.customQuests.find((c) => c.id === questId);
  if (!cq) return;
  cq.completed = true;
  persistState();
  claimDailyQuest(questId);
}

function render() {
  applyThemeAndAudio();
  updateSyncButtonUi();
  const derived = computeDerivedState(state);
  const activityMap = new Map(derived.activityStats.map((a) => [a.id, a]));

  // Active navigation button highlighting
  document.querySelectorAll('[data-nav-tab]').forEach((btn) => {
    const isActive = btn.dataset.navTab === uiState.tab;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  // Badge on Quests & Boss nav if claimable quests or boss bounty exist
  const readyQuestsCount = derived.dailyQuests.filter((q) => q.completed && !q.claimed).length;
  const readyBossCount = derived.weeklyBoss.defeated && !derived.weeklyBoss.claimed ? 1 : 0;
  const readyTotal = readyQuestsCount + readyBossCount;
  const questsBadge = document.getElementById('nav-quests-badge');
  if (questsBadge) {
    questsBadge.textContent = readyTotal > 0 ? String(readyTotal) : '';
    questsBadge.hidden = readyTotal === 0;
  }

  // Live Gold balance pill in nav bar
  const navGoldPill = document.getElementById('nav-gold-pill');
  if (navGoldPill) {
    navGoldPill.textContent = `${derived.gold.balance.toLocaleString()}g`;
  }

  // Sticky Active Timer Bar
  const timerMount = document.getElementById('active-timer-mount');
  if (timerMount) {
    timerMount.innerHTML = renderActiveTimerBar(
      activeTimer,
      activityMap,
      derived.streak.multiplier,
      getTimerElapsedSeconds(activeTimer)
    );
  }

  // Main View
  const mainEl = document.getElementById('app-main');
  if (mainEl) {
    if (uiState.tab === 'dashboard') {
      mainEl.innerHTML = renderDashboardView(state, derived, uiState, activeTimer);
    } else if (uiState.tab === 'activities') {
      mainEl.innerHTML = renderActivitiesView(state, derived, uiState, activeTimer);
    } else if (uiState.tab === 'stats') {
      mainEl.innerHTML = renderStatsView(state, derived, uiState);
    } else if (uiState.tab === 'quests') {
      mainEl.innerHTML = renderQuestsAndBadgesView(state, derived);
    } else if (uiState.tab === 'shop') {
      mainEl.innerHTML = renderShopView(state, derived);
    }
  }

  // Modal Mount
  const modalMount = document.getElementById('modal-mount');
  if (modalMount) {
    modalMount.innerHTML = renderModal(modalState, state, getSyncInfo());
  }
}

function animateViewEntrance() {
  if (!isFxEnabled()) return;
  const mainEl = document.getElementById('app-main');
  if (!mainEl) return;
  const items = mainEl.querySelectorAll('.hero-card, .card');
  items.forEach((el, idx) => {
    el.classList.add('fx-enter');
    el.style.animationDelay = `${Math.min(idx * 32, 260)}ms`;
  });
}

/**
 * Global Event Delegation
 */
document.addEventListener('click', (e) => {
  if (typeof e.clientX === 'number' && typeof e.clientY === 'number' && (e.clientX || e.clientY)) {
    lastClickPos = { x: e.clientX, y: e.clientY };
  }

  const btnEl = e.target.closest('.btn');
  if (btnEl && !btnEl.disabled) {
    triggerButtonRipple(btnEl, e.clientX, e.clientY);
  }

  const trigger = e.target.closest('[data-action], [data-nav-tab]');
  if (!trigger) return;

  if (trigger.dataset.navTab) {
    const changed = uiState.tab !== trigger.dataset.navTab;
    uiState.tab = trigger.dataset.navTab;
    render();
    if (changed) animateViewEntrance();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const action = trigger.dataset.action;

  switch (action) {
    case 'switch-tab': {
      const nextTab = trigger.dataset.tab || 'dashboard';
      const changed = uiState.tab !== nextTab;
      uiState.tab = nextTab;
      render();
      if (changed) animateViewEntrance();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    }

    case 'toggle-theme':
      state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
      saveState(state);
      applyThemeAndAudio();
      break;

    case 'toggle-sound':
      state.settings.soundEnabled = !state.settings.soundEnabled;
      saveState(state);
      applyThemeAndAudio();
      if (state.settings.soundEnabled) sound.playStart();
      break;

    case 'toggle-fx':
      state.settings.fxEnabled = state.settings.fxEnabled === false;
      saveState(state);
      applyThemeAndAudio();
      showToast({
        icon: '✨',
        title: state.settings.fxEnabled ? 'Visual Effects Enabled!' : 'Visual Effects Paused',
        subtitle: state.settings.fxEnabled
          ? 'Embers, glows, ripples & floating loot numbers active.'
          : 'Switched to calm mode.',
      });
      render();
      break;

    case 'set-dash-sort':
      uiState.dashSort = trigger.dataset.value || 'recent';
      render();
      break;

    case 'set-attr-filter':
      uiState.attrFilter = trigger.dataset.value || 'all';
      render();
      break;

    case 'set-stats-timeframe':
      uiState.statsTimeframe = trigger.dataset.value || 'week';
      render();
      break;

    case 'start-timer':
      startTimerForActivity(trigger.dataset.id, { mode: 'stopwatch' });
      break;

    case 'start-sprint':
      startTimerForActivity(trigger.dataset.id, {
        mode: 'sprint',
        targetMinutes: Number(trigger.dataset.minutes) || uiState.sprintPresetMin || 25,
      });
      break;

    case 'set-sprint-preset':
      uiState.sprintPresetMin = Number(trigger.dataset.minutes) || 25;
      render();
      break;

    case 'launch-quick-sprint': {
      const selectEl = document.getElementById('sprint-quick-activity');
      const targetId =
        (selectEl && selectEl.value) ||
        uiState.sprintActivityId ||
        (state.activities[0] && state.activities[0].id);
      if (targetId) {
        uiState.sprintActivityId = targetId;
        startTimerForActivity(targetId, {
          mode: 'sprint',
          targetMinutes: uiState.sprintPresetMin || 25,
        });
      }
      break;
    }

    case 'set-timer-mode':
      setActiveTimerMode(trigger.dataset.mode || 'stopwatch', Number(trigger.dataset.minutes) || 25);
      break;

    case 'timer-toggle':
      toggleTimerPause();
      break;

    case 'timer-finish':
      finishActiveTimer();
      break;

    case 'timer-discard':
      discardActiveTimer();
      break;

    case 'quick-log': {
      const minutes = Number(trigger.dataset.minutes) || 15;
      recordSession({ activityId: trigger.dataset.id, durationSeconds: minutes * 60, source: 'manual' });
      break;
    }

    case 'open-log-modal':
      modalState = { type: 'log', activityId: trigger.dataset.id };
      render();
      break;

    case 'fill-log-minutes': {
      const totalMin = Number(trigger.dataset.minutes) || 15;
      const hrsEl = document.getElementById('log-hours');
      const minsEl = document.getElementById('log-minutes');
      if (hrsEl && minsEl) {
        hrsEl.value = String(Math.floor(totalMin / 60));
        minsEl.value = String(totalMin % 60);
      }
      break;
    }

    case 'open-new-activity':
      modalState = { type: 'activity', activityId: null };
      render();
      break;

    case 'open-edit-activity':
      modalState = { type: 'activity', activityId: trigger.dataset.id };
      render();
      break;

    case 'delete-activity': {
      const id = trigger.dataset.id;
      const act = state.activities.find((a) => a.id === id);
      if (!act) break;
      if (!window.confirm(`Delete "${act.name}" and its logged sessions?`)) break;
      const deletedSessionIds = state.sessions.filter((s) => s.activityId === id).map((s) => s.id);
      state.activities = state.activities.filter((a) => a.id !== id);
      state.sessions = state.sessions.filter((s) => s.activityId !== id);
      if (!state.deletedIds || typeof state.deletedIds !== 'object') state.deletedIds = {};
      const nowDel = Date.now();
      for (const sid of deletedSessionIds) state.deletedIds[sid] = nowDel;
      if (activeTimer && activeTimer.activityId === id) {
        persistTimer(null);
        stopTimerLoop();
      }
      persistState({ deletedId: id });
      modalState = null;
      showToast({ icon: '🗑️', title: `Deleted "${act.name}"` });
      render();
      break;
    }

    case 'delete-session': {
      const sid = trigger.dataset.id;
      state.sessions = state.sessions.filter((s) => s.id !== sid);
      persistState({ deletedId: sid });
      showToast({ icon: '↩️', title: 'Session removed', subtitle: 'XP & time totals updated.' });
      render();
      break;
    }

    case 'open-sync-modal':
      syncRuntime.error = '';
      modalState = { type: 'sync', mode: 'register' };
      render();
      break;

    case 'set-sync-mode':
      syncRuntime.error = '';
      modalState = { type: 'sync', mode: trigger.dataset.mode === 'login' ? 'login' : 'register' };
      render();
      break;

    case 'sync-now':
      syncWithCloud({ forcePull: true, manual: true });
      break;

    case 'sync-logout': {
      const oldToken = syncMeta.token;
      syncMeta = {
        vaultId: null,
        token: null,
        version: 0,
        lastSyncedAt: 0,
        activeTimerUpdatedAt: syncMeta.activeTimerUpdatedAt,
        dirty: false,
      };
      saveSyncMeta(syncMeta);
      syncRuntime.status = 'idle';
      syncRuntime.error = '';
      modalState = null;
      if (oldToken) {
        apiLogoutVault(oldToken).catch(() => {});
      }
      showToast({ icon: '☁️', title: 'Signed out of Cloud Sync', subtitle: 'Your local copy stays safe on this device.' });
      render();
      break;
    }

    case 'open-profile-modal':
      modalState = { type: 'profile' };
      render();
      break;

    case 'open-custom-quest':
      modalState = { type: 'custom-quest' };
      render();
      break;

    case 'open-backup-modal':
      modalState = { type: 'backup' };
      render();
      break;

    case 'claim-quest':
      claimDailyQuest(trigger.dataset.id);
      break;

    case 'complete-custom-quest':
      completeCustomQuest(trigger.dataset.id);
      break;

    case 'claim-boss':
      claimWeeklyBoss();
      break;

    case 'set-boss-difficulty':
      state.bossDifficulty = trigger.dataset.value || 'adaptive';
      persistState();
      showToast({
        icon: '🐉',
        title: `Boss Difficulty: ${state.bossDifficulty.charAt(0).toUpperCase() + state.bossDifficulty.slice(1)}`,
        subtitle: 'Weekly Boss HP updated immediately.',
      });
      render();
      break;

    case 'open-new-reward':
      modalState = { type: 'reward', rewardId: null };
      render();
      break;

    case 'open-edit-reward':
      modalState = { type: 'reward', rewardId: trigger.dataset.id };
      render();
      break;

    case 'delete-reward': {
      const rid = trigger.dataset.id;
      const rew = (state.rewards || []).find((r) => r.id === rid);
      if (!rew) break;
      if (!window.confirm(`Remove "${rew.title}" from your Tavern Shop?`)) break;
      state.rewards = state.rewards.filter((r) => r.id !== rid);
      persistState({ deletedId: rid });
      modalState = null;
      showToast({ icon: '🗑️', title: `Removed "${rew.title}"` });
      render();
      break;
    }

    case 'set-vault-split': {
      const pct = Math.max(0, Math.min(80, Math.round(Number(trigger.dataset.percent) || 0)));
      state.vaultSplitPercent = pct;
      if (pct === 0) state.vaultManualDeposit = 0;
      persistState();
      showToast({
        icon: '🏦',
        title: pct === 0 ? 'Epic Savings Vault Off' : `Epic Vault Auto-Save: ${pct}%`,
        subtitle:
          pct === 0
            ? 'All Gold is now in one unified wallet.'
            : `${pct}% of earned Gold is now safely locked for ★ Epic Goals!`,
      });
      render();
      break;
    }

    case 'vault-transfer': {
      const delta = Math.round(Number(trigger.dataset.amount) || 0);
      if (!delta) break;
      const derived = computeDerivedState(state);
      const gold = derived.gold;
      if (delta > 0) {
        const move = Math.min(delta, gold.pocketBalance);
        if (move <= 0) break;
        state.vaultManualDeposit = (Number(state.vaultManualDeposit) || 0) + move;
        persistState();
        sound.playCoinSpend();
        showToast({ icon: '🏦', title: `Stashed +${move}g into Epic Vault!`, subtitle: 'Safely locked for your Epic Goals.' });
      } else {
        const maxBack = Math.max(0, Number(state.vaultManualDeposit) || 0);
        const move = Math.min(Math.abs(delta), maxBack);
        if (move <= 0) break;
        state.vaultManualDeposit = maxBack - move;
        persistState();
        showToast({ icon: '🪙', title: `Moved ${move}g back to Pocket Gold` });
      }
      render();
      break;
    }

    case 'redeem-reward': {
      const rid = trigger.dataset.id;
      const rew = (state.rewards || []).find((r) => r.id === rid);
      if (!rew) break;
      const derived = computeDerivedState(state);
      const gold = derived.gold;
      const cd = getRewardCooldownInfo(rew, state.rewardRedemptions);
      if (cd.onCooldown) {
        showToast({
          icon: '⏳',
          title: `${rew.title} is on cooldown!`,
          subtitle: `Available again in ${cd.remainingLabel}.`,
        });
        break;
      }

      const availableForItem = rew.epic ? gold.balance : gold.pocketBalance;
      if (availableForItem < rew.cost) {
        showToast({
          icon: '🪙',
          title: rew.epic ? 'Not enough Gold yet!' : 'Not enough Pocket Gold!',
          subtitle: `You need ${(rew.cost - availableForItem).toLocaleString()}g more${!rew.epic && gold.vaultEnabled ? ' (Epic Vault Gold stays protected!)' : ''}.`,
        });
        break;
      }
      if (!Array.isArray(state.rewardRedemptions)) state.rewardRedemptions = [];
      state.rewardRedemptions.push({
        id: generateId('red'),
        rewardId: rew.id,
        title: rew.title,
        icon: rew.icon,
        cost: rew.cost,
        epic: Boolean(rew.epic),
        redeemedAt: Date.now(),
      });
      persistState();
      sound.playCoinSpend();
      if (isFxEnabled()) {
        launchConfetti({
          style: rew.epic ? 'levelup' : 'coins',
          count: rew.epic ? 150 : 70,
          durationMs: rew.epic ? 2700 : 1900,
          originX: lastClickPos.x,
          originY: lastClickPos.y,
        });
      }
      spawnFloatingText({
        text: `${rew.icon} Unlocked!`,
        x: lastClickPos.x,
        y: lastClickPos.y,
        tone: 'gold',
        big: Boolean(rew.epic),
      });
      showToast({
        icon: rew.icon,
        title: `Treat Unlocked: ${rew.title}!`,
        subtitle: `Spent ${rew.cost.toLocaleString()}g${rew.cooldownHours > 0 ? ` · ${rew.cooldownHours}h cooldown started` : ' — enjoy, you earned it!'}`,
        tone: 'gold',
      });
      render();
      break;
    }

    case 'refund-redemption': {
      const redId = trigger.dataset.id;
      const item = (state.rewardRedemptions || []).find((r) => r.id === redId);
      if (!item) break;
      state.rewardRedemptions = state.rewardRedemptions.filter((r) => r.id !== redId);
      persistState({ deletedId: redId });
      showToast({
        icon: '↩️',
        title: `Refunded +${item.cost.toLocaleString()}g`,
        subtitle: `Removed "${item.title}" from history.`,
      });
      render();
      break;
    }

    case 'export-json': {
      const json = exportStateToJson(state);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lifequest-backup-${getLocalDateKey()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast({ icon: '💾', title: 'Backup downloaded!', subtitle: 'Saved as JSON file.' });
      break;
    }

    case 'fill-backup-text': {
      const box = document.getElementById('backup-json-box');
      if (box) {
        box.value = exportStateToJson(state);
        box.focus();
        box.select();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(box.value).catch(() => {});
        }
        showToast({ icon: '📋', title: 'Backup text loaded!', subtitle: 'Ready to copy & paste into another device.' });
      }
      break;
    }

    case 'import-backup-text': {
      const box = document.getElementById('backup-json-box');
      const raw = box ? box.value.trim() : '';
      if (!raw) {
        showToast({ icon: '⚠️', title: 'Paste backup JSON first.' });
        break;
      }
      try {
        const imported = parseImportedJson(raw);
        state = imported;
        persistState();
        modalState = null;
        showToast({
          icon: '📥',
          title: 'Backup Imported!',
          subtitle: `${state.activities.length} activities & ${state.sessions.length} sessions restored.`,
          tone: 'gold',
        });
        render();
      } catch (err) {
        showToast({ icon: '⚠️', title: 'Import failed', subtitle: err.message || 'Invalid JSON text.' });
      }
      break;
    }

    case 'load-sample-data': {
      if (state.sessions.length > 0 && !window.confirm('Replace current progress with the 5-day Sample Adventure?')) {
        break;
      }
      const keepTheme = state.settings.theme;
      const keepSound = state.settings.soundEnabled;
      state = createSampleAdventureState();
      state.settings.theme = keepTheme;
      state.settings.soundEnabled = keepSound;
      persistState();
      modalState = null;
      sound.playQuestClaim();
      showToast({
        icon: '✨',
        title: 'Sample Adventure Loaded!',
        subtitle: 'Explore levels, radar stats & charts — reset anytime from Backup.',
        tone: 'gold',
      });
      render();
      break;
    }

    case 'reset-all-data': {
      if (!window.confirm('Reset everything back to a fresh Level 1 clean slate?')) break;
      const keepTheme = state.settings.theme;
      const keepSound = state.settings.soundEnabled;
      state = createDefaultState();
      state.settings.theme = keepTheme;
      state.settings.soundEnabled = keepSound;
      persistTimer(null);
      stopTimerLoop();
      persistState();
      modalState = null;
      showToast({ icon: '🌱', title: 'Fresh Adventure Started!', subtitle: 'Everything is ready at Level 1.' });
      render();
      break;
    }

    case 'close-modal':
      modalState = null;
      render();
      break;

    case 'close-modal-backdrop':
      if (e.target === trigger) {
        modalState = null;
        render();
      }
      break;
  }
});

// Inline live timer note saving (debounced, never interrupts typing)
document.addEventListener('input', (e) => {
  if (e.target && e.target.id === 'active-timer-note-input' && activeTimer) {
    activeTimer.note = String(e.target.value || '').slice(0, 120);
    syncMeta.activeTimerUpdatedAt = Date.now();
    saveActiveTimer(activeTimer);
    if (syncMeta.token) {
      syncMeta.dirty = true;
      saveSyncMeta(syncMeta);
      scheduleCloudPush(950);
    }
  }
});

// Select dropdown changes & JSON file import
document.addEventListener('change', (e) => {
  const target = e.target;
  if (target.dataset.action === 'set-activities-sort') {
    uiState.activitiesSort = target.value;
    render();
    return;
  }
  if (target.dataset.action === 'set-history-filter') {
    uiState.historyActivityFilter = target.value;
    render();
    return;
  }
  if (target.dataset.action === 'set-sprint-activity') {
    uiState.sprintActivityId = target.value;
    return;
  }
  if (target.id === 'import-json-input' && target.files && target.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseImportedJson(String(reader.result || ''));
        state = imported;
        persistState();
        modalState = null;
        showToast({ icon: '📥', title: 'Backup Restored!', subtitle: `${state.activities.length} activities & ${state.sessions.length} sessions loaded.` });
        render();
      } catch (err) {
        showToast({ icon: '⚠️', title: 'Import failed', subtitle: err.message || 'Invalid JSON file.' });
      }
    };
    reader.readAsText(target.files[0]);
  }
});

// Modal Form Submissions
document.addEventListener('submit', (e) => {
  const form = e.target;

  if (form.id === 'activity-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    if (!name) return;

    const editingId = form.dataset.editingId;
    const primaryAttribute = String(fd.get('attribute') || 'craft');
    const rawSecondary = String(fd.get('secondaryAttribute') || '').trim();
    const secondaryAttribute = rawSecondary && rawSecondary !== primaryAttribute ? rawSecondary : null;

    const payload = {
      name: name.slice(0, 48),
      attribute: primaryAttribute,
      secondaryAttribute,
      icon: String(fd.get('icon') || '⭐'),
      color: String(fd.get('color') || '#818cf8'),
      dailyGoalMinutes: Math.max(0, Math.min(720, Number(fd.get('dailyGoalMinutes')) || 0)),
    };

    if (editingId) {
      const idx = state.activities.findIndex((a) => a.id === editingId);
      if (idx !== -1) {
        state.activities[idx] = { ...state.activities[idx], ...payload, updatedAt: Date.now() };
      }
      showToast({ icon: payload.icon, title: `Updated "${payload.name}"` });
    } else {
      const nowTs = Date.now();
      state.activities.push({
        id: generateId('act'),
        ...payload,
        createdAt: nowTs,
        updatedAt: nowTs,
      });
      sound.playStart();
      showToast({ icon: payload.icon, title: `New Skill Added: ${payload.name}`, subtitle: 'Ready to level up!' });
    }

    persistState();
    modalState = null;
    render();
    return;
  }

  if (form.id === 'manual-log-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const hours = Math.max(0, Number(fd.get('hours')) || 0);
    const minutes = Math.max(0, Number(fd.get('minutes')) || 0);
    const note = String(fd.get('note') || '');
    const totalSeconds = Math.round((hours * 60 + minutes) * 60);

    if (totalSeconds < 60) {
      showToast({ icon: '⏱️', title: 'Enter at least 1 minute to log.' });
      return;
    }

    const actId = form.dataset.activityId;
    modalState = null;
    recordSession({ activityId: actId, durationSeconds: totalSeconds, source: 'manual', note });
    return;
  }

  if (form.id === 'profile-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get('name') || '').trim();
    const avatar = String(fd.get('avatar') || '🛡️');
    if (name) state.profile.name = name.slice(0, 32);
    state.profile.avatar = avatar;
    persistState();
    modalState = null;
    showToast({ icon: avatar, title: `Welcome, ${state.profile.name}!` });
    render();
    return;
  }

  if (form.id === 'custom-quest-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const title = String(fd.get('title') || '').trim();
    const xpReward = Math.max(25, Math.min(250, Number(fd.get('xpReward')) || 100));
    if (!title) return;

    state.customQuests.push({
      id: generateId('cq'),
      title: title.slice(0, 64),
      description: 'Personal daily side-quest',
      icon: '🎯',
      xpReward,
      dateKey: getLocalDateKey(),
      completed: false,
      claimed: false,
    });
    persistState();
    modalState = null;
    sound.playStart();
    showToast({ icon: '🎯', title: 'Custom Quest Added!', subtitle: `Complete it today for +${xpReward} XP.` });
    render();
    return;
  }

  if (form.id === 'reward-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const title = String(fd.get('title') || '').trim();
    if (!title) return;

    const editingId = form.dataset.editingId;
    const payload = {
      title: title.slice(0, 64),
      icon: String(fd.get('icon') || '🎁'),
      cost: Math.max(10, Math.min(1000000, Math.round(Number(fd.get('cost')) || 100))),
      cooldownHours: Math.max(0, Math.min(720, Math.round(Number(fd.get('cooldownHours')) || 0))),
      description: String(fd.get('description') || '').trim().slice(0, 140),
      epic: fd.get('epic') === 'on',
    };

    if (!Array.isArray(state.rewards)) state.rewards = [];

    if (editingId) {
      const idx = state.rewards.findIndex((r) => r.id === editingId);
      if (idx !== -1) {
        state.rewards[idx] = { ...state.rewards[idx], ...payload, updatedAt: Date.now() };
      }
      showToast({ icon: payload.icon, title: `Updated "${payload.title}"` });
    } else {
      const nowTs = Date.now();
      state.rewards.push({
        id: generateId('rew'),
        ...payload,
        createdAt: nowTs,
        updatedAt: nowTs,
      });
      sound.playStart();
      showToast({ icon: payload.icon, title: `Added Reward: ${payload.title}`, subtitle: `${payload.cost.toLocaleString()} Gold` });
    }

    persistState();
    modalState = null;
    render();
    return;
  }

  if (form.id === 'sync-auth-form') {
    e.preventDefault();
    const fd = new FormData(form);
    const vaultId = String(fd.get('vaultId') || '').trim().toLowerCase();
    const passcode = String(fd.get('passcode') || '').trim();
    const mode = form.dataset.syncMode === 'login' ? 'login' : 'register';
    handleSyncAuthSubmit({ mode, vaultId, passcode });
  }
});

async function handleSyncAuthSubmit({ mode, vaultId, passcode }) {
  if (syncRuntime.inFlight) return;
  syncRuntime.inFlight = true;
  syncRuntime.status = 'syncing';
  syncRuntime.error = '';
  render();

  try {
    if (mode === 'register') {
      state.updatedAt = state.updatedAt || Date.now();
      saveState(state);
      const res = await apiRegisterVault({
        vaultId,
        passcode,
        state,
        activeTimer,
        activeTimerUpdatedAt: syncMeta.activeTimerUpdatedAt,
      });
      if (!res.data || !res.data.ok) {
        throw new Error((res.data && res.data.error) || 'Could not create sync vault.');
      }

      syncMeta = {
        vaultId: res.data.vaultId,
        token: res.data.token,
        version: Number(res.data.version) || 1,
        lastSyncedAt: Date.now(),
        activeTimerUpdatedAt: syncMeta.activeTimerUpdatedAt,
        dirty: false,
      };
      saveSyncMeta(syncMeta);
      syncRuntime.status = 'synced';
      modalState = null;
      sound.playQuestClaim();
      showToast({
        icon: '☁️',
        title: `Cloud Vault "${syncMeta.vaultId}" Created!`,
        subtitle: 'Sign in with the same Sync Name & passcode on your phone!',
        tone: 'gold',
      });
      render();
      return;
    }

    // Login on 2nd device (e.g. Phone)
    const res = await apiLoginVault({ vaultId, passcode });
    if (!res.data || !res.data.ok) {
      throw new Error((res.data && res.data.error) || 'Could not sign in to sync vault.');
    }

    const hadLocalProgress = state.sessions.length > 0 || (state.updatedAt || 0) > 0;
    const remoteState = sanitizeState(res.data.state);
    const keepSettings = { ...state.settings };

    if (hadLocalProgress) {
      state = mergeStates(state, remoteState);
    } else {
      state = remoteState;
      state.settings = keepSettings;
    }
    saveState(state);

    const remoteTimerTs = Number(res.data.activeTimerUpdatedAt) || 0;
    applyRemoteTimer(res.data.activeTimer, remoteTimerTs);

    syncMeta = {
      vaultId: res.data.vaultId,
      token: res.data.token,
      version: Number(res.data.version) || 1,
      lastSyncedAt: Date.now(),
      activeTimerUpdatedAt: syncMeta.activeTimerUpdatedAt,
      dirty: hadLocalProgress,
    };
    saveSyncMeta(syncMeta);
    syncRuntime.status = 'synced';
    modalState = null;
    sound.playQuestClaim();
    showToast({
      icon: '☁️',
      title: `Connected to "${syncMeta.vaultId}"!`,
      subtitle: hadLocalProgress
        ? 'Merged local & cloud progress — now syncing automatically!'
        : 'Progress loaded from cloud — now syncing automatically!',
      tone: 'gold',
    });
    render();

    if (hadLocalProgress) {
      syncRuntime.inFlight = false;
      syncWithCloud({ forcePull: false });
      return;
    }
  } catch (err) {
    syncRuntime.status = 'error';
    syncRuntime.error = err.message || 'Cloud sync failed.';
    render();
  } finally {
    syncRuntime.inFlight = false;
    updateSyncButtonUi();
  }
}

// Automatic real-time cloud sync hooks (visibility, focus, online, periodic poll)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && syncMeta.token) {
    syncWithCloud({ forcePull: true });
  }
});

window.addEventListener('focus', () => {
  if (syncMeta.token) {
    syncWithCloud({ forcePull: true });
  }
});

window.addEventListener('online', () => {
  if (syncMeta.token) {
    syncWithCloud({ forcePull: true });
  }
});

setInterval(() => {
  if (
    syncMeta.token &&
    document.visibilityState === 'visible' &&
    (!modalState || modalState.type === 'sync') &&
    (!document.activeElement || document.activeElement.id !== 'active-timer-note-input')
  ) {
    syncWithCloud({ forcePull: true });
  }
}, 15000);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalState) {
    modalState = null;
    render();
    return;
  }
  const tag = (e.target && e.target.tagName) || '';
  const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  if (e.code === 'Space' && !isTyping && !modalState && activeTimer) {
    e.preventDefault();
    toggleTimerPause();
  }
});

// Boot
render();
animateViewEntrance();
ensureTimerLoop();
initAmbientCanvas();
initInteractiveCardEffects();
if (syncMeta.token) {
  syncWithCloud({ forcePull: true });
}
