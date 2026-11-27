/**
 * TAB 3: TIME & STATS (ANALYTICS, 90-DAY HEATMAP, LEADERBOARD & HISTORY)
 */

import { filterSessionsByTimeframe, formatDurationShort } from '../rpgEngine.js';
import { renderActivityHeatmapSvg, renderTimeDonutSvg, renderWeeklyBarsSvg } from '../charts.js';
import { esc } from './helpers.js';

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
        <div class="kpi-sub">Current: ${derived.streak.current}d${derived.streakShields.available > 0 ? ` · ❄️ ${derived.streakShields.available} shield${derived.streakShields.available === 1 ? '' : 's'}` : ''}</div>
      </div>
    </div>

    <section class="card stats-card heatmap-card">
      <div class="card-header-row">
        <div>
          <h3 class="card-title">📅 90-Day Consistency Heatmap</h3>
          <p class="card-sub">Every glowing tile marks a day you showed up — hover any square for exact time &amp; XP</p>
        </div>
        <div class="heatmap-stats-pills">
          <span class="heatmap-stat-pill"><strong>${derived.heatmap90d.activeDays}</strong> active days</span>
          ${
            derived.heatmap90d.bestDay
              ? `<span class="heatmap-stat-pill">Best: <strong>${formatDurationShort(derived.heatmap90d.bestDay.seconds)}</strong></span>`
              : ''
          }
          <button type="button" class="heatmap-stat-pill heatmap-shield-pill" data-action="switch-tab" data-tab="shop" title="Buy Streak Freeze Shields in the Tavern Shop">
            ❄️ ${derived.streakShields.available}/${derived.streakShields.max} Shields
          </button>
        </div>
      </div>

      <div class="heatmap-scroll-wrap">
        ${renderActivityHeatmapSvg(derived.heatmap90d)}
      </div>

      <div class="heatmap-legend-row">
        <span class="heatmap-legend-note">❄️ Blue border = Streak Freeze Shield protected day</span>
        <div class="heatmap-legend-scale">
          <span>Rest</span>
          <span class="legend-swatch heat-lvl-0"></span>
          <span class="legend-swatch heat-lvl-1" title="< 30m"></span>
          <span class="legend-swatch heat-lvl-2" title="30m – 1h"></span>
          <span class="legend-swatch heat-lvl-3" title="1h – 2h"></span>
          <span class="legend-swatch heat-lvl-4" title="2h+"></span>
          <span>2h+</span>
        </div>
      </div>
    </section>

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
