import React, { useEffect, useRef } from 'react';

/**
 * DiwaliFireworks — Lightweight golden fireworks (performance optimised)
 * Key optimisations:
 *  - NO shadowBlur (biggest GPU drain removed)
 *  - Fewer particles per burst (40-70 vs 135-250 before)
 *  - Max 6 rockets alive at once
 *  - Short trails (3 pts max)
 *  - Single ctx.save/restore per draw pass, not per particle
 */

const GOLDEN_COLORS = [
  '#FFD700', '#FFC200', '#FFB800', '#FF8C00',
  '#FFEC8B', '#FFE066', '#FFA500', '#FFFFFF',
  '#FFF5B0', '#FFD460', '#FFFACD', '#FFF8DC',
];

function rand(a, b) { return a + Math.random() * (b - a); }
function randInt(a, b) { return Math.floor(rand(a, b)); }
function pickColor() { return GOLDEN_COLORS[randInt(0, GOLDEN_COLORS.length)]; }

// ─── Particle ─────────────────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color, isWillow) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1, 4);
    this.x = x; this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - rand(0.3, 2);
    this.color = color;
    this.alpha = 1;
    this.decay = isWillow ? rand(0.012, 0.022) : rand(0.016, 0.028);
    this.radius = rand(1, 2.8);
    this.gravity = isWillow ? rand(0.09, 0.16) : rand(0.05, 0.1);
    // short trail — max 3 points
    this.px = x; this.py = y; // previous position only (1-step trail)
    this.isStar = Math.random() > 0.65;
    this.shimPhase = rand(0, Math.PI * 2);
  }

  update() {
    this.px = this.x; this.py = this.y;
    this.vy += this.gravity;
    this.vx *= 0.987;
    this.x += this.vx; this.y += this.vy;
    this.alpha -= this.decay;
    this.shimPhase += 0.3;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    const a = Math.max(0, this.alpha);
    const shimA = a * (0.55 + 0.45 * Math.abs(Math.sin(this.shimPhase)));

    // trail dot (previous position, dimmer)
    ctx.globalAlpha = Math.max(0, shimA * 0.3);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.px, this.py, this.radius * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // main particle
    ctx.globalAlpha = Math.max(0, shimA);
    if (this.isStar && a > 0.4) {
      // Simple cross/plus star — cheap to draw
      const r = this.radius * 1.6;
      ctx.fillRect(this.x - r * 0.18, this.y - r, r * 0.36, r * 2);
      ctx.fillRect(this.x - r, this.y - r * 0.18, r * 2, r * 0.36);
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // white core sparkle (only when bright)
    if (a > 0.55) {
      ctx.globalAlpha = a * 0.55;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  isDead() { return this.alpha <= 0; }
}

// ─── Rocket ───────────────────────────────────────────────────────────────────
class Rocket {
  constructor(cw, ch) {
    this.x = rand(cw * 0.1, cw * 0.9);
    this.y = ch + 5;
    this.targetY = rand(ch * 0.07, ch * 0.5);
    this.speed = rand(7, 13);
    this.color = pickColor();
    this.drift = rand(-0.5, 0.5);
    // rocket trail — only store 8 pts
    this.trail = [];
    this.exploded = false;
    this.particles = [];
    this.isWillow = Math.random() < 0.5;
  }

  update() {
    if (this.exploded) {
      this.particles = this.particles.filter(p => !p.isDead());
      this.particles.forEach(p => p.update());
      return;
    }
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
    const dist = this.y - this.targetY;
    this.x += this.drift;
    this.y -= Math.min(this.speed, dist);
    if (this.y <= this.targetY) this.burst();
  }

  burst() {
    this.exploded = true;
    const count = randInt(40, 70); // was 90-160 — big reduction
    const secColor = pickColor();
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(this.x, this.y, this.color, this.isWillow));
    }
    // small secondary ring
    for (let i = 0; i < randInt(15, 28); i++) {
      const p = new Particle(this.x, this.y, secColor, false);
      const ang = (i / 24) * Math.PI * 2;
      const sp = rand(2, 4.5);
      p.vx = Math.cos(ang) * sp;
      p.vy = Math.sin(ang) * sp * 0.65;
      this.particles.push(p);
    }
    // white spark center (tiny, fast-decaying)
    for (let i = 0; i < randInt(8, 14); i++) {
      const p = new Particle(this.x, this.y, '#FFFFFF', false);
      p.decay = rand(0.04, 0.08);
      p.radius = rand(0.6, 1.5);
      this.particles.push(p);
    }
  }

  draw(ctx) {
    if (this.exploded) {
      // batch all particles by color to reduce fillStyle switches
      this.particles.forEach(p => {
        ctx.fillStyle = p.color;
        p.draw(ctx);
      });
      return;
    }
    // rocket trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = ((i + 1) / this.trail.length) * 0.7;
      ctx.globalAlpha = a;
      ctx.fillStyle = i > this.trail.length - 3 ? '#FFFFFF' : this.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, Math.max(0.4, 2.2 - (this.trail.length - i) * 0.22), 0, Math.PI * 2);
      ctx.fill();
    }
    // rocket head
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  isDone() { return this.exploded && this.particles.length === 0; }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DiwaliFireworks({ active = true }) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    rockets: [],
    rafId: null,
    lastLaunch: 0,
    interval: 900,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const s = stateRef.current;

    // canvas sizing
    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width  = rect ? rect.width  : window.innerWidth;
      canvas.height = rect ? rect.height : 560;
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const tick = (ts) => {
      s.rafId = requestAnimationFrame(tick);
      if (!active) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // launch — max 6 rockets alive at once
      if (ts - s.lastLaunch > s.interval && s.rockets.length < 6) {
        s.lastLaunch = ts;
        const batch = Math.random() > 0.7 ? 2 : 1;
        for (let b = 0; b < batch && s.rockets.length < 6; b++) {
          s.rockets.push(new Rocket(canvas.width, canvas.height));
        }
        s.interval = rand(700, 1500);
      }

      // update + draw
      s.rockets = s.rockets.filter(r => !r.isDone());
      ctx.save();
      s.rockets.forEach(r => { r.update(); r.draw(ctx); });
      ctx.restore();
    };

    s.rafId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(s.rafId);
      ro.disconnect();
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 5,
      }}
    />
  );
}
