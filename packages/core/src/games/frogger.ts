import type { GameDefinition, GameHost } from '../types.js';

interface Car { x: number; w: number; }
interface Lane { y: number; speed: number; cars: Car[]; isWater: boolean; }

const state = {
  px: 240,
  py: 380,
  ni: 0,
  lanes: [] as Lane[],
};

export const frogger: GameDefinition = {
  id: 'frogger',
  name: 'Frog Hop',
  emoji: '🐸',
  desc: 'Rhythmic hopping across lanes',

  init(host: GameHost) {
    state.px = 240;
    state.py = 380;
    state.ni = 0;
    state.lanes = [];
    for (let i = 0; i < 10; i++) {
      const y = 340 - i * 36;
      const speed = (1 + Math.random() * 2) * (i % 2 === 0 ? 1 : -1);
      const cars: Car[] = [];
      const gap = 100 + Math.random() * 60;
      for (let c = 0; c < 4; c++) cars.push({ x: c * gap, w: 30 + Math.random() * 30 });
      state.lanes.push({ y, speed, cars, isWater: i >= 5 });
    }
    host.emit({ type: 'score', value: 0 });
  },

  onKey(key: string, down: boolean, host: GameHost) {
    if (!down) return;
    const W = host.width;
    if (key === 'ArrowUp' || key === 'w') {
      state.py -= 36;
      host.emit({ type: 'note', index: state.ni++ });
    }
    if (key === 'ArrowDown' || key === 's') {
      state.py += 36;
      host.emit({ type: 'note', index: Math.max(0, --state.ni) });
    }
    if (key === 'ArrowLeft' || key === 'a') state.px -= 20;
    if (key === 'ArrowRight' || key === 'd') state.px += 20;
    state.px = Math.max(10, Math.min(W - 10, state.px));
    state.py = Math.max(0, Math.min(380, state.py));
  },

  update(host: GameHost) {
    const W = host.width;
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
              host.emit({ type: 'note', index: 0 });
              state.px = 240;
              state.py = 380;
            }
          }
        }
      }
    }
    for (const l of state.lanes) {
      if (l.isWater && Math.abs(state.py - l.y) < 16 && !onLog) {
        host.emit({ type: 'note', index: 0 });
        state.px = 240;
        state.py = 380;
        break;
      }
    }
    if (state.py <= 0) {
      host.emit({ type: 'scoreDelta', delta: 100 });
      host.emit({ type: 'note', index: 12 });
      state.px = 240;
      state.py = 380;
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    const W = host.width;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, host.height);
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
  },
};
