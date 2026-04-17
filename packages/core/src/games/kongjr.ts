import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Vine {
  x: number;
  top: number;
  bottom: number;
}
interface Fruit {
  x: number;
  y: number;
  alive: boolean;
}

export const createKongJr: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;

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

  const init = () => {
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
      state.fruits.push({ x: 100 + i * 90, y: 100 + rng() * 200, alive: true });
    }
    state.ni = 0;
    deps.setScore(0);
  };

  const onKey = (k: string) => {
    if (k === ' ' || k === 'ArrowUp' || k === 'w') {
      if (!state.ov) {
        state.vy = -7;
        deps.playNote(state.ni++);
      }
    }
  };

  const update = () => {
    if (state.ov) {
      if (deps.keys['ArrowUp'] || deps.keys['w']) {
        state.py -= 3;
        deps.playNote(state.ni++ % 12);
      }
      if (deps.keys['ArrowDown'] || deps.keys['s']) {
        state.py += 3;
        deps.playNote((state.ni++ + 4) % 12);
      }
      if (deps.keys['ArrowLeft'] || deps.keys['a']) {
        state.ov = false;
        state.px -= 15;
        state.vy = -3;
      }
      if (deps.keys['ArrowRight'] || deps.keys['d']) {
        state.ov = false;
        state.px += 15;
        state.vy = -3;
      }
      const v = state.vines[state.vi];
      if (v) state.py = Math.max(v.top, Math.min(v.bottom, state.py));
    } else {
      if (deps.keys['ArrowLeft'] || deps.keys['a']) state.px -= 3;
      if (deps.keys['ArrowRight'] || deps.keys['d']) state.px += 3;
      state.vy += 0.3;
      state.py += state.vy;
      for (let i = 0; i < state.vines.length; i++) {
        const v = state.vines[i];
        if (Math.abs(state.px - v.x) < 12 && state.py >= v.top && state.py <= v.bottom) {
          state.ov = true;
          state.vi = i;
          state.vy = 0;
          state.px = v.x;
          deps.playNote(i * 2);
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
        deps.setScore(deps.getScore() + 50);
        deps.playNote(10);
      }
    }
    if (state.py < 60) {
      deps.setScore(deps.getScore() + 200);
      init();
    }
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, deps.height);
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
  };

  return {
    id: 'kongjr',
    name: 'Kong Jr',
    emoji: '🐒',
    desc: 'Vine-swinging melodies',
    init,
    update,
    draw,
    onKey,
  };
};
