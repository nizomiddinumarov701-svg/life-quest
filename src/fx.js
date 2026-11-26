/**
 * LifeQuest Cozy RPG Visual Effects Engine
 * - Ambient twilight fireflies / warm embers background canvas
 * - Floating RPG loot/XP/Gold/Boss-Crit numbers
 * - Localized particle spark bursts & shockwave rings
 * - Subtle interactive lantern spotlight + silky 3D hover tilt (desktop fine pointer)
 * - Button click ripple waves & boss impact shake
 */

const REDUCED_MOTION =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const FINE_POINTER =
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let fxEnabled = true;

export function setFxEnabled(enabled) {
  fxEnabled = Boolean(enabled);
  const ambient = document.getElementById('ambient-canvas');
  if (ambient) {
    ambient.style.opacity = fxEnabled ? '1' : '0';
  }
}

export function isFxEnabled() {
  return fxEnabled && !REDUCED_MOTION;
}

/**
 * 1. Ambient Floating Embers / Starlight Background Canvas
 */
export function initAmbientCanvas() {
  if (typeof window === 'undefined' || REDUCED_MOTION) return;
  const canvas = document.getElementById('ambient-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = window.innerWidth;
  let height = window.innerHeight;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const darkPalette = ['#fbbf24', '#818cf8', '#38bdf8', '#c084fc', '#34d399'];
  const lightPalette = ['#d97706', '#6366f1', '#0ea5e9', '#a855f7', '#059669'];

  const particleCount = width < 760 ? 22 : 38;
  const motes = Array.from({ length: particleCount }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 1.2 + Math.random() * 2.4,
    vx: (Math.random() - 0.5) * 0.22,
    vy: -0.15 - Math.random() * 0.32,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.012 + Math.random() * 0.02,
    colorIdx: i % darkPalette.length,
    baseAlpha: 0.22 + Math.random() * 0.42,
  }));

  let rafId = null;

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!fxEnabled || document.hidden) return;

    ctx.clearRect(0, 0, width, height);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const palette = isLight ? lightPalette : darkPalette;
    const alphaScale = isLight ? 0.55 : 1;

    for (const m of motes) {
      m.phase += m.phaseSpeed;
      m.x += m.vx + Math.sin(m.phase) * 0.16;
      m.y += m.vy;

      if (m.y < -12) {
        m.y = height + 12;
        m.x = Math.random() * width;
      }
      if (m.x < -12) m.x = width + 12;
      if (m.x > width + 12) m.x = -12;

      const pulse = 0.55 + 0.45 * Math.sin(m.phase * 1.4);
      const alpha = m.baseAlpha * pulse * alphaScale;
      const color = palette[m.colorIdx];

      // Soft outer halo
      ctx.save();
      ctx.globalAlpha = alpha * 0.35;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * 3.1, 0, Math.PI * 2);
      ctx.fill();

      // Bright glowing core
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  tick();

  return () => {
    if (rafId) cancelAnimationFrame(rafId);
  };
}

/**
 * 2. Floating RPG Loot / XP / Gold / Boss Crit Numbers
 * Spawns rising glowing popups near an origin point (x, y) or screen center-top.
 */
export function spawnFloatingText({ text, x, y, tone = 'xp', delayMs = 0, big = false }) {
  if (typeof document === 'undefined' || !isFxEnabled()) return;
  const layer = document.getElementById('fx-floating-layer');
  if (!layer) return;

  const posX = typeof x === 'number' && x > 0 ? x : window.innerWidth * 0.5;
  const posY = typeof y === 'number' && y > 0 ? y : Math.min(260, window.innerHeight * 0.35);

  setTimeout(() => {
    const el = document.createElement('div');
    el.className = `fx-float fx-tone-${tone}${big ? ' fx-big' : ''}`;
    el.textContent = text;
    const jitterX = (Math.random() - 0.5) * 34;
    el.style.left = `${Math.max(48, Math.min(window.innerWidth - 48, posX + jitterX))}px`;
    el.style.top = `${Math.max(60, Math.min(window.innerHeight - 90, posY))}px`;
    layer.appendChild(el);

    setTimeout(() => el.remove(), 1450);
  }, delayMs);
}

/**
 * 3. Button Click Ripple + Mini Spark
 */
export function triggerButtonRipple(buttonEl, clientX, clientY) {
  if (!buttonEl || !isFxEnabled()) return;
  const rect = buttonEl.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'btn-ripple';
  const size = Math.max(rect.width, rect.height) * 1.4;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${(clientX ? clientX - rect.left : rect.width / 2) - size / 2}px`;
  ripple.style.top = `${(clientY ? clientY - rect.top : rect.height / 2) - size / 2}px`;
  buttonEl.appendChild(ripple);
  setTimeout(() => ripple.remove(), 520);
}

/**
 * 4. Boss Impact Hit-Flash & Shake Animation
 */
export function triggerBossHitEffect(isCrit = false) {
  if (typeof document === 'undefined' || !isFxEnabled()) return;
  requestAnimationFrame(() => {
    const bossCards = document.querySelectorAll('.boss-card');
    bossCards.forEach((card) => {
      card.classList.remove('fx-boss-hit', 'fx-boss-crit');
      void card.offsetWidth; // restart CSS animation cleanly
      card.classList.add(isCrit ? 'fx-boss-crit' : 'fx-boss-hit');
      setTimeout(() => card.classList.remove('fx-boss-hit', 'fx-boss-crit'), 650);
    });
  });
}

/**
 * 5. Interactive Arcane Lantern Spotlight + Subtle 3D Tilt on Cards (Desktop only)
 */
export function initInteractiveCardEffects() {
  if (typeof document === 'undefined' || !FINE_POINTER || REDUCED_MOTION) return;

  let activeCard = null;
  const SELECTOR = '.activity-card, .reward-card, .hero-card, .boss-card, .kpi-card';

  document.addEventListener(
    'pointermove',
    (e) => {
      if (!fxEnabled) return;
      const card = e.target && e.target.closest ? e.target.closest(SELECTOR) : null;

      if (activeCard && activeCard !== card) {
        activeCard.style.removeProperty('--tilt-x');
        activeCard.style.removeProperty('--tilt-y');
        activeCard.classList.remove('is-tilting');
        activeCard = null;
      }

      if (!card) return;
      activeCard = card;

      const rect = card.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      const pctX = (relX / rect.width) * 100;
      const pctY = (relY / rect.height) * 100;

      card.style.setProperty('--mx', `${pctX.toFixed(1)}%`);
      card.style.setProperty('--my', `${pctY.toFixed(1)}%`);

      // Only apply subtle 3D tilt to smaller interactive cards (not giant banners)
      if (card.matches('.activity-card, .reward-card, .kpi-card')) {
        const tiltY = ((relX / rect.width) - 0.5) * 4.2; // max ±2.1deg
        const tiltX = (0.5 - (relY / rect.height)) * 4.2;
        card.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`);
        card.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`);
        card.classList.add('is-tilting');
      }
    },
    { passive: true }
  );

  document.addEventListener('pointerleave', () => {
    if (activeCard) {
      activeCard.style.removeProperty('--tilt-x');
      activeCard.style.removeProperty('--tilt-y');
      activeCard.classList.remove('is-tilting');
      activeCard = null;
    }
  });
}
