import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Enemy { x: number; y: number; alive: boolean; w: number; h: number; }
interface Bullet { x: number; y: number; }

export const createInvaders: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;
  const H = deps.height;

  const state = {
    px: 240,
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    tick: 0,
    ed: 1,
    es: 0.4,
  };

  const init = () => {
    state.px = 240;
    state.bullets = [];
    state.enemies = [];
    state.tick = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        state.enemies.push({ x: 40 + c * 50, y: 30 + r * 36, alive: true, w: 30, h: 20 });
      }
    }
    state.ed = 1;
    state.es = 0.4;
    deps.setScore(0);
  };

  const update = () => {
    if (deps.keys['ArrowLeft'] || deps.keys['a']) state.px = Math.max(15, state.px - 4);
    if (deps.keys['ArrowRight'] || deps.keys['d']) state.px = Math.min(W - 15, state.px + 4);
    if (deps.keys[' '] && state.tick % 8 === 0) {
      state.bullets.push({ x: state.px, y: 370 });
      deps.playNote(12);
    }
    state.tick++;
    let edge = false;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      e.x += state.ed * state.es;
      if (e.x <= 5 || e.x >= W - 35) edge = true;
    }
    if (edge) {
      state.ed *= -1;
      for (const e of state.enemies) if (e.alive) e.y += 10;
    }
    for (const b of state.bullets) b.y -= 6;
    state.bullets = state.bullets.filter((b) => b.y > 0);
    for (const b of state.bullets) {
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
          e.alive = false;
          b.y = -10;
          deps.playNote(Math.floor(rng() * 8));
          deps.setScore(deps.getScore() + 25);
        }
      }
    }
    if (state.enemies.every((e) => !e.alive)) init();
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    for (const e of state.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = '#b829dd';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(e.x + 4, e.y + 4, 6, 6);
      ctx.fillRect(e.x + e.w - 10, e.y + 4, 6, 6);
    }
    ctx.fillStyle = '#22eeff';
    ctx.fillRect(state.px - 12, 375, 24, 10);
    ctx.fillRect(state.px - 2, 368, 4, 8);
    ctx.fillStyle = '#ffaa22';
    for (const b of state.bullets) ctx.fillRect(b.x - 1, b.y, 2, 8);
  };

  return {
    id: 'invaders',
    name: 'Space Synth',
    emoji: '👾',
    desc: 'Shooting gallery synth',
    init,
    update,
    draw,
  };
};
