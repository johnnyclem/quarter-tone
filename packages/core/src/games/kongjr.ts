import type { GameDefinition, GameHost } from '../types.js';

interface Vine { x: number; top: number; bottom: number; }
interface Fruit { x: number; y: number; alive: boolean; }

const state = {
  px: 60,
  py: 350,
  vy: 0,
  ov: false,
  vi: -1,
  vines: [] as Vine[],
  fruits: [] as Fruit[],
  ni: 0,
};

const reset = (host: GameHost): void => {
  state.px = 60;
  state.py = 350;
  state.vy = 0;
  state.ov = false;
  state.vi = -1;
  state.vines = [];
  for (let i = 0; i < 6; i++) {
    state.vines.push({ x: 80 + i * 65, top: 60, bottom: 340 });
  }
  state.fruits = [];
  for (let i = 0; i < 4; i++) {
    state.fruits.push({ x: 100 + i * 90, y: 100 + Math.random() * 200, alive: true });
  }
  state.ni = 0;
  host.emit({ type: 'score', value: 0 });
};

export const kongjr: GameDefinition = {
  id: 'kongjr',
  name: 'Kong Jr',
  emoji: '🐒',
  desc: 'Vine-swinging melodies',

  init(host: GameHost) {
    reset(host);
  },

  onKey(key: string, down: boolean, host: GameHost) {
    if (!down) return;
    if (key === ' ' || key === 'ArrowUp' || key === 'w') {
      if (!state.ov) {
        state.vy = -7;
        host.emit({ type: 'note', index: state.ni++ });
      }
    }
  },

  update(host: GameHost) {
    const W = host.width;
    if (state.ov) {
      if (host.isKeyDown('ArrowUp') || host.isKeyDown('w')) {
        state.py -= 3;
        host.emit({ type: 'note', index: state.ni++ % 12 });
      }
      if (host.isKeyDown('ArrowDown') || host.isKeyDown('s')) {
        state.py += 3;
        host.emit({ type: 'note', index: (state.ni++ + 4) % 12 });
      }
      if (host.isKeyDown('ArrowLeft') || host.isKeyDown('a')) {
        state.ov = false;
        state.px -= 15;
        state.vy = -3;
      }
      if (host.isKeyDown('ArrowRight') || host.isKeyDown('d')) {
        state.ov = false;
        state.px += 15;
        state.vy = -3;
      }
      const v = state.vines[state.vi];
      if (v) state.py = Math.max(v.top, Math.min(v.bottom, state.py));
    } else {
      if (host.isKeyDown('ArrowLeft') || host.isKeyDown('a')) state.px -= 3;
      if (host.isKeyDown('ArrowRight') || host.isKeyDown('d')) state.px += 3;
      state.vy += 0.3;
      state.py += state.vy;
      for (let i = 0; i < state.vines.length; i++) {
        const v = state.vines[i]!;
        if (Math.abs(state.px - v.x) < 12 && state.py >= v.top && state.py <= v.bottom) {
          state.ov = true;
          state.vi = i;
          state.vy = 0;
          state.px = v.x;
          host.emit({ type: 'note', index: i * 2 });
          break;
        }
      }
      if (state.py > 380) {
        state.py = 350;
        state.vy = 0;
      }
    }
    state.px = Math.max(0, Math.min(W, state.px));
    for (const f of state.fruits) {
      if (f.alive && Math.abs(state.px - f.x) < 14 && Math.abs(state.py - f.y) < 14) {
        f.alive = false;
        host.emit({ type: 'scoreDelta', delta: 50 });
        host.emit({ type: 'note', index: 10 });
      }
    }
    if (state.py < 60) {
      host.emit({ type: 'scoreDelta', delta: 200 });
      reset(host);
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, host.width, host.height);
    ctx.strokeStyle = '#44ff88';
    ctx.lineWidth = 3;
    for (const v of state.vines) {
      ctx.beginPath();
      ctx.moveTo(v.x, v.top);
      ctx.lineTo(v.x, v.bottom);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
    for (const f of state.fruits) {
      if (!f.alive) continue;
      ctx.fillStyle = '#ffaa22';
      ctx.beginPath();
      ctx.arc(f.x, f.y, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ff2d95';
    ctx.fillRect(state.px - 6, state.py - 12, 12, 14);
    ctx.fillStyle = '#ffaa22';
    ctx.fillRect(370, 30, 40, 30);
  },
};
