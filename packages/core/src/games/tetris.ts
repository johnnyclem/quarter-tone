import type { GameDefinition, GameHost } from '../types.js';

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

const newPiece = (): Piece => {
  const i = Math.floor(Math.random() * SHAPES.length);
  return { shape: SHAPES[i]!.map((r) => [...r]), color: COLORS[i]!, type: i };
};

const collides = (px: number, py: number, s: number[][]): boolean => {
  for (let r = 0; r < s.length; r++) {
    const row = s[r]!;
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      const nx = px + c;
      const ny = py + r;
      if (nx < 0 || nx >= state.cols || ny >= state.rows) return true;
      if (ny >= 0 && state.grid[ny]![nx]) return true;
    }
  }
  return false;
};

const reset = (host: GameHost): void => {
  state.cols = 10;
  state.rows = 20;
  state.cw = 20;
  state.grid = Array.from({ length: state.rows }, () =>
    Array(state.cols).fill(0) as (string | 0)[],
  );
  state.tick = 0;
  state.ds = 30;
  state.piece = newPiece();
  state.px = 3;
  state.py = 0;
  host.emit({ type: 'score', value: 0 });
};

const lock = (host: GameHost): void => {
  for (let r = 0; r < state.piece.shape.length; r++) {
    const row = state.piece.shape[r]!;
    for (let c = 0; c < row.length; c++) {
      if (!row[c]) continue;
      const ny = state.py + r;
      if (ny < 0) { reset(host); return; }
      state.grid[ny]![state.px + c] = state.piece.color;
    }
  }
  let cl = 0;
  for (let r = state.rows - 1; r >= 0; r--) {
    if (state.grid[r]!.every((c) => c)) {
      state.grid.splice(r, 1);
      state.grid.unshift(Array(state.cols).fill(0) as (string | 0)[]);
      cl++;
      r++;
    }
  }
  if (cl > 0) {
    const indices: number[] = [];
    for (let i = 0; i < cl + 2; i++) indices.push(i * 2);
    host.emit({ type: 'chord', indices });
    host.emit({ type: 'scoreDelta', delta: cl * 100 });
  }
  state.piece = newPiece();
  state.px = 3;
  state.py = 0;
  host.emit({ type: 'note', index: state.piece.type });
};

export const tetris: GameDefinition = {
  id: 'tetris',
  name: 'Tetris Tones',
  emoji: '🟦',
  desc: 'Drops = notes, clears = chords',

  init(host: GameHost) {
    reset(host);
  },

  onKey(key: string, down: boolean, host: GameHost) {
    if (!down) return;
    if ((key === 'ArrowLeft' || key === 'a') && !collides(state.px - 1, state.py, state.piece.shape)) state.px--;
    if ((key === 'ArrowRight' || key === 'd') && !collides(state.px + 1, state.py, state.piece.shape)) state.px++;
    if (key === 'ArrowDown' || key === 's') {
      if (!collides(state.px, state.py + 1, state.piece.shape)) state.py++;
    }
    if (key === 'ArrowUp' || key === 'w') {
      const first = state.piece.shape[0]!;
      const rot = first.map((_, i) =>
        state.piece.shape.map((r) => r[i]!).reverse(),
      );
      if (!collides(state.px, state.py, rot)) {
        state.piece.shape = rot;
        host.emit({ type: 'note', index: 5 });
      }
    }
  },

  update(host: GameHost) {
    state.tick++;
    if (state.tick % state.ds === 0) {
      if (!collides(state.px, state.py + 1, state.piece.shape)) state.py++;
      else lock(host);
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    const W = host.width;
    const H = host.height;
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
        const cell = state.grid[r]![c];
        if (cell) {
          ctx.fillStyle = cell as string;
          ctx.fillRect(ox + c * state.cw + 1, r * state.cw + 1, state.cw - 2, state.cw - 2);
        }
      }
    }
    ctx.fillStyle = state.piece.color;
    for (let r = 0; r < state.piece.shape.length; r++) {
      const row = state.piece.shape[r]!;
      for (let c = 0; c < row.length; c++) {
        if (row[c]) {
          ctx.fillRect(
            ox + (state.px + c) * state.cw + 1,
            (state.py + r) * state.cw + 1,
            state.cw - 2,
            state.cw - 2,
          );
        }
      }
    }
  },
};
