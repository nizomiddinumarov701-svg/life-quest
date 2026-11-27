/**
 * Active Timer Bar, Dashboard View & Skill Book (Activities) View.
 */

import {
  ATTRIBUTES,
  ATTRIBUTE_MAP,
  RARITY_META,
  SPRINT_PRESETS_MIN,
  calculateSessionGold,
  calculateSessionXp,
  formatDurationShort,
  formatStopwatch,
  getEffectiveGearXpBonus,
} from '../rpgEngine.js';
import { renderAttributeRadarSvg } from '../charts.js';
import { esc, formatRelativeTime } from './helpers.js';
import { renderQuestRow, renderWeeklyBossCard } from './quests.js';
import { renderCompanionHeroChip } from './rpgExtras.js';

/**
 * Sticky Live Timer Bar (appears whenever a timer is active or paused).
 */
export function renderActiveTimerBar(activeTimer, activityMap, streakMultiplier, elapsedSec, gearBonuses = null) {
  if (!activeTimer) return '';
  const act = activityMap.get(activeTimer.activityId);
  if (!act) return '';

  const isSprint = activeTimer.mode === 'sprint';
  const targetSec = Math.max(60, Number(activeTimer.targetSeconds) || 1500);
  const sprintDone = isSprint && elapsedSec >= targetSec;
  const remainingSec = Math.max(0, targetSec - elapsedSec);
  const overtimeSec = Math.max(0, elapsedSec - targetSec);
  const rawSprintPct = isSprint ? Math.min(100, (elapsedSec / targetSec) * 100) : 0;
  const sprintPct = Math.floor(rawSprintPct);
  const sprintBarWidth = isSprint
    ? rawSprintPct === 0 && activeTimer.isRunning
      ? 1.5
      : Number(Math.max(rawSprintPct > 0 ? 1.5 : 0, rawSprintPct).toFixed(2))
    : 0;

  const gearXpInput = getEffectiveGearXpBonus(gearBonuses, act);
  const liveXp = calculateSessionXp(elapsedSec, streakMultiplier, sprintDone, gearXpInput);
  const baseXpForGold = calculateSessionXp(elapsedSec, streakMultiplier, sprintDone, {
    allXpPct: 0,
    attrXpPct: 0,
    sprintBonusPct: gearXpInput.sprintBonusPct,
  });
  const liveGold = calculateSessionGold(baseXpForGold, gearBonuses ? gearBonuses.goldPct : 0);
  const statusLabel = activeTimer.isRunning ? (isSprint ? '⚡ Focus Sprint' : 'In Progress') : 'Paused';

  const displayDigits = isSprint
    ? sprintDone
      ? `+${formatStopwatch(overtimeSec)}`
      : formatStopwatch(remainingSec)
    : formatStopwatch(elapsedSec);

  return `
    <div class="active-timer-bar ${activeTimer.isRunning ? 'is-running' : 'is-paused'} ${isSprint ? 'is-sprint' : ''} ${sprintDone ? 'is-sprint-done' : ''}" role="region" aria-label="Active Action Timer">
      <div class="active-timer-inner">
        <div class="active-timer-meta">
          <span class="active-timer-pulse"></span>
          <span class="active-timer-icon" style="--act-color: ${esc(act.color)}">${esc(act.icon)}</span>
          <div class="active-timer-title-col">
            <div class="active-timer-name">${esc(act.name)}</div>
            <div class="active-timer-status" id="live-timer-status">
              ${
                sprintDone
                  ? `🎉 Sprint Complete! +20% Bonus XP &amp; Gold unlocked`
                  : isSprint
                    ? `${statusLabel} (${Math.round(targetSec / 60)}m goal · +20% bonus)`
                    : `${statusLabel} · ${streakMultiplier.toFixed(1)}x XP rate`
              }
            </div>
          </div>
        </div>

        <div class="active-timer-readout">
          <span class="timer-digits" id="live-timer-digits">${displayDigits}</span>
          <span class="timer-live-xp" id="live-timer-xp">+${liveXp} XP · +${liveGold}g${sprintDone ? ' ⚡' : ''}</span>
        </div>

        <div class="active-timer-controls">
          <button class="btn btn-soft btn-sm" data-action="timer-toggle" title="Pause or Resume (Space)">
            ${activeTimer.isRunning ? '⏸ Pause' : '▶ Resume'}
          </button>
          <button class="btn btn-gold btn-sm ${sprintDone ? 'pulse-glow' : ''}" data-action="timer-finish" title="Save session and claim XP">
            ✓ Finish &amp; Claim
          </button>
          <button class="btn btn-ghost btn-sm btn-icon-only" data-action="timer-discard" title="Discard timer" aria-label="Discard timer">
            ✕
          </button>
        </div>

        ${
          isSprint
            ? `
          <div class="sprint-live-progress" aria-label="Live Focus Sprint progress">
            <div class="sprint-live-head">
              <span class="sprint-live-label" id="live-sprint-label">
                ${
                  sprintDone
                    ? '🎉 Sprint Target Reached! +20% Bonus XP &amp; Gold Locked In'
                    : `⚡ Live Sprint Bar · ${formatStopwatch(elapsedSec)} / ${formatStopwatch(targetSec)}`
                }
              </span>
              <span class="sprint-live-pct" id="live-sprint-pct">${sprintPct}%</span>
            </div>
            <div class="sprint-progress-track">
              <div class="sprint-progress-fill" id="live-sprint-bar-fill" style="width: ${sprintBarWidth}%"></div>
            </div>
          </div>
        `
            : ''
        }

        <div class="active-timer-subrow">
          <div class="timer-mode-pills" role="group" aria-label="Timer mode">
            <button type="button" class="mode-chip ${!isSprint ? 'is-active' : ''}" data-action="set-timer-mode" data-mode="stopwatch" title="Open-ended stopwatch">∞ Stopwatch</button>
            ${SPRINT_PRESETS_MIN.map(
              (m) => `
              <button type="button" class="mode-chip ${isSprint && Math.round(targetSec / 60) === m ? 'is-active' : ''}" data-action="set-timer-mode" data-mode="sprint" data-minutes="${m}" title="Focus Sprint ${m}m (+20% bonus XP & Gold)">⚡ ${m}m</button>
            `
            ).join('')}
          </div>

          <input
            id="active-timer-note-input"
            class="timer-note-input"
            type="text"
            maxlength="120"
            placeholder="📝 Add a session note (e.g. Chess tactics, API refactor)..."
            value="${esc(activeTimer.note || '')}"
            aria-label="Session note"
          />
        </div>
      </div>
    </div>
  `;
}

