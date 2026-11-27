/**
 * Handcrafted SVG data visualizations for LifeQuest:
 *  - RPG 5-Axis Attribute Radar Chart
 *  - Time Distribution Donut Chart
 *  - 7-Day Activity Bar Chart
 */

import { formatDurationShort } from './rpgEngine.js';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * 5-Axis RPG Attribute Radar Chart (Mind, Body, Craft, Social, Vitality).
 */
export function renderAttributeRadarSvg(attributeStats, uid = 'dash') {
  const cx = 160;
  const cy = 148;
  const maxR = 86;
  const levels = [0.25, 0.5, 0.75, 1.0];
  const count = attributeStats.length || 5;

  const angleFor = (idx) => -Math.PI / 2 + (idx * Math.PI * 2) / count;
  const pointAt = (idx, radius) => {
    const a = angleFor(idx);
    return [cx + Math.cos(a) * radius, cy + Math.sin(a) * radius];
  };

  // Concentric pentagon grid rings
  const ringsSvg = levels
    .map((frac) => {
      const pts = attributeStats
        .map((_, i) => pointAt(i, maxR * frac).map((n) => n.toFixed(1)).join(','))
        .join(' ');
      return `<polygon points="${pts}" class="radar-grid-ring" />`;
    })
    .join('');

  // Spokes from center to vertices
  const spokesSvg = attributeStats
    .map((_, i) => {
      const [x, y] = pointAt(i, maxR);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" class="radar-spoke" />`;
    })
    .join('');

  // Data polygon
  const dataPoints = attributeStats.map((attr, i) => pointAt(i, maxR * attr.radarScore));
  const polygonPoints = dataPoints.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // Vertex glowing dots
  const dotsSvg = dataPoints
    .map(([x, y], i) => {
      const attr = attributeStats[i];
      return `
        <g class="radar-dot-group">
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="8" fill="${esc(attr.color)}" opacity="0.22" />
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" fill="${esc(attr.color)}" stroke="var(--bg-card)" stroke-width="1.5">
            <title>${esc(attr.label)}: Lv.${attr.levelInfo.level} · ${formatDurationShort(attr.totalSeconds)} (${attr.totalXp} XP)</title>
          </circle>
        </g>
      `;
    })
    .join('');

  // Outer axis labels with icon, name & level
  const labelsSvg = attributeStats
    .map((attr, i) => {
      const a = angleFor(i);
      const labelR = maxR + 30;
      const lx = cx + Math.cos(a) * labelR;
      const ly = cy + Math.sin(a) * labelR;
      let anchor = 'middle';
      if (Math.cos(a) > 0.25) anchor = 'start';
      if (Math.cos(a) < -0.25) anchor = 'end';

      // Slight vertical nudge for top/bottom labels
      const dyOffset = Math.sin(a) < -0.6 ? -4 : Math.sin(a) > 0.6 ? 6 : 0;

      return `
        <g class="radar-label-group">
          <text x="${lx.toFixed(1)}" y="${(ly + dyOffset).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-title">
            ${esc(attr.icon)} ${esc(attr.label)}
          </text>
          <text x="${lx.toFixed(1)}" y="${(ly + dyOffset + 14).toFixed(1)}" text-anchor="${anchor}" class="radar-axis-sub" fill="${esc(attr.color)}">
            Lv.${attr.levelInfo.level} · ${formatDurationShort(attr.totalSeconds)}
          </text>
        </g>
      `;
    })
    .join('');

  const capLevel = (attributeStats[0] && attributeStats[0].radarCapLevel) || 10;
  const tierLabel = (attributeStats[0] && attributeStats[0].radarTierLabel) || 'Tier I';
  const midLevel = Math.round(1 + (capLevel - 1) * 0.5);

  // Subtle scale tick labels on the 50% and 100% rings along the top spoke
  const ringTicksSvg = [
    { frac: 0.5, text: `Lv.${midLevel}` },
    { frac: 1.0, text: `Lv.${capLevel}` },
  ]
    .map(({ frac, text }) => {
      const y = cy - maxR * frac + 3;
      return `<text x="${cx + 6}" y="${y.toFixed(1)}" text-anchor="start" class="radar-ring-tick">${esc(text)}</text>`;
    })
    .join('');

  return `
    <svg viewBox="0 0 320 314" class="radar-svg" role="img" aria-label="RPG Attribute Radar Chart (${esc(tierLabel)}, outer ring Level ${capLevel})">
      <defs>
        <radialGradient id="radarFill-${esc(uid)}" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.45" />
          <stop offset="65%" stop-color="#818cf8" stop-opacity="0.32" />
          <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.2" />
        </radialGradient>
        <linearGradient id="radarStroke-${esc(uid)}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="50%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#34d399" />
        </linearGradient>
      </defs>
      ${ringsSvg}
      ${spokesSvg}
      ${ringTicksSvg}
      <polygon
        points="${polygonPoints}"
        fill="url(#radarFill-${esc(uid)})"
        stroke="url(#radarStroke-${esc(uid)})"
        stroke-width="2.4"
        stroke-linejoin="round"
        class="radar-polygon"
      />
      ${dotsSvg}
      ${labelsSvg}
      <text x="${cx}" y="305" text-anchor="middle" class="radar-scale-caption">
        ${esc(tierLabel)} · Outer ring: Lv.${capLevel} (auto-expands)
      </text>
    </svg>
  `;
}

