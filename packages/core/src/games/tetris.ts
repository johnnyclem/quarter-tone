import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Piece {
  shape: number[][];
  color: string;
  type: number;
}

const SHAPES: number[][][] = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];
const COLORS = ['#22eeff', '#ffaa22', '#b829dd', '#ff2d95', '#44ff88', '#ff6644', '#ff2d95'];

export const createTetris: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;
  const H = deps.height;

  const state = {
    cols: 10,
    rows: 20,
    cw: 20,
    grid: [] as (string | 0)[][],
    tick: 0,
    ds: 30,
    piece: null as unknown as Piece,
    px: 3,
    py: 0,
  };

  const np = (): Piece => {
    const i = Math.floor(rng() * SHAPES.length);
    return { shape: SHAPES[i].map((r) => [...r]), color: COLORS[i], type: i };
  };

  const col = (px: number, py: number, s: number[][]): boolean => {
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const nx = px + c;
        const ny = py + r;
        if (nx < 0 || nx >= state.cols || ny >= state.rows) return true;
        if (ny >= 0 && state.grid[ny][nx]) return true;
      }
    }
    return false;
  };

  const init = () => {
    state.cols = 10;
    state.rows = 20;
    state.cw = 20;
    state.grid = Array.from({ length: state.rows }, () =>
      Array(state.cols).fill(0) as (string | 0)[],
    );
    state.tick = 0;
    state.ds = 30;
    state.piece = np();
    state.px = 3;
    state.py = 0;
    deps.setScore(0);
  };

  const lock = () => {
    for (let r = 0; r < state.piece.shape.length; r++) {
      for (let c = 0; c < state.piece.shape[r].length; c++) {
        if (!state.piece.shape[r][c]) continue;
        const ny = state.py + r;
        if (ny < 0) { init(); return; }
        state.grid[ny][state.px + c] = state.piece.color;
      }
    }
    let cl = 0;
    for (let r = state.rows - 1; r >= 0; r--) {
      if (state.grid[r].every((c) => c)) {
        state.grid.splice(r, 1);
        state.grid.unshift(Array(state.cols).fill(0) as (string | 0)[]);
        cl++;
        r++;
      }
    }
    if (cl > 0) {
      for (let i = 0; i < cl + 2; i++) deps.playNote(i * 2);
      deps.setScore(deps.getScore() + cl * 100);
    }
    state.piece = np();
    state.px = 3;
    state.py = 0;
    deps.playNote(state.piece.type);
  };

  const onKey = (k: string) => {
    if ((k === 'ArrowLeft' || k === 'a') && !col(state.px - 1, state.py, state.piece.shape)) state.px--;
    if ((k === 'ArrowRight' || k === 'd') && !col(state.px + 1, state.py, state.piece.shape)) state.px++;
    if (k === 'ArrowDown' || k === 's') {
      if (!col(state.px, state.py + 1, state.piece.shape)) state.py++;
    }
    if (k === 'ArrowUp' || k === 'w') {
      const rot = state.piece.shape[0].map((_, i) =>
        state.piece.shape.map((r) => r[i]).reverse(),
      );
      if (!col(state.px, state.py, rot)) {
        state.piece.shape = rot;
        deps.playNote(5);
      }
    }
  };

  const update = () => {
    state.tick++;
    if (state.tick % state.ds === 0) {
      if (!col(state.px, state.py + 1, state.piece.shape)) state.py++;
      else lock();
    }
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    const ox = (W - state.cols * state.cw) / 2;
    ctx.strokeStyle = 'rgba(184,41,221,0.1)';
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        ctx.strokeRect(ox + c * state.cw, r * state.cw, state.cw, state.cw);
      }
    }
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.grid[r][c]) {
          ctx.fillStyle = state.grid[r][c] as string;
          ctx.fillRect(ox + c * state.cw + 1, r * state.cw + 1, state.cw - 2, state.cw - 2);
        }
      }
    }
    ctx.fillStyle = state.piece.color;
    for (let r = 0; r < state.piece.shape.length; r++) {
      for (let c = 0; c < state.piece.shape[r].length; c++) {
        if (state.piece.shape[r][c]) {
          ctx.fillRect(
            ox + (state.px + c) * state.cw + 1,
            (state.py + r) * state.cw + 1,
            state.cw - 2,
            state.cw - 2,
          );
        }
      }
    }
  };

  return {
    id: 'tetris',
    name: 'Tetris Tones',
    emoji: '🟦',
    desc: 'Drops = notes, clears = chords',
    init,
    update,
    draw,
    onKey,
  };
};