function renderSprintLauncherBar(activities, uiState) {
  if (!activities || activities.length === 0) return '';
  const selectedId = activities.some((a) => a.id === uiState.sprintActivityId)
    ? uiState.sprintActivityId
    : activities[0].id;
  const presetMin = SPRINT_PRESETS_MIN.includes(uiState.sprintPresetMin) ? uiState.sprintPresetMin : 25;

  return `
    <section class="sprint-launcher-bar card" aria-label="Quick Focus Sprint Launcher">
      <div class="sprint-launcher-title">
        <span class="sprint-launcher-badge">⚡ Focus Sprint</span>
        <span class="sprint-launcher-hint">Finish the countdown for <strong>+20% Bonus XP &amp; Gold</strong></span>
      </div>

      <div class="sprint-launcher-controls">
        <select id="sprint-quick-activity" class="input-select sprint-select" data-action="set-sprint-activity" aria-label="Choose activity for Focus Sprint">
          ${activities
            .map(
              (a) =>
                `<option value="${esc(a.id)}" ${a.id === selectedId ? 'selected' : ''}>${esc(a.icon)} ${esc(a.name)}</option>`
            )
            .join('')}
        </select>

        <div class="sprint-preset-group" role="group" aria-label="Sprint duration">
          ${SPRINT_PRESETS_MIN.map(
            (m) => `
            <button
              type="button"
              class="mode-chip ${presetMin === m ? 'is-active' : ''}"
              data-action="set-sprint-preset"
              data-minutes="${m}"
            >${m}m</button>
          `
          ).join('')}
        </div>

        <button type="button" class="btn btn-gold btn-sm sprint-go-btn" data-action="launch-quick-sprint">
          ⚡ Start ${presetMin}m Sprint
        </button>
      </div>
    </section>
  `;
}

