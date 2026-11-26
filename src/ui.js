/**
 * View templates & modal renderers for LifeQuest.
 */

import {
  ATTRIBUTES,
  ATTRIBUTE_MAP,
  ACTIVITY_ICONS,
  ACTIVITY_COLORS,
  BOSS_DIFFICULTIES,
  REWARD_ICONS,
  SPRINT_PRESETS_MIN,
  filterSessionsByTimeframe,
  formatDurationShort,
  formatStopwatch,
  calculateSessionXp,
  calculateSessionGold,
  getRewardCooldownInfo,
} from './rpgEngine.js';
import { renderAttributeRadarSvg, renderTimeDonutSvg, renderWeeklyBarsSvg } from './charts.js';
import { GITHUB_TOKEN_CREATE_URL } from './sync.js';

export const PLAYER_AVATARS = ['🛡️', '⚔️', '🧙', '🦊', '🦉', '🐉', '🌟', '🏹', '🧭', '🌿', '🔥', '👑'];

export function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRelativeTime(timestamp) {
  const diffSec = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const d = new Date(timestamp);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Sticky Live Timer Bar (appears whenever a timer is active or paused).
 */
export function renderActiveTimerBar(activeTimer, activityMap, streakMultiplier, elapsedSec) {
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

  const liveXp = calculateSessionXp(elapsedSec, streakMultiplier, sprintDone);
  const liveGold = calculateSessionGold(liveXp);
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

/**
 * Compact Focus Sprint Quick-Launch Bar (shown on Dashboard when no timer is running).
 */
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

/**
 * Dashed "+ Add New Activity" ghost card to keep activity grids visually balanced.
 */
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

/**
 * Single Activity / Skill Card (used on Dashboard & Activities page).
 */
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

/**
 * Daily Quest Item row.
 */
function renderQuestRow(q) {
  const canClaim = q.completed && !q.claimed;
  const isCustomUnfinished = !q.auto && !q.completed;
  const goldBonus = Math.round(q.xpReward * 0.3);

  return `
    <div class="quest-item ${q.claimed ? 'is-claimed' : canClaim ? 'is-ready' : ''}">
      <div class="quest-icon">${esc(q.icon)}</div>
      <div class="quest-body">
        <div class="quest-head">
          <span class="quest-title">${esc(q.title)}</span>
          <span class="quest-reward">+${q.xpReward} XP · +${goldBonus}g</span>
        </div>
        <div class="quest-desc">${esc(q.description)}</div>
        ${
          q.auto
            ? `
          <div class="quest-progress-row">
            <div class="quest-bar-track">
              <div class="quest-bar-fill" style="width: ${q.progressPercent}%"></div>
            </div>
            <span class="quest-progress-label">${q.current}/${q.target} ${esc(q.unit)}</span>
          </div>
        `
            : ''
        }
      </div>
      <div class="quest-action">
        ${
          q.claimed
            ? `<span class="quest-done-pill">✓ Claimed</span>`
            : canClaim
              ? `<button class="btn btn-gold btn-xs pulse-glow" data-action="claim-quest" data-id="${esc(q.id)}">Claim</button>`
              : isCustomUnfinished
                ? `<button class="btn btn-soft btn-xs" data-action="complete-custom-quest" data-id="${esc(q.id)}">Complete</button>`
                : `<span class="quest-pct">${q.progressPercent}%</span>`
        }
      </div>
    </div>
  `;
}

/**
 * Weekly Boss Battle Card (compact on Dashboard, expanded on Quests & Boss tab).
 */
function renderWeeklyBossCard(state, derived, compact = false) {
  const wb = derived.weeklyBoss;
  const b = wb.boss;
  const canClaim = wb.defeated && !wb.claimed;
  const trophies = state.bossTrophies || [];

  return `
    <section class="card ${compact ? 'sidebar-card' : 'stats-card'} boss-card ${wb.defeated ? 'is-defeated' : ''}" style="--boss-accent: ${esc(b.accent)}">
      <div class="card-header-row">
        <div class="boss-title-wrap">
          <span class="boss-avatar-badge">${esc(b.icon)}</span>
          <div>
            <div class="boss-kicker">Weekly Boss · ${wb.daysLeft}d left</div>
            <h3 class="card-title">${esc(b.name)}</h3>
            <p class="card-sub">${esc(b.subtitle)}</p>
          </div>
        </div>
        ${
          compact
            ? `<button class="btn-link-subtle" data-action="switch-tab" data-tab="quests">Arena →</button>`
            : `<span class="boss-diff-pill">${esc(BOSS_DIFFICULTIES[wb.difficulty].label)} Mode</span>`
        }
      </div>

      <div class="boss-hp-block">
        <div class="boss-hp-row">
          <span class="boss-hp-label">${wb.defeated ? '💀 VANQUISHED!' : `❤️ ${wb.remainingHp.toLocaleString()} / ${wb.maxHp.toLocaleString()} HP`}</span>
          <span class="boss-dmg-stat">⚔️ ${wb.damageDealt.toLocaleString()} DMG${wb.critCount > 0 ? ` · 💥 ${wb.critCount} crit${wb.critCount === 1 ? '' : 's'}` : ''}</span>
        </div>
        <div class="boss-hp-track">
          <div class="boss-hp-fill" style="width: ${wb.hpPercent}%"></div>
        </div>
      </div>

      ${
        canClaim
          ? `
        <div class="boss-victory-bar">
          <div>
            <strong>Victory!</strong> Claim your weekly boss bounty:
            <span class="text-gold">+${wb.bountyXp} XP · +${wb.bountyGold}g</span>
          </div>
          <button class="btn btn-gold btn-sm pulse-glow" data-action="claim-boss">🏆 Claim Bounty</button>
        </div>
      `
          : wb.claimed
            ? `
        <div class="boss-claimed-pill">✓ Weekly Boss Defeated &amp; Trophy Earned! Next boss arrives Monday.</div>
      `
            : `
        <div class="boss-tip-row">
          <span>Every minute tracked = <strong>1 DMG</strong> · 30m+ sessions land <strong>💥 Focus Crits!</strong></span>
          <span class="text-gold">Bounty: +${wb.bountyXp} XP · +${wb.bountyGold}g</span>
        </div>
      `
      }

      ${
        !compact
          ? `
        <div class="boss-footer-controls">
          <div class="boss-diff-row">
            <span class="boss-diff-label">Boss Difficulty:</span>
            <div class="segmented-sm" role="group" aria-label="Boss difficulty">
              ${Object.values(BOSS_DIFFICULTIES)
                .map(
                  (d) => `
                <button
                  class="${wb.difficulty === d.id ? 'is-active' : ''}"
                  data-action="set-boss-difficulty"
                  data-value="${d.id}"
                  title="${esc(d.desc)}"
                >${esc(d.label)}</button>
              `
                )
                .join('')}
            </div>
          </div>

          ${
            trophies.length > 0
              ? `
            <div class="trophy-shelf">
              <div class="trophy-shelf-label">🏆 Boss Trophies (${trophies.length})</div>
              <div class="trophy-pills">
                ${trophies
                  .slice(-8)
                  .reverse()
                  .map(
                    (t) =>
                      `<span class="trophy-pill" title="Defeated ${esc(t.bossName)} (${t.maxHp} HP)">${esc(t.bossIcon)} ${esc(t.bossName)}</span>`
                  )
                  .join('')}
              </div>
            </div>
          `
              : ''
          }
        </div>
      `
          : ''
      }
    </section>
  `;
}

/**
 * Hero Player Banner (Dashboard).
 */
function renderHeroBanner(state, derived) {
  const p = state.profile;
  const pl = derived.playerLevelInfo;
  const hc = derived.heroClass;
  const streak = derived.streak;
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
        </div>
      </div>

      <div class="hero-stats hero-stats-four">
        <div class="hero-stat-box streak-box ${streak.current > 0 ? 'is-lit' : ''}">
          <div class="hero-stat-label">Streak &amp; Boost</div>
          <div class="hero-stat-value">🔥 ${streak.current}d · <span>${streak.multiplier.toFixed(1)}x</span></div>
          <div class="hero-stat-sub">${bossClaimable ? '🐉 Boss bounty ready!' : 'XP & Gold multiplier'}</div>
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

/**
 * TAB 3: TIME & STATS (ANALYTICS & HISTORY)
 */
export function renderStatsView(state, derived, uiState) {
  const tf = uiState.statsTimeframe || 'week';
  const filteredSessions = filterSessionsByTimeframe(state.sessions, tf);
  const activityMap = new Map(derived.activityStats.map((a) => [a.id, a]));

  const totalSeconds = filteredSessions.reduce((acc, s) => acc + s.durationSeconds, 0);
  const totalXp = filteredSessions.reduce((acc, s) => acc + s.xpEarned, 0);

  // Aggregate per-activity time within timeframe
  const byAct = new Map();
  for (const s of filteredSessions) {
    const prev = byAct.get(s.activityId) || { seconds: 0, xp: 0, count: 0 };
    prev.seconds += s.durationSeconds;
    prev.xp += s.xpEarned;
    prev.count += 1;
    byAct.set(s.activityId, prev);
  }

  const breakdown = Array.from(byAct.entries())
    .map(([actId, agg]) => {
      const act = activityMap.get(actId);
      if (!act) return null;
      const percent = totalSeconds > 0 ? Math.round((agg.seconds / totalSeconds) * 100) : 0;
      return {
        id: act.id,
        name: act.name,
        icon: act.icon,
        color: act.color,
        level: act.levelInfo.level,
        rankTitle: act.levelInfo.rankTitle,
        seconds: agg.seconds,
        xp: agg.xp,
        count: agg.count,
        percent,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.seconds - a.seconds);

  const topActivity = breakdown[0] || null;
  const leaderboard = [...derived.activityStats].sort((a, b) => b.levelInfo.totalXp - a.levelInfo.totalXp);

  const historyActivityFilter = uiState.historyActivityFilter || 'all';
  const historyList = [...filteredSessions]
    .filter((s) => historyActivityFilter === 'all' || s.activityId === historyActivityFilter)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 60);

  const tfLabels = { today: 'Today', week: 'Last 7 Days', month: 'Last 30 Days', all: 'All Time' };

  return `
    <div class="page-head-row">
      <div>
        <h1 class="page-title">Time &amp; Level Analytics</h1>
        <p class="page-sub">See exactly where your time goes and how every activity is leveling up.</p>
      </div>
      <div class="segmented" role="group" aria-label="Analytics timeframe">
        ${Object.entries(tfLabels)
          .map(
            ([key, label]) => `
          <button class="${tf === key ? 'is-active' : ''}" data-action="set-stats-timeframe" data-value="${key}">${label}</button>
        `
          )
          .join('')}
      </div>
    </div>

    <div class="kpi-grid">
      <div class="card kpi-card">
        <div class="kpi-label">Time Spent (${tfLabels[tf]})</div>
        <div class="kpi-value">${formatDurationShort(totalSeconds)}</div>
        <div class="kpi-sub">${filteredSessions.length} logged action${filteredSessions.length === 1 ? '' : 's'}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">XP Earned (${tfLabels[tf]})</div>
        <div class="kpi-value text-gold">+${totalXp.toLocaleString()} XP</div>
        <div class="kpi-sub">Current streak boost: ${derived.streak.multiplier.toFixed(1)}x</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Most Time Spent</div>
        <div class="kpi-value kpi-value-wrap" title="${topActivity ? esc(topActivity.name) : ''}">${topActivity ? `${esc(topActivity.icon)} ${esc(topActivity.name)}` : '—'}</div>
        <div class="kpi-sub">${topActivity ? `${formatDurationShort(topActivity.seconds)} (${topActivity.percent}%)` : 'Log an action to begin'}</div>
      </div>
      <div class="card kpi-card">
        <div class="kpi-label">Best Streak</div>
        <div class="kpi-value">🔥 ${derived.streak.longest} day${derived.streak.longest === 1 ? '' : 's'}</div>
        <div class="kpi-sub">Current streak: ${derived.streak.current} day${derived.streak.current === 1 ? '' : 's'}</div>
      </div>
    </div>

    <div class="stats-grid-two">
      <section class="card stats-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">⏱️ Time Spent Per Activity</h3>
            <p class="card-sub">Breakdown for ${tfLabels[tf].toLowerCase()}</p>
          </div>
        </div>
        <div class="donut-layout">
          <div class="donut-wrap">
            ${renderTimeDonutSvg(breakdown, totalSeconds)}
          </div>
          <div class="breakdown-list">
            ${
              breakdown.length === 0
                ? `<div class="empty-inline"><p>No actions logged in this timeframe yet.</p></div>`
                : breakdown
                    .map(
                      (b) => `
                <div class="breakdown-row">
                  <div class="breakdown-head">
                    <span class="breakdown-name">
                      <span class="color-dot" style="background: ${esc(b.color)}"></span>
                      ${esc(b.icon)} ${esc(b.name)}
                      <span class="mini-lvl-tag">Lv.${b.level}</span>
                    </span>
                    <span class="breakdown-val"><strong>${formatDurationShort(b.seconds)}</strong> · ${b.percent}%</span>
                  </div>
                  <div class="breakdown-bar-track">
                    <div class="breakdown-bar-fill" style="width: ${Math.max(3, b.percent)}%; background: ${esc(b.color)}"></div>
                  </div>
                </div>
              `
                    )
                    .join('')
            }
          </div>
        </div>
      </section>

      <section class="card stats-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">📊 Last 7 Days Rhythm</h3>
            <p class="card-sub">Daily total time tracked across all activities</p>
          </div>
        </div>
        <div class="weekly-chart-wrap">
          ${renderWeeklyBarsSvg(derived.dailySeries7d)}
        </div>
      </section>
    </div>

    <section class="card stats-card">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">🏆 Activity Level Leaderboard</h3>
          <p class="card-sub">Every activity’s current level, rank, XP progress, and lifetime hours</p>
        </div>
      </div>
      <div class="leaderboard-list">
        ${leaderboard
          .map((act, idx) => {
            const lv = act.levelInfo;
            return `
              <div class="leaderboard-row">
                <span class="lb-rank">#${idx + 1}</span>
                <span class="lb-icon" style="--act-color: ${esc(act.color)}">${esc(act.icon)}</span>
                <div class="lb-main">
                  <div class="lb-head">
                    <span class="lb-name">${esc(act.name)}</span>
                    <span class="rank-chip tier-${esc(lv.rankTier)}">${esc(lv.rankTitle)}</span>
                  </div>
                  <div class="xp-bar-track lb-xp-track">
                    <div class="xp-bar-fill" style="width: ${lv.progressPercent}%; background: ${esc(act.color)}"></div>
                  </div>
                </div>
                <div class="lb-metrics">
                  <span class="lb-lvl">LVL ${lv.level}</span>
                  <span class="lb-time">${formatDurationShort(act.totalSeconds)} · ${lv.totalXp.toLocaleString()} XP</span>
                </div>
              </div>
            `;
          })
          .join('')}
      </div>
    </section>

    <section class="card stats-card">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">🗂️ Action History Log</h3>
          <p class="card-sub">Every timed &amp; manually logged session (${tfLabels[tf].toLowerCase()})</p>
        </div>
        <select class="input-select" data-action="set-history-filter" aria-label="Filter history by activity">
          <option value="all" ${historyActivityFilter === 'all' ? 'selected' : ''}>All Activities</option>
          ${state.activities
            .map(
              (a) =>
                `<option value="${esc(a.id)}" ${historyActivityFilter === a.id ? 'selected' : ''}>${esc(a.icon)} ${esc(a.name)}</option>`
            )
            .join('')}
        </select>
      </div>

      ${
        historyList.length === 0
          ? `<div class="empty-inline"><p>No logged sessions match this filter yet.</p></div>`
          : `
        <div class="history-table-wrap">
          <table class="history-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th>Duration</th>
                <th>XP Earned</th>
                <th>Source</th>
                <th>When</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${historyList
                .map((s) => {
                  const act = activityMap.get(s.activityId);
                  if (!act) return '';
                  const dt = new Date(s.timestamp);
                  const dateLabel = dt.toLocaleString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return `
                    <tr>
                      <td>
                        <div class="history-act-cell">
                          <span class="history-icon" style="--act-color: ${esc(act.color)}">${esc(act.icon)}</span>
                          <div>
                            <div class="history-act-name">${esc(act.name)}</div>
                            ${s.note ? `<div class="history-note">${esc(s.note)}</div>` : ''}
                          </div>
                        </div>
                      </td>
                      <td><strong>${formatDurationShort(s.durationSeconds)}</strong></td>
                      <td class="text-gold">+${s.xpEarned} XP ${s.multiplier > 1 ? `<span class="mult-tag">${s.multiplier}x</span>` : ''}</td>
                      <td><span class="source-tag">${s.source === 'sprint' ? '⚡ Sprint' : s.source === 'timer' ? '⏱ Timer' : '✍️ Manual'}${s.sprintBonus ? ' +20%' : ''}</span></td>
                      <td class="text-muted">${esc(dateLabel)}</td>
                      <td>
                        <button class="btn-icon-tiny" data-action="delete-session" data-id="${esc(s.id)}" title="Delete session" aria-label="Delete session">✕</button>
                      </td>
                    </tr>
                  `;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      `
      }
    </section>
  `;
}

/**
 * TAB 4: QUESTS, ACHIEVEMENTS & RPG ATTRIBUTES VIEW
 */
export function renderQuestsAndBadgesView(state, derived) {
  const unlockedCount = derived.achievements.filter((a) => a.unlocked).length;
  const sortedAchievements = [...derived.achievements].sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
  const hc = derived.heroClass;

  return `
    <div class="page-head-row">
      <div>
        <h1 class="page-title">Quests, Boss Arena &amp; Character Sheet</h1>
        <p class="page-sub">Slay weekly bosses, complete daily quests, evolve your Hero Class, and collect badges.</p>
      </div>
      <button class="btn btn-primary" data-action="open-custom-quest">+ Add Custom Quest</button>
    </div>

    ${renderWeeklyBossCard(state, derived, false)}

    <div class="stats-grid-two">
      <section class="card stats-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">📜 Today’s Daily Quests</h3>
            <p class="card-sub">Progress updates automatically as you log time</p>
          </div>
          <span class="streak-pill-inline">🔥 ${derived.streak.current}d · ${derived.streak.multiplier.toFixed(1)}x XP</span>
        </div>
        <div class="quest-list">
          ${derived.dailyQuests.map(renderQuestRow).join('')}
        </div>
        <div class="streak-info-box">
          <strong>Streak Multiplier:</strong> Every consecutive day you log an action adds <strong>+10% XP &amp; Gold</strong> (up to <strong>2.0x</strong> at 11+ days).
        </div>
      </section>

      <section class="card stats-card">
        <div class="card-header-row">
          <div>
            <h3 class="card-title">🧭 Hero Class &amp; RPG Attributes</h3>
            <p class="card-sub">Your Hero Class evolves automatically from your strongest attributes</p>
          </div>
        </div>

        <div class="hero-class-banner" style="--class-color: ${esc(hc.accentColor)}">
          <div class="hero-class-icon">${esc(hc.icon)}</div>
          <div class="hero-class-copy">
            <div class="hero-class-kicker">Current Hero Class</div>
            <div class="hero-class-name">${esc(hc.name)}</div>
            <div class="hero-class-desc">${esc(hc.desc)}</div>
          </div>
        </div>

        <div class="radar-detail-layout">
          <div class="radar-wrap">
            ${renderAttributeRadarSvg(derived.attributeStats, 'quests')}
          </div>
          <div class="attr-detail-list">
            ${derived.attributeStats
              .map(
                (attr) => `
              <div class="attr-detail-row" style="--attr-color: ${esc(attr.color)}">
                <div class="attr-detail-head">
                  <span><strong>${esc(attr.icon)} ${esc(attr.label)}</strong> · Lv.${attr.levelInfo.level}</span>
                  <span class="text-muted">${formatDurationShort(attr.totalSeconds)}</span>
                </div>
                <div class="attr-detail-desc">${esc(attr.desc)}</div>
                <div class="xp-bar-track attr-xp-track">
                  <div class="xp-bar-fill" style="width: ${attr.levelInfo.progressPercent}%; background: ${esc(attr.color)}"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      </section>
    </div>

    <section class="card stats-card">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">🏅 Achievements &amp; Badges</h3>
          <p class="card-sub">${unlockedCount} of ${derived.achievements.length} unlocked — each grants bonus Player XP &amp; Gold!</p>
        </div>
      </div>

      <div class="achievements-grid">
        ${sortedAchievements
          .map(
            (ach) => `
          <div class="achievement-card ${ach.unlocked ? 'is-unlocked' : 'is-locked'}">
            <div class="ach-icon">${esc(ach.icon)}</div>
            <div class="ach-body">
              <div class="ach-head">
                <h4 class="ach-title">${esc(ach.title)}</h4>
                <span class="ach-xp">+${ach.xpReward} XP · +${Math.round(ach.xpReward * 0.3)}g</span>
              </div>
              <p class="ach-desc">${esc(ach.description)}</p>
              ${
                ach.unlocked
                  ? `<div class="ach-unlocked-tag">✓ Unlocked</div>`
                  : `
                <div class="quest-progress-row">
                  <div class="quest-bar-track">
                    <div class="quest-bar-fill" style="width: ${ach.progressPercent}%"></div>
                  </div>
                  <span class="quest-progress-label">${ach.current}/${ach.target} ${esc(ach.unit)}</span>
                </div>
              `
              }
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

/**
 * TAB 5: TAVERN REWARDS SHOP VIEW
 */
export function renderShopView(state, derived) {
  const gold = derived.gold;
  const rewards = [...(state.rewards || [])].sort((a, b) => Number(b.epic) - Number(a.epic) || a.cost - b.cost);
  const redemptions = [...(state.rewardRedemptions || [])].sort((a, b) => b.redeemedAt - a.redeemedAt);
  const splitOptions = [0, 25, 40, 50, 70];

  return `
    <div class="page-head-row">
      <div>
        <h1 class="page-title">Tavern Rewards Shop</h1>
        <p class="page-sub">Protect your Epic Goal savings in the Vault, pace treats with cooldowns, and redeem guilt-free.</p>
      </div>
      <button class="btn btn-primary" data-action="open-new-reward">+ Add Custom Reward</button>
    </div>

    <section class="shop-wallet-banner card">
      <div class="wallet-top-row">
        <div class="wallet-main">
          <div class="wallet-coin-emblem">🪙</div>
          <div>
            <div class="wallet-label">${gold.vaultEnabled ? 'Pocket Gold (Everyday Treats)' : 'Available Gold Balance'}</div>
            <div class="wallet-balance">${gold.pocketBalance.toLocaleString()} Gold</div>
          </div>
        </div>

        ${
          gold.vaultEnabled
            ? `
          <div class="wallet-vault-box">
            <div class="wallet-vault-head">
              <span class="wallet-label">🏦 Epic Savings Vault</span>
              <span class="vault-split-tag">${gold.vaultSplitPercent}% auto-save</span>
            </div>
            <div class="wallet-vault-value">${gold.vaultBalance.toLocaleString()} Gold</div>
            <div class="wallet-vault-actions">
              <button class="btn btn-soft btn-xs" data-action="vault-transfer" data-amount="100" ${gold.pocketBalance < 100 ? 'disabled' : ''} title="Move 100g from Pocket into Epic Vault">+ Stash 100g</button>
              ${
                gold.vaultManualDeposit > 0
                  ? `<button class="btn btn-ghost btn-xs" data-action="vault-transfer" data-amount="-100" title="Move stashed Gold back to Pocket">↩ -100g</button>`
                  : ''
              }
            </div>
          </div>
        `
            : ''
        }

        <div class="wallet-stats">
          <div class="wallet-mini">
            <span>Total Balance</span>
            <strong class="text-gold">${gold.balance.toLocaleString()}g</strong>
          </div>
          <div class="wallet-mini">
            <span>Lifetime Earned</span>
            <strong>+${gold.totalEarned.toLocaleString()}g</strong>
          </div>
          <div class="wallet-mini">
            <span>Earn Rate</span>
            <strong>~${Math.round(90 * derived.streak.multiplier)}g/hr</strong>
          </div>
        </div>
      </div>

      <div class="vault-controls-row">
        <span class="vault-controls-label">🏦 Epic Vault Auto-Save Split:</span>
        <div class="segmented-sm" role="group" aria-label="Epic Savings Vault split percentage">
          ${splitOptions
            .map(
              (pct) => `
            <button
              class="${gold.vaultSplitPercent === pct ? 'is-active' : ''}"
              data-action="set-vault-split"
              data-percent="${pct}"
              title="${pct === 0 ? 'Unified wallet (no separate Epic Vault)' : `Automatically save ${pct}% of all earned Gold for ★ Epic Goals`}"
            >${pct === 0 ? 'Off' : `${pct}%`}</button>
          `
            )
            .join('')}
        </div>
        <span class="vault-controls-hint">
          ${
            gold.vaultEnabled
              ? `Buying everyday treats uses Pocket Gold only — your Epic Vault stays safe!`
              : `Turn on an auto-save % to protect Gold for ★ Epic Goals like your Magnetic Keyboard.`
          }
        </span>
      </div>
    </section>

    <div class="shop-tip-bar">
      💡 Earn ~1.5g/min (× streak boost, plus <strong>+20%</strong> on completed ⚡ Focus Sprints), Daily Quests, Achievements &amp; Weekly Boss Bounties!
    </div>

    ${
      rewards.length === 0
        ? `
      <div class="empty-card card">
        <div class="empty-emoji">🪙</div>
        <h3>Stock your Tavern Shop</h3>
        <p>Add real-life treats or long-term savings goals you want to unlock with your earned Gold.</p>
        <button class="btn btn-primary" data-action="open-new-reward">+ Add Reward</button>
      </div>
    `
        : `
      <div class="rewards-grid">
        ${rewards
          .map((rew) => {
            const cd = getRewardCooldownInfo(rew, redemptions);
            const fundPool = rew.epic
              ? gold.vaultEnabled
                ? gold.vaultBalance
                : gold.balance
              : gold.pocketBalance;
            const canAffordExact = fundPool >= rew.cost;
            const canAffordCombined = rew.epic && gold.vaultEnabled && !canAffordExact && gold.balance >= rew.cost;
            const canRedeemNow = !cd.onCooldown && (canAffordExact || canAffordCombined);
            const pct = Math.min(100, Math.round((fundPool / rew.cost) * 100));
            const remaining = Math.max(0, rew.cost - fundPool);
            const timesRedeemed = redemptions.filter((r) => r.rewardId === rew.id).length;

            return `
              <article class="card reward-card ${rew.epic ? 'is-epic' : ''} ${canRedeemNow ? 'is-affordable' : ''} ${cd.onCooldown ? 'is-cooldown' : ''}">
                <div class="reward-card-head">
                  <div class="reward-icon-badge">${esc(rew.icon)}</div>
                  <div class="reward-head-right">
                    ${rew.epic ? `<span class="epic-tag">★ Epic Goal</span>` : ''}
                    ${rew.cooldownHours > 0 ? `<span class="cooldown-tag" title="Cooldown after each redemption">⏳ ${rew.cooldownHours}h cd</span>` : ''}
                    <span class="reward-cost-pill">🪙 ${rew.cost.toLocaleString()}g</span>
                    <button class="btn btn-ghost btn-xs btn-icon-only" data-action="open-edit-reward" data-id="${esc(rew.id)}" title="Edit reward" aria-label="Edit ${esc(rew.title)}">✎</button>
                  </div>
                </div>

                <h3 class="reward-title">${esc(rew.title)}</h3>
                ${rew.description ? `<p class="reward-desc">${esc(rew.description)}</p>` : ''}

                <div class="reward-progress-block">
                  <div class="xp-bar-track reward-bar-track">
                    <div class="xp-bar-fill ${rew.epic ? 'epic-fill' : 'gold-fill'}" style="width: ${pct}%"></div>
                  </div>
                  <div class="xp-meta-row">
                    <span>
                      ${rew.epic && gold.vaultEnabled ? '🏦 Vault: ' : gold.vaultEnabled ? '🪙 Pocket: ' : ''}
                      <strong>${Math.min(fundPool, rew.cost).toLocaleString()}</strong> / ${rew.cost.toLocaleString()}g (${pct}%)
                    </span>
                    <span>
                      ${
                        cd.onCooldown
                          ? `⏳ Ready in ${esc(cd.remainingLabel)}`
                          : canAffordExact
                            ? 'Ready to claim!'
                            : canAffordCombined
                              ? 'Unlockable using Vault + Pocket!'
                              : `${remaining.toLocaleString()}g to go`
                      }
                    </span>
                  </div>
                </div>

                <div class="reward-footer">
                  ${
                    cd.onCooldown
                      ? `<button class="btn btn-soft btn-sm flex-grow" disabled>⏳ Cooldown · ${esc(cd.remainingLabel)} left</button>`
                      : canRedeemNow
                        ? `<button class="btn btn-gold btn-sm flex-grow" data-action="redeem-reward" data-id="${esc(rew.id)}">🪙 Redeem for ${rew.cost.toLocaleString()}g</button>`
                        : `<button class="btn btn-soft btn-sm flex-grow" disabled>Locked · Need ${remaining.toLocaleString()}g more</button>`
                  }
                  ${timesRedeemed > 0 ? `<span class="redeemed-count-tag">Claimed ×${timesRedeemed}</span>` : ''}
                </div>
              </article>
            `;
          })
          .join('')}
      </div>
    `
    }

    <section class="card stats-card" style="margin-top: 1.4rem;">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">🎟️ Redeemed Treats History</h3>
          <p class="card-sub">Rewards you've earned and unlocked with Gold</p>
        </div>
      </div>
      ${
        redemptions.length === 0
          ? `<div class="empty-inline"><p>No treats redeemed yet — keep leveling up and treat yourself when you're ready!</p></div>`
          : `
        <div class="redemption-list">
          ${redemptions
            .slice(0, 20)
            .map((r) => {
              const dt = new Date(r.redeemedAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              return `
                <div class="redemption-row">
                  <span class="redemption-icon">${esc(r.icon)}</span>
                  <div class="redemption-info">
                    <div class="redemption-title">${esc(r.title)}</div>
                    <div class="redemption-meta">Redeemed ${esc(dt)}</div>
                  </div>
                  <span class="redemption-cost">-${r.cost.toLocaleString()}g</span>
                  <button class="btn btn-ghost btn-xs" data-action="refund-redemption" data-id="${esc(r.id)}" title="Undo redemption and refund Gold">↩ Refund</button>
                </div>
              `;
            })
            .join('')}
        </div>
      `
      }
    </section>
  `;
}

/**
 * MODALS
 */
export function renderModal(modalState, state, syncInfo = null) {
  if (!modalState) return '';

  if (modalState.type === 'activity') {
    const editing = modalState.activityId
      ? state.activities.find((a) => a.id === modalState.activityId)
      : null;

    const curName = editing ? editing.name : '';
    const curIcon = editing ? editing.icon : ACTIVITY_ICONS[0];
    const curColor = editing ? editing.color : ACTIVITY_COLORS[0];
    const curAttr = editing ? editing.attribute : 'craft';
    const curSecAttr = editing ? editing.secondaryAttribute || '' : '';
    const curGoal = editing ? editing.dailyGoalMinutes || '' : 30;

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">${editing ? 'Edit Activity' : 'Create New Activity'}</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="activity-form" class="modal-form" data-editing-id="${editing ? esc(editing.id) : ''}">
            <div class="form-field">
              <label for="act-name-input">Activity Name</label>
              <input id="act-name-input" name="name" type="text" required maxlength="48" placeholder="e.g., Chess, Guitar Practice, Walk with Friends..." value="${esc(curName)}" autofocus />
            </div>

            <div class="form-field">
              <label>Primary RPG Attribute <span class="label-hint">(100% XP, or 70% if combo selected)</span></label>
              <div class="attr-radio-grid">
                ${ATTRIBUTES.map(
                  (a) => `
                  <label class="attr-radio-card">
                    <input type="radio" name="attribute" value="${a.id}" ${curAttr === a.id ? 'checked' : ''} />
                    <span class="attr-radio-inner" style="--attr-color: ${esc(a.color)}">
                      <span>${esc(a.icon)}</span>
                      <span>${esc(a.label)}</span>
                    </span>
                  </label>
                `
                ).join('')}
              </div>
            </div>

            <div class="form-field">
              <label for="act-sec-attr">Secondary Combo Attribute <span class="label-hint">(optional · splits 30% XP)</span></label>
              <select id="act-sec-attr" name="secondaryAttribute" class="input-select">
                <option value="" ${!curSecAttr ? 'selected' : ''}>None — 100% Primary Attribute</option>
                ${ATTRIBUTES.map(
                  (a) =>
                    `<option value="${a.id}" ${curSecAttr === a.id ? 'selected' : ''}>+ ${esc(a.icon)} ${esc(a.label)} (30% Combo)</option>`
                ).join('')}
              </select>
            </div>

            <div class="form-field">
              <label>Icon</label>
              <div class="icon-picker-grid">
                ${ACTIVITY_ICONS.map(
                  (ic) => `
                  <label class="icon-choice">
                    <input type="radio" name="icon" value="${esc(ic)}" ${curIcon === ic ? 'checked' : ''} />
                    <span>${esc(ic)}</span>
                  </label>
                `
                ).join('')}
              </div>
            </div>

            <div class="form-row-two">
              <div class="form-field">
                <label>Glow Color</label>
                <div class="color-picker-row">
                  ${ACTIVITY_COLORS.map(
                    (c) => `
                    <label class="color-choice">
                      <input type="radio" name="color" value="${esc(c)}" ${curColor === c ? 'checked' : ''} />
                      <span style="background: ${esc(c)}"></span>
                    </label>
                  `
                  ).join('')}
                </div>
              </div>

              <div class="form-field">
                <label for="act-goal-input">Daily Goal (minutes, optional)</label>
                <input id="act-goal-input" name="dailyGoalMinutes" type="number" min="0" max="720" step="5" placeholder="e.g. 30" value="${esc(curGoal)}" />
              </div>
            </div>

            <div class="modal-footer">
              ${
                editing
                  ? `<button type="button" class="btn btn-danger-soft" data-action="delete-activity" data-id="${esc(editing.id)}">Delete</button>`
                  : '<span></span>'
              }
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">${editing ? 'Save Changes' : 'Create Activity'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'log') {
    const act = state.activities.find((a) => a.id === modalState.activityId) || state.activities[0];
    if (!act) return '';
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Log Time · ${esc(act.icon)} ${esc(act.name)}</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="manual-log-form" class="modal-form" data-activity-id="${esc(act.id)}">
            <div class="quick-preset-row">
              ${[10, 15, 30, 45, 60, 90]
                .map(
                  (m) =>
                    `<button type="button" class="btn btn-soft btn-xs" data-action="fill-log-minutes" data-minutes="${m}">${m}m</button>`
                )
                .join('')}
            </div>

            <div class="form-row-two">
              <div class="form-field">
                <label for="log-hours">Hours</label>
                <input id="log-hours" name="hours" type="number" min="0" max="16" value="0" />
              </div>
              <div class="form-field">
                <label for="log-minutes">Minutes</label>
                <input id="log-minutes" name="minutes" type="number" min="0" max="59" value="25" autofocus />
              </div>
            </div>

            <div class="form-field">
              <label for="log-note">What did you work on? (optional)</label>
              <input id="log-note" name="note" type="text" maxlength="120" placeholder="e.g., Finished chapter 3, 5k run..." />
            </div>

            <div class="modal-footer">
              <span></span>
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-gold">Log &amp; Claim XP</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'profile') {
    const p = state.profile;
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Customize Hero</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="profile-form" class="modal-form">
            <div class="form-field">
              <label for="hero-name-input">Hero Name</label>
              <input id="hero-name-input" name="name" type="text" required maxlength="32" value="${esc(p.name)}" autofocus />
            </div>
            <div class="form-field">
              <label>Avatar Crest</label>
              <div class="icon-picker-grid avatar-grid">
                ${PLAYER_AVATARS.map(
                  (av) => `
                  <label class="icon-choice">
                    <input type="radio" name="avatar" value="${esc(av)}" ${p.avatar === av ? 'checked' : ''} />
                    <span>${esc(av)}</span>
                  </label>
                `
                ).join('')}
              </div>
            </div>
            <div class="modal-footer">
              <span></span>
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Hero</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'custom-quest') {
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Add Custom Daily Quest</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="custom-quest-form" class="modal-form">
            <div class="form-field">
              <label for="cq-title">Quest Title</label>
              <input id="cq-title" name="title" type="text" required maxlength="64" placeholder="e.g., Tidy my desk, Drink 2L water..." autofocus />
            </div>
            <div class="form-field">
              <label for="cq-xp">Bonus XP Reward</label>
              <select id="cq-xp" name="xpReward" class="input-select">
                <option value="50">Small Quest (+50 XP)</option>
                <option value="100" selected>Medium Quest (+100 XP)</option>
                <option value="175">Boss Quest (+175 XP)</option>
              </select>
            </div>
            <div class="modal-footer">
              <span></span>
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Quest</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'backup') {
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">Data &amp; Backup</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <div class="backup-panel">
            <p class="text-muted">All your activities, levels, and tracked time are stored privately right in your browser. Export a JSON backup anytime to move devices or keep a safe copy.</p>

            <div class="backup-actions">
              <button class="btn btn-soft" data-action="toggle-fx">
                ${state.settings.fxEnabled !== false ? '✨ Visual Effects: ON' : '✨ Visual Effects: OFF'}
              </button>
              <button class="btn btn-primary" data-action="export-json">⬇ Download JSON Backup</button>
              <label class="btn btn-soft file-upload-btn">
                ⬆ Import JSON Backup
                <input type="file" id="import-json-input" accept="application/json,.json" hidden />
              </label>
            </div>

            <hr class="modal-divider" />

            <div class="backup-text-block">
              <div class="backup-text-head">
                <strong>Quick Copy / Paste Transfer</strong>
                <button type="button" class="btn btn-soft btn-xs" data-action="fill-backup-text">📋 Load Backup Text</button>
              </div>
              <textarea id="backup-json-box" class="backup-textarea" rows="4" placeholder="Click 'Load Backup Text' to copy, or paste backup JSON here to import..."></textarea>
              <button type="button" class="btn btn-gold btn-sm" data-action="import-backup-text">📥 Import Pasted JSON</button>
            </div>

            <hr class="modal-divider" />

            <div class="backup-secondary">
              <button class="btn btn-soft btn-sm" data-action="load-sample-data">✨ Load Sample Adventure</button>
              <button class="btn btn-danger-soft btn-sm" data-action="reset-all-data">🗑 Reset to Clean Slate</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'levelup') {
    const info = modalState.payload;
    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-levelup" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="levelup-rays"></div>
          <div class="levelup-badge">${esc(info.icon)}</div>
          <div class="levelup-kicker">LEVEL UP!</div>
          <h2 id="modal-title" class="levelup-heading">${esc(info.title)}</h2>
          <div class="levelup-levels">
            <span class="lvl-old">Lv.${info.oldLevel}</span>
            <span class="lvl-arrow">→</span>
            <span class="lvl-new">Lv.${info.newLevel}</span>
          </div>
          ${info.rankTitle ? `<div class="levelup-rank">Rank: <strong>${esc(info.rankTitle)}</strong></div>` : ''}
          ${info.subtitle ? `<p class="levelup-sub">${esc(info.subtitle)}</p>` : ''}
          <button class="btn btn-gold" data-action="close-modal">Keep Going! ✨</button>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'reward') {
    const editing = modalState.rewardId
      ? (state.rewards || []).find((r) => r.id === modalState.rewardId)
      : null;

    const curTitle = editing ? editing.title : '';
    const curIcon = editing ? editing.icon : REWARD_ICONS[0];
    const curCost = editing ? editing.cost : 150;
    const curCooldown = editing ? Number(editing.cooldownHours) || 0 : 0;
    const curDesc = editing ? editing.description : '';
    const curEpic = editing ? Boolean(editing.epic) : false;

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">${editing ? 'Edit Tavern Reward' : 'Add Custom Reward'}</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <form id="reward-form" class="modal-form" data-editing-id="${editing ? esc(editing.id) : ''}">
            <div class="form-field">
              <label for="rew-title-input">Reward Name</label>
              <input id="rew-title-input" name="title" type="text" required maxlength="64" placeholder="e.g., Fancy Coffee, New Headphones..." value="${esc(curTitle)}" autofocus />
            </div>

            <div class="form-row-two">
              <div class="form-field">
                <label for="rew-cost-input">Gold Cost 🪙</label>
                <input id="rew-cost-input" name="cost" type="number" required min="10" max="1000000" step="10" value="${esc(curCost)}" />
              </div>
              <div class="form-field">
                <label for="rew-cooldown-input">Cooldown ⏳ <span class="label-hint">(optional)</span></label>
                <select id="rew-cooldown-input" name="cooldownHours" class="input-select">
                  <option value="0" ${curCooldown === 0 ? 'selected' : ''}>No cooldown</option>
                  <option value="12" ${curCooldown === 12 ? 'selected' : ''}>12 hours</option>
                  <option value="24" ${curCooldown === 24 ? 'selected' : ''}>24 hours (1 day)</option>
                  <option value="48" ${curCooldown === 48 ? 'selected' : ''}>48 hours (2 days)</option>
                  <option value="72" ${curCooldown === 72 ? 'selected' : ''}>72 hours (3 days)</option>
                  <option value="168" ${curCooldown === 168 ? 'selected' : ''}>7 days (1 week)</option>
                </select>
              </div>
            </div>

            <div class="form-field">
              <label for="rew-desc-input">Note / Motivation (optional)</label>
              <input id="rew-desc-input" name="description" type="text" maxlength="140" placeholder="Why this reward feels awesome..." value="${esc(curDesc)}" />
            </div>

            <div class="form-field">
              <label>Icon</label>
              <div class="icon-picker-grid reward-icon-grid">
                ${REWARD_ICONS.map(
                  (ic) => `
                  <label class="icon-choice">
                    <input type="radio" name="icon" value="${esc(ic)}" ${curIcon === ic ? 'checked' : ''} />
                    <span>${esc(ic)}</span>
                  </label>
                `
                ).join('')}
              </div>
            </div>

            <label class="checkbox-row">
              <input type="checkbox" name="epic" ${curEpic ? 'checked' : ''} />
              <span>★ Mark as an <strong>Epic Goal</strong> (golden spotlight card)</span>
            </label>

            <div class="modal-footer">
              ${
                editing
                  ? `<button type="button" class="btn btn-danger-soft" data-action="delete-reward" data-id="${esc(editing.id)}">Delete</button>`
                  : '<span></span>'
              }
              <div class="modal-footer-right">
                <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-gold">${editing ? 'Save Reward' : 'Add to Shop'}</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  if (modalState.type === 'sync') {
    const info = syncInfo || {
      connected: false,
      username: null,
      gistId: null,
      gistUrl: null,
      status: 'idle',
      error: '',
      lastSyncedAt: 0,
      version: 0,
    };
    const isBusy = info.status === 'syncing';
    const lastSyncText = info.lastSyncedAt ? formatRelativeTime(info.lastSyncedAt) : 'Not synced yet';
    const handleLabel = info.username ? `@${info.username}` : 'GitHub Gist';

    if (info.connected) {
      return `
        <div class="modal-backdrop" data-action="close-modal-backdrop">
          <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div class="modal-head">
              <h2 id="modal-title">☁️ GitHub Cloud Sync Connected</h2>
              <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
            </div>
            <div class="sync-panel">
              <div class="sync-connected-box">
                <div class="sync-connected-row">
                  <span class="sync-dot is-ok"></span>
                  <strong>GitHub: <code>${esc(handleLabel)}</code></strong>
                  <span class="sync-rev-tag">v${info.version}</span>
                </div>
                <p class="sync-connected-sub">
                  Last synced: <strong>${esc(lastSyncText)}</strong>. Every session, level-up, Gold change, and live timer automatically syncs via your private GitHub Gist!
                </p>
                <div class="sync-meta-links">
                  <button type="button" class="btn btn-soft btn-xs" data-action="copy-sync-token">📋 Copy Token for Phone</button>
                  ${
                    info.gistUrl
                      ? `<a class="btn btn-ghost btn-xs" href="${esc(info.gistUrl)}" target="_blank" rel="noopener noreferrer">View Private Gist ↗</a>`
                      : ''
                  }
                </div>
              </div>

              ${info.error ? `<div class="sync-error-banner">⚠️ ${esc(info.error)}</div>` : ''}

              <div class="sync-instructions">
                <strong>To connect your phone or another browser:</strong>
                <p>Open this same LifeQuest link on your phone, tap <strong>☁️ Sync</strong>, and paste your <strong>same GitHub Sync Token</strong> — your private vault is found automatically!</p>
              </div>

              <div class="backup-actions">
                <button class="btn btn-primary" data-action="sync-now" ${isBusy ? 'disabled' : ''}>
                  ${isBusy ? '⏳ Syncing...' : '🔄 Sync Now'}
                </button>
                <button class="btn btn-danger-soft btn-sm" data-action="sync-logout" ${isBusy ? 'disabled' : ''}>
                  Sign Out on This Device
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="modal-backdrop" data-action="close-modal-backdrop">
        <div class="modal-card modal-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h2 id="modal-title">☁️ Free GitHub PC ↔ Phone Sync</h2>
            <button class="btn-icon-tiny" data-action="close-modal" aria-label="Close">✕</button>
          </div>
          <div class="sync-panel">
            <p class="text-muted" style="margin: 0;">
              Keep your activities, levels, Gold, Boss HP &amp; live timers synced across PC and phone using a <strong>private GitHub Gist</strong> — 100% free forever with zero credit caps!
            </p>

            <div class="sync-steps">
              <div class="sync-step">
                <span class="sync-step-num">1</span>
                <div class="sync-step-body">
                  <div><strong>Get a free GitHub Sync Token</strong> (only checks <code>gist</code>):</div>
                  <a class="btn btn-soft btn-xs sync-token-link-btn" href="${esc(GITHUB_TOKEN_CREATE_URL)}" target="_blank" rel="noopener noreferrer">
                    🔑 Create GitHub Token ↗
                  </a>
                  <span class="sync-step-hint">Set Expiration to <strong>No expiration</strong> (or 1 year), click <strong>Generate token</strong>, and copy the <code>ghp_...</code> code.</span>
                </div>
              </div>
              <div class="sync-step">
                <span class="sync-step-num">2</span>
                <div class="sync-step-body">
                  <strong>Paste it below on PC &amp; Phone</strong>
                  <span class="sync-step-hint">First device creates your private vault; your phone auto-finds and syncs it with the same token!</span>
                </div>
              </div>
            </div>

            ${info.error ? `<div class="sync-error-banner">⚠️ ${esc(info.error)}</div>` : ''}

            <form id="sync-auth-form" class="modal-form">
              <div class="form-field">
                <label for="sync-token-input">GitHub Sync Token <span class="label-hint">(<code>gist</code> scope)</span></label>
                <input
                  id="sync-token-input"
                  name="token"
                  type="password"
                  required
                  minlength="10"
                  maxlength="200"
                  placeholder="Paste ghp_... or github_pat_..."
                  autocomplete="off"
                  spellcheck="false"
                  autofocus
                />
              </div>

              <p class="sync-privacy-note">
                🔒 Stored only inside this browser's local storage and only talks directly to GitHub's official API.
              </p>

              <div class="modal-footer">
                <span></span>
                <div class="modal-footer-right">
                  <button type="button" class="btn btn-ghost" data-action="close-modal">Cancel</button>
                  <button type="submit" class="btn btn-gold" ${isBusy ? 'disabled' : ''}>
                    ${isBusy ? '⏳ Connecting...' : '☁️ Connect & Sync Now'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  return '';
}
