import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Cell { x: number; y: number; }

export const createSnake: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;
  const H = deps.height;
  const COLS = 24;
  const ROWS = 20;

  const state = {
    snake: [] as Cell[],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 0, y: 0 },
    tick: 0,
    speed: 8,
  };

  const sf = (): Cell => ({
    x: Math.floor(rng() * COLS),
    y: Math.floor(rng() * ROWS),
  });

  const init = () => {
    state.snake = [{ x: 10, y: 10 }];
    state.dir = { x: 1, y: 0 };
    state.nextDir = { x: 1, y: 0 };
    state.food = sf();
    state.tick = 0;
    state.speed = 8;
    deps.setScore(0);
  };

  const onKey = (k: string) => {
    if ((k === 'ArrowUp' || k === 'w') && state.dir.y === 0) state.nextDir = { x: 0, y: -1 };
    if ((k === 'ArrowDown' || k === 's') && state.dir.y === 0) state.nextDir = { x: 0, y: 1 };
    if ((k === 'ArrowLeft' || k === 'a') && state.dir.x === 0) state.nextDir = { x: -1, y: 0 };
    if ((k === 'ArrowRight' || k === 'd') && state.dir.x === 0) state.nextDir = { x: 1, y: 0 };
  };

  const update = () => {
    state.tick++;
    if (state.tick % state.speed !== 0) return;
    state.dir = { ...state.nextDir };
    const h = {
      x: state.snake[0].x + state.dir.x,
      y: state.snake[0].y + state.dir.y,
    };
    if (h.x < 0 || h.x >= COLS || h.y < 0 || h.y >= ROWS ||
        state.snake.some((s) => s.x === h.x && s.y === h.y)) {
      deps.playNote(0);
      init();
      return;
    }
    state.snake.unshift(h);
    if (h.x === state.food.x && h.y === state.food.y) {
      state.food = sf();
      deps.playNote(state.snake.length);
      deps.setScore(deps.getScore() + 10);
    } else {
      state.snake.pop();
    }
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < state.snake.length; i++) {
      const t = i / state.snake.length;
      ctx.fillStyle = 'hsl(' + (320 - t * 60) + ',80%,' + (60 - t * 20) + '%)';
      ctx.fillRect(state.snake[i].x * 20 + 1, state.snake[i].y * 20 + 1, 18, 18);
    }
    ctx.fillStyle = '#ffaa22';
    ctx.fillRect(state.food.x * 20 + 3, state.food.y * 20 + 3, 14, 14);
  };

  return {
    id: 'snake',
    name: 'Snake Beats',
    emoji: '🐍',
    desc: 'Growing snake = growing melody',
    init,
    update,
    draw,
    onKey,
  };
};