function renderAddActivityGhostCard(isOddCount) {
  return `
    <button type="button" class="card add-activity-card ${isOddCount ? 'is-grid-filler' : 'is-strip'}" data-action="open-new-activity">
      <span class="add-activity-plus" aria-hidden="true">+</span>
      <span class="add-activity-copy">
        <strong>Add New Activity</strong>
        <span>Track another skill, habit, or study goal</span>
      </span>
    </button>
  `;
}

function renderActivityCard(act, activeTimer, compact = false) {
  const attr = ATTRIBUTE_MAP[act.attribute] || ATTRIBUTES[2];
  const secAttr =
    act.secondaryAttribute && act.secondaryAttribute !== act.attribute
      ? ATTRIBUTE_MAP[act.secondaryAttribute]
      : null;
  const isThisRunning = activeTimer && activeTimer.activityId === act.id && activeTimer.isRunning;
  const isThisPaused = activeTimer && activeTimer.activityId === act.id && !activeTimer.isRunning;
  const lv = act.levelInfo;

  return `
    <article class="card activity-card ${isThisRunning ? 'is-active-timer' : ''}" style="--act-color: ${esc(act.color)}" data-activity-id="${esc(act.id)}">
      <div class="activity-card-head">
        <div class="activity-identity">
          <div class="activity-icon-badge" aria-hidden="true">${esc(act.icon)}</div>
          <div class="activity-titles">
            <h3 class="activity-name">${esc(act.name)}</h3>
            <div class="activity-badges">
              <span class="attr-chip" style="--attr-color: ${esc(attr.color)}" title="${secAttr ? 'Primary attribute (70% XP)' : 'Primary attribute (100% XP)'}">
                ${esc(attr.icon)} ${esc(attr.label)}${secAttr ? ' 70%' : ''}
              </span>
              ${
                secAttr
                  ? `<span class="attr-chip attr-chip-secondary" style="--attr-color: ${esc(secAttr.color)}" title="Secondary combo attribute (30% XP)">+ ${esc(secAttr.icon)} ${esc(secAttr.label)} 30%</span>`
                  : ''
              }
              <span class="rank-chip tier-${esc(lv.rankTier)}">${esc(lv.rankTitle)}</span>
            </div>
          </div>
        </div>

        <div class="activity-level-pill" title="${lv.totalXp.toLocaleString()} total XP">
          <span class="lvl-prefix">LVL</span>
          <span class="lvl-num">${lv.level}</span>
        </div>
      </div>

      <div class="xp-block">
        <div class="xp-bar-track">
          <div class="xp-bar-fill" style="width: ${lv.progressPercent}%; background: linear-gradient(90deg, ${esc(act.color)}, color-mix(in srgb, ${esc(act.color)} 70%, #ffffff));"></div>
        </div>
        <div class="xp-meta-row">
          <span><strong>${lv.currentLevelXp.toLocaleString()}</strong> / ${lv.xpNeededForNext.toLocaleString()} XP</span>
          <span class="xp-to-next">${lv.xpToNext.toLocaleString()} XP to Lv.${lv.level + 1}</span>
        </div>
      </div>

      <div class="activity-time-grid">
        <div class="time-pill">
          <span class="time-pill-label">Today</span>
          <span class="time-pill-val">${formatDurationShort(act.todaySeconds)}</span>
        </div>
        <div class="time-pill">
          <span class="time-pill-label">This Week</span>
          <span class="time-pill-val">${formatDurationShort(act.weekSeconds)}</span>
        </div>
        <div class="time-pill">
          <span class="time-pill-label">All Time</span>
          <span class="time-pill-val">${formatDurationShort(act.totalSeconds)}</span>
        </div>
      </div>

      ${
        act.dailyGoalPercent !== null
          ? `
        <div class="daily-goal-row">
          <span>Daily goal (${act.dailyGoalMinutes}m)</span>
          <span>${act.dailyGoalPercent}%</span>
        </div>
        <div class="mini-goal-bar">
          <div class="mini-goal-fill" style="width: ${act.dailyGoalPercent}%"></div>
        </div>
      `
          : ''
      }

      <div class="activity-actions">
        <div class="activity-actions-primary">
          ${
            isThisRunning
              ? `
                <button class="btn btn-gold btn-sm flex-grow" data-action="timer-finish">● Running · Finish</button>
                <button class="btn btn-soft btn-sm" data-action="timer-toggle" title="Pause timer">⏸ Pause</button>
              `
              : isThisPaused
                ? `
                  <button class="btn btn-primary btn-sm flex-grow" data-action="timer-toggle">▶ Resume Timer</button>
                  <button class="btn btn-gold btn-sm" data-action="timer-finish">✓ Finish</button>
                `
                : `
                  <button class="btn btn-primary btn-sm flex-grow" data-action="start-timer" data-id="${esc(act.id)}">▶ Start Timer</button>
                  <button class="btn btn-sprint btn-sm" data-action="start-sprint" data-id="${esc(act.id)}" data-minutes="25" title="Start 25m Focus Sprint (+20% bonus XP & Gold)">⚡ Sprint</button>
                `
          }
        </div>
        <div class="activity-actions-quick">
          <button class="btn btn-soft btn-xs" data-action="quick-log" data-id="${esc(act.id)}" data-minutes="15" title="Quick add 15 minutes">+15m</button>
          <button class="btn btn-soft btn-xs" data-action="quick-log" data-id="${esc(act.id)}" data-minutes="30" title="Quick add 30 minutes">+30m</button>
          <button class="btn btn-soft btn-xs" data-action="open-log-modal" data-id="${esc(act.id)}" title="Log custom duration & note">+ Log</button>
          ${
            !compact
              ? `<button class="btn btn-ghost btn-xs btn-icon-only" data-action="open-edit-activity" data-id="${esc(act.id)}" title="Edit activity" aria-label="Edit ${esc(act.name)}">✎</button>`
              : ''
          }
        </div>
      </div>
    </article>
  `;
}