/**
 * Time distribution SVG Donut Chart.
 * `slices`: [{ id, name, icon, color, seconds, percent }]
 */
export function renderTimeDonutSvg(slices, totalSeconds) {
  const size = 210;
  const cx = size / 2;
  const cy = size / 2;
  const r = 74;
  const circumference = 2 * Math.PI * r;

  if (!totalSeconds || slices.length === 0) {
    return `
      <svg viewBox="0 0 ${size} ${size}" class="donut-svg" role="img" aria-label="No time tracked yet">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-subtle)" stroke-width="20" stroke-dasharray="6 6" />
        <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-center-value">0m</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-center-label">No time logged</text>
      </svg>
    `;
  }

  let offset = 0;
  const segmentsSvg = slices
    .filter((s) => s.seconds > 0)
    .map((s) => {
      const fraction = s.seconds / totalSeconds;
      const segLen = Math.max(2, fraction * circumference - (slices.length > 1 ? 3 : 0));
      const dashArray = `${segLen.toFixed(2)} ${(circumference - segLen).toFixed(2)}`;
      const dashOffset = (-offset).toFixed(2);
      offset += fraction * circumference;

      return `
        <circle
          cx="${cx}"
          cy="${cy}"
          r="${r}"
          fill="none"
          stroke="${esc(s.color)}"
          stroke-width="20"
          stroke-linecap="butt"
          stroke-dasharray="${dashArray}"
          stroke-dashoffset="${dashOffset}"
          transform="rotate(-90 ${cx} ${cy})"
          class="donut-segment"
        >
          <title>${esc(s.name)}: ${formatDurationShort(s.seconds)} (${s.percent}%)</title>
        </circle>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" class="donut-svg" role="img" aria-label="Time distribution donut chart">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface-elevated)" stroke-width="20" />
      ${segmentsSvg}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-center-value">${esc(formatDurationShort(totalSeconds))}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-center-label">Total Time</text>
    </svg>
  `;
}

/**
 * 7-Day Activity Bar Chart SVG.
 */
export function renderWeeklyBarsSvg(dailySeries7d) {
  const width = 460;
  const height = 190;
  const padLeft = 16;
  const padRight = 16;
  const padTop = 26;
  const padBottom = 32;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const maxMinutes = Math.max(30, ...dailySeries7d.map((d) => d.minutes));
  const barSlot = chartW / dailySeries7d.length;
  const barW = Math.min(38, barSlot * 0.56);

  const gridLines = [0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = padTop + chartH * (1 - f);
      return `<line x1="${padLeft}" y1="${y.toFixed(1)}" x2="${width - padRight}" y2="${y.toFixed(1)}" class="bar-grid-line" />`;
    })
    .join('');

  const bars = dailySeries7d
    .map((day, idx) => {
      const xCenter = padLeft + idx * barSlot + barSlot / 2;
      const barH = day.seconds > 0 ? Math.max(6, (day.minutes / maxMinutes) * chartH) : 3;
      const y = padTop + chartH - barH;
      const fill = day.isToday
        ? 'url(#barTodayGrad)'
        : day.seconds > 0
          ? 'url(#barNormalGrad)'
          : 'var(--border-subtle)';
      const valueText = day.seconds > 0 ? formatDurationShort(day.seconds) : '';

      return `
        <g class="bar-group">
          <rect
            x="${(xCenter - barW / 2).toFixed(1)}"
            y="${y.toFixed(1)}"
            width="${barW.toFixed(1)}"
            height="${barH.toFixed(1)}"
            rx="7"
            fill="${fill}"
            class="bar-rect ${day.isToday ? 'is-today' : ''}"
          >
            <title>${esc(day.dateKey)}: ${formatDurationShort(day.seconds)} · +${day.xp} XP (${day.sessions} sessions)</title>
          </rect>
          ${
            valueText
              ? `<text x="${xCenter.toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" class="bar-value-label">${esc(valueText)}</text>`
              : ''
          }
          <text x="${xCenter.toFixed(1)}" y="${(height - 10).toFixed(1)}" text-anchor="middle" class="bar-day-label ${day.isToday ? 'is-today' : ''}">
            ${day.isToday ? 'Today' : esc(day.label)}
          </text>
        </g>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="weekly-bars-svg" role="img" aria-label="Last 7 days time spent">
      <defs>
        <linearGradient id="barNormalGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#818cf8" />
          <stop offset="100%" stop-color="#6366f1" stop-opacity="0.7" />
        </linearGradient>
        <linearGradient id="barTodayGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fbbf24" />
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.78" />
        </linearGradient>
      </defs>
      ${gridLines}
      ${bars}
    </svg>
  `;
}

/**
 * 90-Day Glowing RPG Activity Calendar Heatmap SVG (13 weeks x 7 days).
 */
export function renderActivityHeatmapSvg(heatmap) {
  if (!heatmap || !Array.isArray(heatmap.cells)) return '';

  const cellSize = 16;
  const gap = 4;
  const step = cellSize + gap;
  const padLeft = 32;
  const padTop = 22;
  const padRight = 10;
  const padBottom = 8;

  const width = padLeft + heatmap.weeks * step + padRight;
  const height = padTop + 7 * step + padBottom;

  const dayLabels = [
    { row: 0, text: 'Mon' },
    { row: 2, text: 'Wed' },
    { row: 4, text: 'Fri' },
    { row: 6, text: 'Sun' },
  ];

  const monthsSvg = (heatmap.monthLabels || [])
    .map(
      (m) => `
      <text x="${padLeft + m.col * step}" y="13" class="heatmap-month-label">${esc(m.label)}</text>
    `
    )
    .join('');

  const daysSvg = dayLabels
    .map(
      (d) => `
      <text x="${padLeft - 6}" y="${padTop + d.row * step + cellSize - 3}" text-anchor="end" class="heatmap-day-label">${d.text}</text>
    `
    )
    .join('');

  const cellsSvg = heatmap.cells
    .map((c) => {
      const x = padLeft + c.col * step;
      const y = padTop + c.row * step;
      const tip = c.seconds > 0
        ? `${c.dateKey}: ${formatDurationShort(c.seconds)} · +${c.xp} XP (${c.sessions} session${c.sessions === 1 ? '' : 's'})${c.shielded ? ' · ❄️ Shielded' : ''}`
        : c.shielded
          ? `${c.dateKey}: ❄️ Protected by Streak Freeze Shield`
          : `${c.dateKey}: Rest day (0m)`;

      return `
        <rect
          x="${x}"
          y="${y}"
          width="${cellSize}"
          height="${cellSize}"
          rx="4"
          class="heatmap-cell heat-lvl-${c.level}${c.shielded ? ' is-shielded' : ''}${c.isToday ? ' is-today' : ''}"
        >
          <title>${esc(tip)}</title>
        </rect>
      `;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${width} ${height}" class="heatmap-svg" role="img" aria-label="90-Day RPG Activity Heatmap">
      ${monthsSvg}
      ${daysSvg}
      ${cellsSvg}
    </svg>
  `;
}
