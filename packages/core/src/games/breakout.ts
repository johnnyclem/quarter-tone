import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  row: number;
  alive: boolean;
}

export const createBreakout: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;
  const H = deps.height;

  const state = {
    padX: 200,
    padW: 60,
    ball: { x: 240, y: 350, vx: 3, vy: -3, r: 5 },
    bricks: [] as Brick[],
  };

  const init = () => {
    state.padX = 200;
    state.padW = 60;
    state.ball = { x: 240, y: 350, vx: 3, vy: -3, r: 5 };
    state.bricks = [];
    const c = ['#ff2d95', '#b829dd', '#ffaa22', '#22eeff', '#ff6644'];
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 10; col++) {
        state.bricks.push({
          x: 14 + col * 46,
          y: 40 + r * 22,
          w: 42,
          h: 18,
          color: c[r],
          row: r,
          alive: true,
        });
      }
    }
    deps.setScore(0);
  };

  const update = () => {
    if (deps.keys['ArrowLeft'] || deps.keys['a']) state.padX = Math.max(0, state.padX - 6);
    if (deps.keys['ArrowRight'] || deps.keys['d']) state.padX = Math.min(W - state.padW, state.padX + 6);
    const b = state.ball;
    b.x += b.vx;
    b.y += b.vy;
    if (b.x <= b.r || b.x >= W - b.r) b.vx *= -1;
    if (b.y <= b.r) b.vy *= -1;
    if (b.y >= 390) {
      b.x = 240;
      b.y = 350;
      b.vx = 3 * (rng() > 0.5 ? 1 : -1);
      b.vy = -3;
    }
    if (b.y >= 370 && b.y <= 380 && b.x >= state.padX && b.x <= state.padX + state.padW) {
      b.vy = -Math.abs(b.vy);
      b.vx = ((b.x - state.padX) / state.padW - 0.5) * 6;
      deps.playNote(7);
    }
    for (const br of state.bricks) {
      if (!br.alive) continue;
      if (b.x >= br.x && b.x <= br.x + br.w && b.y >= br.y && b.y <= br.y + br.h) {
        br.alive = false;
        b.vy *= -1;
        deps.playNote(br.row * 2);
        deps.setScore(deps.getScore() + 10);
        break;
      }
    }
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    for (const br of state.bricks) {
      if (!br.alive) continue;
      ctx.fillStyle = br.color;
      ctx.fillRect(br.x, br.y, br.w, br.h);
    }
    ctx.fillStyle = '#ff2d95';
    ctx.fillRect(state.padX, 375, state.padW, 8);
    ctx.fillStyle = '#ffaa22';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
  };

  return {
    id: 'breakout',
    name: 'Brick Beats',
    emoji: '🧱',
    desc: 'Each row = different pitch',
    init,
    update,
    draw,
  };
};