function renderHeroBanner(state, derived) {
  const p = state.profile;
  const pl = derived.playerLevelInfo;
  const hc = derived.heroClass;
  const streak = derived.streak;
  const shields = derived.streakShields;
  const gear = derived.gearBonuses;
  const pendingChests = derived.pendingChests || [];
  const readyQuests = derived.dailyQuests.filter((q) => q.completed && !q.claimed).length;
  const bossClaimable = derived.weeklyBoss.defeated && !derived.weeklyBoss.claimed;

  return `
    <section class="hero-card">
      <div class="hero-left">
        <button class="hero-avatar-btn" data-action="open-profile-modal" title="Edit hero name & avatar">
          <span class="hero-avatar">${esc(p.avatar)}</span>
          <span class="hero-level-badge">Lv.${pl.level}</span>
        </button>
        <div class="hero-info">
          <div class="hero-name-row">
            <h1 class="hero-name">${esc(p.name)}</h1>
            <span class="hero-class-pill" style="--class-color: ${esc(hc.accentColor)}" title="${esc(hc.desc)}">
              ${esc(hc.icon)} ${esc(hc.name)}
            </span>
            <span class="hero-title-pill">${esc(pl.rankTitle)}</span>
            <button class="btn-link-subtle" data-action="open-profile-modal" aria-label="Edit profile">Edit</button>
          </div>
          <div class="hero-xp-wrap">
            <div class="xp-bar-track xp-bar-hero">
              <div class="xp-bar-fill hero-xp-fill" style="width: ${pl.progressPercent}%"></div>
            </div>
            <div class="xp-meta-row">
              <span><strong>${pl.currentLevelXp.toLocaleString()}</strong> / ${pl.xpNeededForNext.toLocaleString()} Player XP</span>
              <span>${pl.xpToNext.toLocaleString()} XP to Level ${pl.level + 1}</span>
            </div>
          </div>

          <div class="hero-gear-strip">
            ${renderCompanionHeroChip(derived.companion)}
            ${
              pendingChests.length > 0
                ? `
              <button type="button" class="btn btn-gold btn-xs hero-chest-cta pulse-glow" data-action="open-next-chest" title="Open your earned RPG Loot Chest!">
                🎁 Open Loot Chest (${pendingChests.length})
              </button>
            `
                : ''
            }
            ${gear.equippedList
              .map((item) => {
                const rm = RARITY_META[item.rarity] || RARITY_META.common;
                return `<button type="button" class="hero-gear-chip rarity-${esc(item.rarity)} ${item.isMasterwork ? 'is-masterwork' : ''}" style="--rarity-color: ${esc(rm.color)}" data-action="switch-tab" data-tab="quests" title="${esc(item.displayName || item.name)} (${esc(rm.label)}) · ${esc(item.bonusText)}">${esc(item.icon)} ${esc(item.displayName || item.name)}</button>`;
              })
              .join('')}
          </div>
        </div>
      </div>

      <div class="hero-stats hero-stats-four">
        <div class="hero-stat-box streak-box ${streak.current > 0 ? 'is-lit' : ''}">
          <div class="hero-stat-label">Streak &amp; Boost</div>
          <div class="hero-stat-value">
            🔥 ${streak.current}d · <span>${streak.multiplier.toFixed(1)}x</span>
            ${shields.available > 0 ? `<span class="shield-mini-pill" title="${shields.available} Streak Freeze Shield${shields.available === 1 ? '' : 's'} ready">❄️${shields.available}</span>` : ''}
          </div>
          <div class="hero-stat-sub">
            ${
              bossClaimable
                ? '🐉 Boss bounty ready!'
                : shields.available > 0
                  ? `Protected by ${shields.available} Freeze Shield${shields.available === 1 ? '' : 's'}`
                  : 'XP & Gold multiplier'
            }
          </div>
        </div>
        <button class="hero-stat-box gold-box" data-action="switch-tab" data-tab="shop" title="Open Tavern Rewards Shop">
          <div class="hero-stat-label">${derived.gold.vaultEnabled ? 'Pocket · Epic Vault' : 'Gold Coins'}</div>
          <div class="hero-stat-value text-gold">🪙 ${derived.gold.pocketBalance.toLocaleString()}g</div>
          <div class="hero-stat-sub">
            ${derived.gold.vaultEnabled ? `🏦 ${derived.gold.vaultBalance.toLocaleString()}g saved in Vault` : 'Open Tavern Shop →'}
          </div>
        </button>
        <div class="hero-stat-box">
          <div class="hero-stat-label">Today’s Time</div>
          <div class="hero-stat-value">${formatDurationShort(derived.todaySeconds)}</div>
          <div class="hero-stat-sub">+${derived.todayXp.toLocaleString()} XP today</div>
        </div>
        <div class="hero-stat-box">
          <div class="hero-stat-label">Lifetime Time</div>
          <div class="hero-stat-value">${formatDurationShort(derived.totalSeconds)}</div>
          <div class="hero-stat-sub">${readyQuests > 0 ? `${readyQuests} quest${readyQuests === 1 ? '' : 's'} ready!` : `${state.sessions.length} actions logged`}</div>
        </div>
      </div>
    </section>
  `;
}

