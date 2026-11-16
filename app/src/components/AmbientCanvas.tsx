import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * AmbientCanvas (UI spec §7): one fixed <canvas>, z-index 0, pointer-events
 * none, aria-hidden — rendered behind every content layer (shell is z 1).
 *
 * Sprites, not per-frame paths: three 64×24 cubic-bezier "electron" squiggles
 * pre-rendered once to offscreen canvases (1.5px stroke; mint / violet / ember
 * at full alpha). Per frame: drawImage with globalAlpha 0.05–0.16 only — no
 * shadowBlur, no path building, no DOM nodes, no layout reads in the loop.
 *
 * Density: count = clamp(floor(w*h / 40000), 12, 48) desktop, capped at 24
 * below 768px. Drift 6–14 px/s, slow rotation ±10°, edge wrap-around.
 * Tone mix 50% mint / 35% violet / 15% ember. DPR capped at 1.5. A single
 * rAF loop, paused on document.visibilitychange, resize via one debounced
 * handler.
 *
 * `burst({x, y, count, tone})` — module-level one-shot celebration: 16
 * short-lived squiggles (life 700ms, ease-out drift + fade, slight rotation)
 * fired from the settle stamp's position. Only call site: the `mined` Tier B
 * landing in SendScreen. Disabled entirely under reduced motion.
 */

type Drift = {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; rotSpeed: number; phase: number;
  sprite: number;
  alpha: number;
};

type Spark = {
  x: number; y: number;
  vx: number; vy: number;
  rot: number; vr: number;
  sprite: number;
  life: number;
};

export type BurstSpec = { x: number; y: number; count?: number; tone?: "mint" | "violet" | "ember" };

let fire: ((spec: Required<BurstSpec>) => void) | null = null;

export function burst(spec: BurstSpec): void {
  fire?.({ x: spec.x, y: spec.y, count: spec.count ?? 16, tone: spec.tone ?? "mint" });
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeSprite(color: string): HTMLCanvasElement {
  const sprite = document.createElement("canvas");
  sprite.width = 64;
  sprite.height = 24;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(2, 12);
    ctx.bezierCurveTo(12, 2, 20, 22, 32, 12);
    ctx.bezierCurveTo(44, 2, 52, 22, 62, 12);
    ctx.stroke();
  }
  return sprite;
}

export function AmbientCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion() ?? false;

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const sprites = [makeSprite("#7fdcb4"), makeSprite("#a78bfa"), makeSprite("#ff9d5c")];
    let drift: Drift[] = [];
    let sparks: Spark[] = [];
    let raf = 0;
    let last = performance.now();
    let dpr = 1;

    const density = (w: number, h: number) => {
      const raw = Math.floor((w * h) / 40000);
      return w < 768 ? Math.min(raw, 24) : Math.max(12, Math.min(48, raw));
    };

    const spawn = (w: number, h: number) => {
      drift = [];
      const count = density(w, h);
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        drift.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: rand(6, 14) * (Math.random() < 0.5 ? -1 : 1),
          vy: rand(4, 9) * (Math.random() < 0.5 ? -1 : 1),
          rot: rand(-0.17, 0.17),
          rotSpeed: rand(0.12, 0.3) * (Math.random() < 0.5 ? -1 : 1),
          phase: Math.random() * Math.PI * 2,
          sprite: roll < 0.5 ? 0 : roll < 0.85 ? 1 : 2,
          alpha: rand(0.05, 0.16),
        });
      }
    };

    const drawParticle = (p: Drift, w: number, h: number, t: number) => {
      p.x += p.vx * t;
      p.y += p.vy * t;
      if (p.x < -40) p.x = w + 40;
      if (p.x > w + 40) p.x = -40;
      if (p.y < -30) p.y = h + 30;
      if (p.y > h + 30) p.y = -30;
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot + Math.sin(performance.now() / 3600 + p.phase) * 0.17);
      ctx.drawImage(sprites[p.sprite], -32, -12);
      ctx.restore();
    };

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn(w, h);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of drift) drawParticle(p, w, h, dt);
      if (sparks.length > 0) {
        sparks = sparks.filter((s) => {
          s.life -= dt;
          if (s.life <= 0) return false;
          const decay = Math.pow(0.12, dt); // ease-out drift
          s.vx *= decay;
          s.vy *= decay;
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.rot += s.vr * dt;
          const k = s.life / 0.7;
          ctx.save();
          ctx.globalAlpha = 0.85 * k * k;
          ctx.translate(s.x, s.y);
          ctx.rotate(s.rot);
          ctx.drawImage(sprites[s.sprite], -32, -12);
          ctx.restore();
          return true;
        });
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf);
      } else {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => { resize(); }, 200);
    };

    resize();

    if (reduce) {
      // Reduced motion: ONE static frame at half density, loop stopped, bursts disabled.
      const half = Math.max(6, Math.floor(drift.length / 2));
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < half; i++) {
        const p = drift[i];
        ctx.save();
        ctx.globalAlpha = p.alpha * 0.7;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(sprites[p.sprite], -32, -12);
        ctx.restore();
      }
      const redraw = () => {
        const w2 = window.innerWidth;
        const h2 = window.innerHeight;
        ctx.clearRect(0, 0, w2, h2);
        for (let i = 0; i < Math.min(half, drift.length); i++) {
          const p = drift[i];
          ctx.save();
          ctx.globalAlpha = p.alpha * 0.7;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.drawImage(sprites[p.sprite], -32, -12);
          ctx.restore();
        }
      };
      fire = () => { /* bursts disabled under reduced motion */ };
      window.addEventListener("resize", onResize);
      const onResizeStatic = () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => { resize(); redraw(); }, 200);
      };
      window.removeEventListener("resize", onResize);
      window.addEventListener("resize", onResizeStatic);
      return () => {
        fire = null;
        window.clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResizeStatic);
      };
    }

    fire = ({ x, y, count, tone }) => {
      const home = tone === "violet" ? 1 : tone === "ember" ? 2 : 0;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = rand(50, 150);
        sparks.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: Math.random() * Math.PI,
          vr: rand(-2.4, 2.4),
          sprite: Math.random() < 0.6 ? home : Math.floor(Math.random() * 3),
          life: 0.7,
        });
      }
    };

    raf = requestAnimationFrame(frame);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("resize", onResize);

    return () => {
      fire = null;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
    };
  }, [reduce]);

  return <canvas ref={ref} className="v3-ambient" aria-hidden="true" />;
}
