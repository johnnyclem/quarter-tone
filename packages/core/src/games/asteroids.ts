import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}
interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export const createAsteroids: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;
  const H = deps.height;

  const state = {
    px: 240,
    py: 200,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    bullets: [] as Bullet[],
    asteroids: [] as Asteroid[],
    tick: 0,
    ni: 0,
  };

  const spawnField = (vmax: number) => {
    for (let i = 0; i < 6; i++) {
      state.asteroids.push({
        x: rng() * W,
        y: rng() * H,
        vx: (rng() - 0.5) * vmax,
        vy: (rng() - 0.5) * vmax,
        r: 20 + rng() * 15,
      });
    }
  };

  const init = () => {
    state.px = 240;
    state.py = 200;
    state.angle = -Math.PI / 2;
    state.vx = 0;
    state.vy = 0;
    state.bullets = [];
    state.asteroids = [];
    state.tick = 0;
    state.ni = 0;
    spawnField(2);
    deps.setScore(0);
  };

  const update = () => {
    if (deps.keys['ArrowLeft'] || deps.keys['a']) state.angle -= 0.06;
    if (deps.keys['ArrowRight'] || deps.keys['d']) state.angle += 0.06;
    if (deps.keys['ArrowUp'] || deps.keys['w']) {
      state.vx += Math.cos(state.angle) * 0.15;
      state.vy += Math.sin(state.angle) * 0.15;
    }
    state.px += state.vx;
    state.py += state.vy;
    state.vx *= 0.99;
    state.vy *= 0.99;
    if (state.px < 0) state.px = W;
    if (state.px > W) state.px = 0;
    if (state.py < 0) state.py = H;
    if (state.py > H) state.py = 0;
    state.tick++;
    if (deps.keys[' '] && state.tick % 8 === 0) {
      state.bullets.push({
        x: state.px + Math.cos(state.angle) * 14,
        y: state.py + Math.sin(state.angle) * 14,
        vx: Math.cos(state.angle) * 6,
        vy: Math.sin(state.angle) * 6,
        life: 50,
      });
      deps.playNote(state.ni++);
    }
    for (const b of state.bullets) {
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);
    for (const a of state.asteroids) {
      a.x += a.vx;
      a.y += a.vy;
      if (a.x < -30) a.x = W + 30;
      if (a.x > W + 30) a.x = -30;
      if (a.y < -30) a.y = H + 30;
      if (a.y > H + 30) a.y = -30;
    }
    for (const b of state.bullets) {
      for (let i = state.asteroids.length - 1; i >= 0; i--) {
        const a = state.asteroids[i];
        if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
          b.life = 0;
          if (a.r > 14) {
            for (let j = 0; j < 2; j++) {
              state.asteroids.push({
                x: a.x,
                y: a.y,
                vx: (rng() - 0.5) * 3,
                vy: (rng() - 0.5) * 3,
                r: a.r * 0.55,
              });
            }
          }
          state.asteroids.splice(i, 1);
          deps.playNote(state.ni++);
          deps.setScore(deps.getScore() + 25);
          break;
        }
      }
    }
    for (const a of state.asteroids) {
      if (Math.hypot(state.px - a.x, state.py - a.y) < a.r + 8) {
        deps.playNote(0);
        state.px = 240;
        state.py = 200;
        state.vx = 0;
        state.vy = 0;
      }
    }
    if (state.asteroids.length === 0) spawnField(3);
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(state.px, state.py);
    ctx.rotate(state.angle);
    ctx.fillStyle = '#22eeff';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.fill();
    ctx.restore();
    for (const a of state.asteroids) {
      ctx.strokeStyle = '#b829dd';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = '#ff2d95';
    for (const b of state.bullets) ctx.fillRect(b.x - 1, b.y - 1, 3, 3);
  };

  return {
    id: 'asteroids',
    name: 'Deep Spaced',
    emoji: '☄️',
    desc: 'Shooting & collisions = arps',
    init,
    update,
    draw,
  };
};