/**
 * TAB 1: DASHBOARD VIEW
 */
export function renderDashboardView(state, derived, uiState, activeTimer) {
  const activityMap = new Map(derived.activityStats.map((a) => [a.id, a]));
  const sorted = [...derived.activityStats].sort((a, b) => {
    if (uiState.dashSort === 'level') return b.levelInfo.totalXp - a.levelInfo.totalXp;
    if (uiState.dashSort === 'time') return b.totalSeconds - a.totalSeconds;
    return b.lastTimestamp - a.lastTimestamp || b.levelInfo.totalXp - a.levelInfo.totalXp;
  });

  const recentSessions = [...state.sessions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  return `
    ${renderHeroBanner(state, derived)}

    ${!activeTimer ? renderSprintLauncherBar(sorted, uiState) : ''}

    <div class="dashboard-layout">
      <div class="section-header dash-activities-head">
        <div>
          <h2 class="section-title">Your Activities &amp; Levels</h2>
          <p class="section-sub">Start a live timer or quick-log time to earn XP and level up each skill.</p>
        </div>
        <div class="section-controls">
          <div class="segmented-sm" role="group" aria-label="Sort activities">
            <button class="${uiState.dashSort === 'recent' ? 'is-active' : ''}" data-action="set-dash-sort" data-value="recent">Recent</button>
            <button class="${uiState.dashSort === 'level' ? 'is-active' : ''}" data-action="set-dash-sort" data-value="level">Level</button>
            <button class="${uiState.dashSort === 'time' ? 'is-active' : ''}" data-action="set-dash-sort" data-value="time">Time</button>
          </div>
          <button class="btn btn-primary btn-sm" data-action="open-new-activity">+ New Activity</button>
        </div>
      </div>

      <div class="dash-main">
        ${
          sorted.length === 0
            ? `
          <div class="empty-card card">
            <div class="empty-emoji">✨</div>
            <h3>Create your first life activity</h3>
            <p>Add things like Reading, Coding, Workout, or Cooking to track your time and level them up.</p>
            <button class="btn btn-primary" data-action="open-new-activity">+ Create Activity</button>
          </div>
        `
            : `
          <div class="activities-grid">
            ${sorted.map((act) => renderActivityCard(act, activeTimer, false)).join('')}
            ${renderAddActivityGhostCard(sorted.length % 2 === 1)}
          </div>
        `
        }
      </div>

      <div class="section-header dash-sidebar-head">
        <div>
          <h2 class="section-title">Quest &amp; Boss Board</h2>
          <p class="section-sub">Weekly boss raid, daily quests &amp; skill radar.</p>
        </div>
      </div>

      <aside class="dash-sidebar">
        ${renderWeeklyBossCard(state, derived, true)}

        <section class="card sidebar-card">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">📜 Daily Quests</h3>
              <p class="card-sub">Bonus XP &amp; Gold refreshed daily</p>
            </div>
            <button class="btn btn-soft btn-xs" data-action="open-custom-quest">+ Custom</button>
          </div>
          <div class="quest-list">
            ${derived.dailyQuests.map(renderQuestRow).join('')}
          </div>
        </section>

        <section class="card sidebar-card">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">🧭 RPG Skill Radar</h3>
              <p class="card-sub">Balance across your 5 life attributes</p>
            </div>
            <button class="btn-link-subtle" data-action="switch-tab" data-tab="quests">Details →</button>
          </div>
          <div class="radar-wrap">
            ${renderAttributeRadarSvg(derived.attributeStats, 'dash')}
          </div>
        </section>

        <section class="card sidebar-card">
          <div class="card-header-row">
            <div>
              <h3 class="card-title">⚡ Recent Actions</h3>
              <p class="card-sub">Latest time &amp; XP logged</p>
            </div>
            ${
              state.sessions.length > 0
                ? `<button class="btn-link-subtle" data-action="switch-tab" data-tab="stats">Full Log →</button>`
                : ''
            }
          </div>
          ${
            recentSessions.length === 0
              ? `
            <div class="empty-inline">
              <p>No actions logged yet! Press <strong>▶ Start Timer</strong> or <strong>+15m</strong> on any activity to earn your first XP.</p>
              <button class="btn btn-soft btn-xs" data-action="load-sample-data">Preview with Sample Adventure</button>
            </div>
          `
              : `
            <div class="recent-list">
              ${recentSessions
                .map((s) => {
                  const act = activityMap.get(s.activityId);
                  if (!act) return '';
                  return `
                    <div class="recent-item">
                      <span class="recent-icon" style="--act-color: ${esc(act.color)}">${esc(act.icon)}</span>
                      <div class="recent-info">
                        <div class="recent-title">${esc(act.name)} ${s.note ? `<span class="recent-note">· ${esc(s.note)}</span>` : ''}</div>
                        <div class="recent-meta">${formatDurationShort(s.durationSeconds)} · ${formatRelativeTime(s.timestamp)}</div>
                      </div>
                      <span class="recent-xp">+${s.xpEarned} XP</span>
                      <button class="btn-icon-tiny" data-action="delete-session" data-id="${esc(s.id)}" title="Undo / delete session" aria-label="Delete session">✕</button>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `
          }
        </section>
      </aside>
    </div>
  `;
}

/**
 * TAB 2: ACTIVITIES / SKILL BOOK VIEW
 */
export function renderActivitiesView(state, derived, uiState, activeTimer) {
  const filtered = derived.activityStats
    .filter(
      (a) =>
        uiState.attrFilter === 'all' ||
        a.attribute === uiState.attrFilter ||
        a.secondaryAttribute === uiState.attrFilter
    )
    .sort((a, b) => {
      if (uiState.activitiesSort === 'time') return b.totalSeconds - a.totalSeconds;
      if (uiState.activitiesSort === 'name') return a.name.localeCompare(b.name);
      if (uiState.activitiesSort === 'recent') return b.lastTimestamp - a.lastTimestamp;
      return b.levelInfo.totalXp - a.levelInfo.totalXp;
    });

  return `
    <div class="page-head-row">
      <div>
        <h1 class="page-title">Skill Book</h1>
        <p class="page-sub">Manage all your life activities, inspect every level, and set Primary + Secondary combo attributes.</p>
      </div>
      <button class="btn btn-primary" data-action="open-new-activity">+ New Activity</button>
    </div>

    <div class="filter-toolbar card">
      <div class="attr-filter-pills" role="group" aria-label="Filter by attribute">
        <button class="filter-pill ${uiState.attrFilter === 'all' ? 'is-active' : ''}" data-action="set-attr-filter" data-value="all">All (${derived.activityStats.length})</button>
        ${ATTRIBUTES.map((attr) => {
          const count = derived.activityStats.filter(
            (a) => a.attribute === attr.id || a.secondaryAttribute === attr.id
          ).length;
          return `
            <button class="filter-pill ${uiState.attrFilter === attr.id ? 'is-active' : ''}" data-action="set-attr-filter" data-value="${attr.id}">
              ${esc(attr.icon)} ${esc(attr.label)} (${count})
            </button>
          `;
        }).join('')}
      </div>

      <div class="sort-inline">
        <label for="activities-sort-select">Sort by</label>
        <select id="activities-sort-select" class="input-select" data-action="set-activities-sort">
          <option value="level" ${uiState.activitiesSort === 'level' ? 'selected' : ''}>Highest Level</option>
          <option value="time" ${uiState.activitiesSort === 'time' ? 'selected' : ''}>Most Time Spent</option>
          <option value="recent" ${uiState.activitiesSort === 'recent' ? 'selected' : ''}>Recently Used</option>
          <option value="name" ${uiState.activitiesSort === 'name' ? 'selected' : ''}>Alphabetical</option>
        </select>
      </div>
    </div>

    ${
      filtered.length === 0
        ? `
      <div class="empty-card card">
        <div class="empty-emoji">📖</div>
        <h3>No activities in this category yet</h3>
        <p>Create a new skill under this attribute or switch back to All.</p>
        <button class="btn btn-primary" data-action="open-new-activity">+ Add Activity</button>
      </div>
    `
        : `
      <div class="activities-grid activities-grid-wide">
        ${filtered.map((act) => renderActivityCard(act, activeTimer, false)).join('')}
      </div>
    `
    }
  `;
}
