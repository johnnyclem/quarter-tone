import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Car { x: number; w: number; }
interface Lane { y: number; speed: number; cars: Car[]; isWater: boolean; }

export const createFrogger: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;

  const state = {
    px: 240,
    py: 380,
    ni: 0,
    lanes: [] as Lane[],
  };

  const init = () => {
    state.px = 240;
    state.py = 380;
    state.ni = 0;
    state.lanes = [];
    for (let i = 0; i < 10; i++) {
      const y = 340 - i * 36;
      const speed = (1 + rng() * 2) * (i % 2 === 0 ? 1 : -1);
      const cars: Car[] = [];
      const gap = 100 + rng() * 60;
      for (let c = 0; c < 4; c++) cars.push({ x: c * gap, w: 30 + rng() * 30 });
      state.lanes.push({ y, speed, cars, isWater: i >= 5 });
    }
    deps.setScore(0);
  };

  const onKey = (k: string) => {
    if (k === 'ArrowUp' || k === 'w') {
      state.py -= 36;
      deps.playNote(state.ni++);
    }
    if (k === 'ArrowDown' || k === 's') {
      state.py += 36;
      deps.playNote(Math.max(0, --state.ni));
    }
    if (k === 'ArrowLeft' || k === 'a') state.px -= 20;
    if (k === 'ArrowRight' || k === 'd') state.px += 20;
    state.px = Math.max(10, Math.min(W - 10, state.px));
    state.py = Math.max(0, Math.min(380, state.py));
  };

  const update = () => {
    let onLog = false;
    for (const l of state.lanes) {
      for (const c of l.cars) {
        c.x += l.speed;
        if (c.x > W + 40) c.x = -c.w - 20;
        if (c.x < -c.w - 20) c.x = W + 40;
        if (Math.abs(state.py - l.y) < 16) {
          if (state.px >= c.x && state.px <= c.x + c.w) {
            if (l.isWater) {
              onLog = true;
              state.px += l.speed;
            } else {
              deps.playNote(0);
              state.px = 240;
              state.py = 380;
            }
          }
        }
      }
    }
    for (const l of state.lanes) {
      if (l.isWater && Math.abs(state.py - l.y) < 16 && !onLog) {
        deps.playNote(0);
        state.px = 240;
        state.py = 380;
        break;
      }
    }
    if (state.py <= 0) {
      deps.setScore(deps.getScore() + 100);
      deps.playNote(12);
      state.px = 240;
      state.py = 380;
    }
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, deps.height);
    ctx.fillStyle = 'rgba(68,255,136,0.1)';
    ctx.fillRect(0, 370, W, 30);
    ctx.fillRect(0, 0, W, 16);
    for (const l of state.lanes) {
      ctx.fillStyle = l.isWater ? 'rgba(34,100,238,0.15)' : 'rgba(50,30,50,0.3)';
      ctx.fillRect(0, l.y - 14, W, 30);
      for (const c of l.cars) {
        ctx.fillStyle = l.isWater ? '#44aa66' : '#ff6644';
        ctx.fillRect(c.x, l.y - 8, c.w, 18);
      }
    }
    ctx.fillStyle = '#44ff88';
    ctx.beginPath();
    ctx.arc(state.px, state.py, 10, 0, Math.PI * 2);
    ctx.fill();
  };

  return {
    id: 'frogger',
    name: 'Frog Hop',
    emoji: '🐸',
    desc: 'Rhythmic hopping across lanes',
    init,
    update,
    draw,
    onKey,
  };
};
