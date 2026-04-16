import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

export const createPong: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;
  const H = deps.height;

  const state = {
    ball: { x: 240, y: 200, vx: 3, vy: 2.5, r: 6 },
    padY: 180,
    cpuY: 180,
    padH: 60,
    noteIdx: 0,
  };

  const init = () => {
    state.ball = { x: 240, y: 200, vx: 3, vy: 2.5, r: 6 };
    state.padY = 180;
    state.cpuY = 180;
    state.padH = 60;
    state.noteIdx = 0;
    deps.setScore(0);
  };

  const update = () => {
    const b = state.ball;
    if (deps.keys['ArrowUp'] || deps.keys['w']) state.padY = Math.max(0, state.padY - 5);
    if (deps.keys['ArrowDown'] || deps.keys['s']) state.padY = Math.min(H - state.padH, state.padY + 5);
    state.cpuY += (b.y - state.cpuY - state.padH / 2) * 0.06;
    state.cpuY = Math.max(0, Math.min(H - state.padH, state.cpuY));
    b.x += b.vx;
    b.y += b.vy;
    if (b.y <= b.r || b.y >= H - b.r) {
      b.vy *= -1;
      deps.playNote(state.noteIdx++);
    }
    if (b.x <= 22 && b.y >= state.padY && b.y <= state.padY + state.padH) {
      b.vx = Math.abs(b.vx) * 1.02;
      deps.playNote(state.noteIdx++);
      deps.setScore(deps.getScore() + 10);
    }
    if (b.x >= W - 22 && b.y >= state.cpuY && b.y <= state.cpuY + state.padH) {
      b.vx = -Math.abs(b.vx) * 1.02;
      deps.playNote(state.noteIdx++);
    }
    if (b.x < -10 || b.x > W + 10) {
      b.x = 240;
      b.y = 200;
      b.vx = 3 * (rng() > 0.5 ? 1 : -1);
      b.vy = 2.5 * (rng() > 0.5 ? 1 : -1);
    }
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(184,41,221,0.3)';
    ctx.beginPath();
    ctx.moveTo(240, 0);
    ctx.lineTo(240, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff2d95';
    ctx.fillRect(10, state.padY, 10, state.padH);
    ctx.fillStyle = '#b829dd';
    ctx.fillRect(W - 20, state.cpuY, 10, state.padH);
    ctx.fillStyle = '#ffaa22';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
  };

  return {
    id: 'pong',
    name: 'Sound Pong',
    emoji: '🏓',
    desc: 'Ball bounces trigger notes',
    init,
    update,
    draw,
  };
};
