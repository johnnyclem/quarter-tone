import type { GameDefinition, GameHost } from '../types.js';

interface Barrel { x: number; y: number; vx: number; vy: number; pi: number; }
interface Platform { x: number; y: number; w: number; }

const state = {
  px: 40,
  py: 360,
  vy: 0,
  og: true,
  barrels: [] as Barrel[],
  tick: 0,
  ni: 0,
  plats: [] as Platform[],
};

const reset = (host: GameHost): void => {
  state.px = 40;
  state.py = 360;
  state.vy = 0;
  state.og = true;
  state.barrels = [];
  state.tick = 0;
  state.ni = 0;
  state.plats = [
    { x: 0, y: 380, w: host.width },
    { x: 40, y: 310, w: 400 },
    { x: 20, y: 240, w: 420 },
    { x: 60, y: 170, w: 380 },
    { x: 0, y: 100, w: 400 },
  ];
  host.emit({ type: 'score', value: 0 });
};

export const kong: GameDefinition = {
  id: 'kong',
  name: 'Kong Climb',
  emoji: '🦍',
  desc: 'Barrels = falling arpeggios',

  init(host: GameHost) {
    reset(host);
  },

  update(host: GameHost) {
    const W = host.width;
    const H = host.height;
    if (host.isKeyDown('ArrowLeft') || host.isKeyDown('a')) state.px = Math.max(0, state.px - 3);
    if (host.isKeyDown('ArrowRight') || host.isKeyDown('d')) state.px = Math.min(W - 12, state.px + 3);
    if ((host.isKeyDown('ArrowUp') || host.isKeyDown('w') || host.isKeyDown(' ')) && state.og) {
      state.vy = -8;
      state.og = false;
      host.emit({ type: 'note', index: state.ni++ });
    }
    state.vy += 0.35;
    state.py += state.vy;
    state.og = false;
    for (const p of state.plats) {
      if (state.py >= p.y - 18 && state.py <= p.y && state.px >= p.x && state.px <= p.x + p.w && state.vy >= 0) {
        state.py = p.y - 18;
        state.vy = 0;
        state.og = true;
      }
    }
    if (state.py > H) {
      state.py = 360;
      state.px = 40;
      state.vy = 0;
    }
    state.tick++;
    if (state.tick % 80 === 0) {
      state.barrels.push({ x: 400, y: 88, vx: -2, vy: 0, pi: 4 });
    }
    for (const b of state.barrels) {
      b.x += b.vx;
      b.vy += 0.2;
      b.y += b.vy;
      for (let i = b.pi; i >= 0; i--) {
        const p = state.plats[i]!;
        if (b.y >= p.y - 10 && b.y <= p.y + 5 && b.x >= p.x && b.x <= p.x + p.w) {
          b.y = p.y - 10;
          b.vy = 0;
          b.pi = i;
          b.vx = (i % 2 === 0) ? -2 : 2;
          break;
        }
      }
      if (Math.abs(b.x - state.px) < 16 && Math.abs(b.y - state.py) < 16) {
        host.emit({ type: 'note', index: 0 });
        state.px = 40;
        state.py = 360;
      }
    }
    state.barrels = state.barrels.filter((b) => b.y < H && b.x > -20 && b.x < W + 20);
    if (state.py < 100) {
      host.emit({ type: 'scoreDelta', delta: 100 });
      host.emit({ type: 'note', index: 10 });
      reset(host);
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    const W = host.width;
    const H = host.height;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    for (const p of state.plats) {
      ctx.fillStyle = '#b829dd';
      ctx.fillRect(p.x, p.y, p.w, 6);
    }
    ctx.fillStyle = '#ffaa22';
    ctx.fillRect(380, 60, 30, 28);
    ctx.fillStyle = '#ff2d95';
    ctx.fillRect(state.px - 6, state.py - 16, 12, 16);
    ctx.fillStyle = '#ff6644';
    for (const b of state.barrels) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};
