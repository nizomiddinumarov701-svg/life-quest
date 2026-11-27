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

  const THEME_PARTICLES = {
    twilight: {
      dark: ['#fbbf24', '#818cf8', '#38bdf8', '#c084fc', '#34d399'],
      light: ['#d97706', '#6366f1', '#0ea5e9', '#a855f7', '#059669'],
      mode: 'embers',
    },
    cyber: {
      dark: ['#22d3ee', '#f472b6', '#38bdf8', '#a855f7', '#2dd4bf'],
      light: ['#0891b2', '#db2777', '#0284c7', '#7c3aed', '#0d9488'],
      mode: 'cyber',
    },
    sakura: {
      dark: ['#f9a8d4', '#f472b6', '#fbcfe8', '#fda4af', '#fde68a'],
      light: ['#ec4899', '#f472b6', '#fb7185', '#e11d48', '#d97706'],
      mode: 'sakura',
    },
    dragon: {
      dark: ['#fb923c', '#ef4444', '#fbbf24', '#f97316', '#fb7185'],
      light: ['#ea580c', '#dc2626', '#d97706', '#e11d48', '#c2410c'],
      mode: 'dragon',
    },
    astral: {
      dark: ['#e0e7ff', '#a78bfa', '#38bdf8', '#fde047', '#c084fc'],
      light: ['#6366f1', '#7c3aed', '#0284c7', '#ca8a04', '#9333ea'],
      mode: 'astral',
    },
  };

  const particleCount = width < 760 ? 24 : 42;
  const motes = Array.from({ length: particleCount }, (_, i) => ({
    x: Math.random() * width,
    y: Math.random() * height,
    r: 1.3 + Math.random() * 2.6,
    vx: (Math.random() - 0.5) * 0.25,
    vy: 0.16 + Math.random() * 0.36,
    phase: Math.random() * Math.PI * 2,
    phaseSpeed: 0.012 + Math.random() * 0.022,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.03,
    colorIdx: i % 5,
    baseAlpha: 0.24 + Math.random() * 0.44,
  }));

  let rafId = null;

  function drawStar(x, y, radius) {
    ctx.beginPath();
    ctx.moveTo(x, y - radius * 2.1);
    ctx.quadraticCurveTo(x, y, x + radius * 2.1, y);
    ctx.quadraticCurveTo(x, y, x, y + radius * 2.1);
    ctx.quadraticCurveTo(x, y, x - radius * 2.1, y);
    ctx.quadraticCurveTo(x, y, x, y - radius * 2.1);
    ctx.closePath();
    ctx.fill();
  }

  function tick() {
    rafId = requestAnimationFrame(tick);
    if (!fxEnabled || document.hidden) return;

    ctx.clearRect(0, 0, width, height);
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const rpgTheme = document.documentElement.getAttribute('data-rpg-theme') || 'twilight';
    const cfg = THEME_PARTICLES[rpgTheme] || THEME_PARTICLES.twilight;
    const palette = isLight ? cfg.light : cfg.dark;
    const alphaScale = isLight ? 0.55 : 1;

    for (const m of motes) {
      m.phase += m.phaseSpeed;
      m.rot += m.rotSpeed;

      if (cfg.mode === 'sakura') {
        // Gentle falling drifting petals
        m.x += Math.sin(m.phase) * 0.42 + 0.18;
        m.y += m.vy * 1.15;
        if (m.y > height + 16) {
          m.y = -14;
          m.x = Math.random() * width;
        }
      } else if (cfg.mode === 'astral') {
        // Slow celestial drift
        m.x += m.vx * 0.35 + Math.sin(m.phase * 0.6) * 0.08;
        m.y -= m.vy * 0.25;
        if (m.y < -14) {
          m.y = height + 14;
          m.x = Math.random() * width;
        }
      } else if (cfg.mode === 'dragon') {
        // Energetic rising volcanic sparks
        m.x += m.vx * 1.4 + Math.sin(m.phase * 1.6) * 0.34;
        m.y -= m.vy * 1.55;
        if (m.y < -14) {
          m.y = height + 14;
          m.x = Math.random() * width;
        }
      } else if (cfg.mode === 'cyber') {
        // Crisp upward cyber sparks
        m.x += Math.sin(m.phase * 1.2) * 0.1;
        m.y -= m.vy * 1.3;
        if (m.y < -16) {
          m.y = height + 16;
          m.x = Math.random() * width;
        }
      } else {
        // Twilight cozy embers
        m.x += m.vx + Math.sin(m.phase) * 0.16;
        m.y -= m.vy;
        if (m.y < -12) {
          m.y = height + 12;
          m.x = Math.random() * width;
        }
      }

      if (m.x < -16) m.x = width + 16;
      if (m.x > width + 16) m.x = -16;

      const pulse = 0.5 + 0.5 * Math.sin(m.phase * 1.5);
      const alpha = m.baseAlpha * (0.45 + 0.55 * pulse) * alphaScale;
      const color = palette[m.colorIdx % palette.length];

      ctx.save();
      ctx.fillStyle = color;

      if (cfg.mode === 'sakura') {
        ctx.translate(m.x, m.y);
        ctx.rotate(m.rot);
        ctx.globalAlpha = alpha * 0.85;
        ctx.beginPath();
        ctx.ellipse(0, 0, m.r * 2.1, m.r * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * 0.35;
        ctx.beginPath();
        ctx.arc(0, 0, m.r * 2.6, 0, Math.PI * 2);
        ctx.fill();
      } else if (cfg.mode === 'cyber') {
        // Neon diamond + crisp vertical digital trail
        ctx.globalAlpha = alpha * 0.25;
        ctx.fillRect(m.x - 0.7, m.y, 1.4, m.r * 6.5);
        ctx.translate(m.x, m.y);
        ctx.rotate(Math.PI / 4);
        ctx.globalAlpha = alpha * 0.95;
        const sz = m.r * 1.7;
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      } else if (cfg.mode === 'astral') {
        // Twinkling 4-point star
        ctx.globalAlpha = alpha * 0.28;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = alpha * (0.65 + 0.35 * pulse);
        drawStar(m.x, m.y, m.r * (0.75 + 0.45 * pulse));
      } else {
        // Embers & Dragon Forge fiery sparks
        const haloMult = cfg.mode === 'dragon' ? 3.8 : 3.1;
        ctx.globalAlpha = alpha * (cfg.mode === 'dragon' ? 0.42 : 0.35);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * haloMult, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
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
