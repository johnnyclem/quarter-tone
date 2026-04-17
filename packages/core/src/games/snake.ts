import type { GameDefinition, GameHost } from '../types.js';

interface Cell { x: number; y: number; }

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

const spawnFood = (): Cell => ({
  x: Math.floor(Math.random() * COLS),
  y: Math.floor(Math.random() * ROWS),
});

const reset = (host: GameHost): void => {
  state.snake = [{ x: 10, y: 10 }];
  state.dir = { x: 1, y: 0 };
  state.nextDir = { x: 1, y: 0 };
  state.food = spawnFood();
  state.tick = 0;
  state.speed = 8;
  host.emit({ type: 'score', value: 0 });
};

export const snake: GameDefinition = {
  id: 'snake',
  name: 'Snake Beats',
  emoji: '🐍',
  desc: 'Growing snake = growing melody',

  init(host: GameHost) {
    reset(host);
  },

  onKey(key: string, down: boolean) {
    if (!down) return;
    if ((key === 'ArrowUp' || key === 'w') && state.dir.y === 0) state.nextDir = { x: 0, y: -1 };
    if ((key === 'ArrowDown' || key === 's') && state.dir.y === 0) state.nextDir = { x: 0, y: 1 };
    if ((key === 'ArrowLeft' || key === 'a') && state.dir.x === 0) state.nextDir = { x: -1, y: 0 };
    if ((key === 'ArrowRight' || key === 'd') && state.dir.x === 0) state.nextDir = { x: 1, y: 0 };
  },

  update(host: GameHost) {
    state.tick++;
    if (state.tick % state.speed !== 0) return;
    state.dir = { ...state.nextDir };
    const head = state.snake[0]!;
    const next: Cell = { x: head.x + state.dir.x, y: head.y + state.dir.y };
    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS ||
        state.snake.some((s) => s.x === next.x && s.y === next.y)) {
      host.emit({ type: 'note', index: 0 });
      reset(host);
      return;
    }
    state.snake.unshift(next);
    if (next.x === state.food.x && next.y === state.food.y) {
      state.food = spawnFood();
      host.emit({ type: 'note', index: state.snake.length });
      host.emit({ type: 'scoreDelta', delta: 10 });
    } else {
      state.snake.pop();
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    const W = host.width;
    const H = host.height;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < state.snake.length; i++) {
      const s = state.snake[i]!;
      const t = i / state.snake.length;
      ctx.fillStyle = 'hsl(' + (320 - t * 60) + ',80%,' + (60 - t * 20) + '%)';
      ctx.fillRect(s.x * 20 + 1, s.y * 20 + 1, 18, 18);
    }
    ctx.fillStyle = '#ffaa22';
    ctx.fillRect(state.food.x * 20 + 3, state.food.y * 20 + 3, 14, 14);
  },
};
