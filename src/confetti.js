/**
 * Upgraded Cozy RPG Particle & Celebration Engine
 * Supports: 'levelup' (confetti + golden shockwave), 'coins' (shimmering gold discs),
 *           'boss' (crimson-amber explosion + shockwaves), 'spark' (localized click burst).
 */

const PALETTES = {
  levelup: ['#fbbf24', '#818cf8', '#34d399', '#fb7185', '#38bdf8', '#fde68a', '#c084fc'],
  coins: ['#fbbf24', '#f59e0b', '#fde68a', '#fcd34d', '#fffbeb'],
  boss: ['#ef4444', '#fb7185', '#f97316', '#fbbf24', '#fde68a'],
  spark: ['#fbbf24', '#818cf8', '#38bdf8', '#34d399', '#fde68a'],
};

let particles = [];
let rings = [];
let rafId = null;

function isReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function drawStar(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const ox = x + Math.cos(a) * r;
    const oy = y + Math.sin(a) * r;
    const ia = a + Math.PI / 4;
    const ix = x + Math.cos(ia) * (r * 0.36);
    const iy = y + Math.sin(ia) * (r * 0.36);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

function ensureCanvasLoop() {
  if (rafId) return;
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  function frame(now) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Expanding shockwave rings
    rings = rings.filter((ring) => {
      const t = (now - ring.born) / ring.life;
      if (t < 0) return true;
      if (t >= 1) return false;
      const eased = 1 - Math.pow(1 - t, 3);
      const radius = Math.max(0.5, ring.startR + (ring.endR - ring.startR) * eased);
      ctx.save();
      ctx.globalAlpha = Math.max(0, (1 - t) * 0.72);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = Math.max(1, ring.lineWidth * (1 - t));
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      return true;
    });

    // Particles
    particles = particles.filter((p) => {
      const t = (now - p.born) / p.life;
      if (t < 0) return true;
      if (t >= 1) return false;

      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.rotation += p.vr;

      const alpha = t > 0.68 ? Math.max(0, 1 - (t - 0.68) / 0.32) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;

      if (p.shape === 'coin') {
        const scaleX = Math.max(0.22, Math.abs(Math.cos(p.rotation * 2.2)));
        ctx.scale(scaleX, 1);
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.56, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fffbeb';
        ctx.globalAlpha = alpha * 0.55;
        ctx.beginPath();
        ctx.arc(-p.size * 0.14, -p.size * 0.14, p.size * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        drawStar(ctx, 0, 0, p.size * 0.78);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.44, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      }

      ctx.restore();
      return true;
    });

    if (particles.length === 0 && rings.length === 0) {
      ctx.clearRect(0, 0, width, height);
      rafId = null;
      return;
    }

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);
}

export function launchConfetti({
  count = 95,
  durationMs = 2200,
  style = 'levelup',
  originX = null,
  originY = null,
} = {}) {
  if (typeof window === 'undefined' || isReducedMotion()) return;

  const width = window.innerWidth;
  const height = window.innerHeight;
  const ox = typeof originX === 'number' && originX > 0 ? originX : width * 0.5;
  const oy = typeof originY === 'number' && originY > 0 ? originY : height * 0.42;
  const palette = PALETTES[style] || PALETTES.levelup;
  const now = performance.now();

  if (style === 'levelup') {
    rings.push(
      { x: ox, y: oy, startR: 16, endR: 190, color: '#fbbf24', lineWidth: 5, born: now, life: 680 },
      { x: ox, y: oy, startR: 10, endR: 140, color: '#818cf8', lineWidth: 3, born: now + 90, life: 640 }
    );
  } else if (style === 'boss') {
    rings.push(
      { x: ox, y: oy, startR: 14, endR: 220, color: '#fb7185', lineWidth: 6, born: now, life: 700 },
      { x: ox, y: oy, startR: 8, endR: 155, color: '#fbbf24', lineWidth: 4, born: now + 80, life: 620 }
    );
  } else if (style === 'coins') {
    rings.push({ x: ox, y: oy, startR: 12, endR: 120, color: '#fbbf24', lineWidth: 3.5, born: now, life: 520 });
  } else if (style === 'spark') {
    rings.push({ x: ox, y: oy, startR: 6, endR: 54, color: '#fbbf24', lineWidth: 2.5, born: now, life: 380 });
  }

  for (let i = 0; i < count; i++) {
    const isSpark = style === 'spark';
    const angle = isSpark
      ? (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35
      : -Math.PI / 2 + (Math.random() - 0.5) * (style === 'boss' ? 2.4 : 1.7);
    const speed = isSpark ? 2.2 + Math.random() * 4.5 : 5 + Math.random() * 11;

    let shape = 'rect';
    if (style === 'coins') shape = i % 4 === 0 ? 'star' : 'coin';
    else if (style === 'spark') shape = i % 2 === 0 ? 'star' : 'circle';
    else if (style === 'boss') shape = i % 3 === 0 ? 'star' : i % 3 === 1 ? 'circle' : 'rect';
    else shape = i % 4 === 0 ? 'star' : i % 4 === 1 ? 'circle' : 'rect';

    particles.push({
      x: isSpark ? ox : ox + (Math.random() - 0.5) * 140,
      y: isSpark ? oy : oy + (Math.random() - 0.5) * 60,
      vx: Math.cos(angle) * speed + (isSpark ? 0 : (Math.random() - 0.5) * 3.5),
      vy: Math.sin(angle) * speed - (isSpark ? 1.2 : Math.random() * 2.5),
      gravity: isSpark ? 0.14 : style === 'coins' ? 0.34 : 0.25,
      drag: isSpark ? 0.94 : 0.988,
      size: isSpark ? 4.5 + Math.random() * 4.5 : style === 'coins' ? 7 + Math.random() * 5 : 5.5 + Math.random() * 6,
      color: palette[i % palette.length],
      rotation: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.26,
      shape,
      born: now,
      life: durationMs * (0.75 + Math.random() * 0.35),
    });
  }

  ensureCanvasLoop();
}
