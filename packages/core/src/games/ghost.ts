import type { DrawingContext, Game, GameDeps, GameFactory } from '../types.js';

interface Ghost {
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
}

export const createGhost: GameFactory = (deps: GameDeps): Game => {
  const rng = deps.random ?? Math.random;
  const W = deps.width;
  const H = deps.height;

  const state = {
    cs: 20,
    cols: 21,
    rows: 19,
    maze: [] as number[][],
    px: 10,
    py: 14,
    dir: { x: 0, y: 0 },
    nd: { x: 0, y: 0 },
    dots: new Set<string>(),
    ghosts: [] as Ghost[],
    ni: 0,
    tick: 0,
  };

  const gm = (): number[][] => {
    const h = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1],
      [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1],
      [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1],
      [1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0],
      [1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 1],
      [1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1],
      [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ];
    return h.map((r) => {
      const right = [...r].reverse().slice(1);
      return [...r, ...right];
    });
  };

  const init = () => {
    state.maze = gm();
    state.px = 10;
    state.py = 14;
    state.dir = { x: 0, y: 0 };
    state.nd = { x: 0, y: 0 };
    state.dots = new Set<string>();
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.maze[r][c] === 0) state.dots.add(r + ',' + c);
      }
    }
    state.dots.delete(state.py + ',' + state.px);
    state.ghosts = [
      { x: 9, y: 8, color: '#ff2d95', vx: 1, vy: 0 },
      { x: 10, y: 8, color: '#22eeff', vx: -1, vy: 0 },
      { x: 11, y: 8, color: '#ffaa22', vx: 0, vy: 1 },
    ];
    state.ni = 0;
    state.tick = 0;
    deps.setScore(0);
  };

  const onKey = (k: string) => {
    if (k === 'ArrowUp' || k === 'w') state.nd = { x: 0, y: -1 };
    if (k === 'ArrowDown' || k === 's') state.nd = { x: 0, y: 1 };
    if (k === 'ArrowLeft' || k === 'a') state.nd = { x: -1, y: 0 };
    if (k === 'ArrowRight' || k === 'd') state.nd = { x: 1, y: 0 };
  };

  const cm = (gx: number, gy: number, dx: number, dy: number): boolean => {
    const nx = gx + dx;
    const ny = gy + dy;
    if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) return false;
    return state.maze[ny][nx] === 0;
  };

  const update = () => {
    state.tick++;
    if (state.tick % 6 !== 0) return;
    if (cm(state.px, state.py, state.nd.x, state.nd.y)) state.dir = { ...state.nd };
    if (cm(state.px, state.py, state.dir.x, state.dir.y)) {
      state.px += state.dir.x;
      state.py += state.dir.y;
    }
    if (state.px < 0) state.px = state.cols - 1;
    if (state.px >= state.cols) state.px = 0;
    const dk = state.py + ',' + state.px;
    if (state.dots.has(dk)) {
      state.dots.delete(dk);
      deps.playNote(state.ni++);
      deps.setScore(deps.getScore() + 10);
    }
    for (const g of state.ghosts) {
      const dirs = [
        { x: 1, y: 0 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: -1 },
      ];
      const valid = dirs.filter((d) => cm(g.x, g.y, d.x, d.y) && !(d.x === -g.vx && d.y === -g.vy));
      if (valid.length > 0) {
        valid.sort((a, b) => {
          const da = Math.abs(g.x + a.x - state.px) + Math.abs(g.y + a.y - state.py);
          const db = Math.abs(g.x + b.x - state.px) + Math.abs(g.y + b.y - state.py);
          return da - db + (rng() - 0.5) * 4;
        });
        g.vx = valid[0].x;
        g.vy = valid[0].y;
      }
      g.x += g.vx;
      g.y += g.vy;
      g.x = Math.max(0, Math.min(state.cols - 1, g.x));
      g.y = Math.max(0, Math.min(state.rows - 1, g.y));
      if (g.x === state.px && g.y === state.py) {
        deps.playNote(0);
        state.px = 10;
        state.py = 14;
        state.dir = { x: 0, y: 0 };
      }
    }
    if (state.dots.size === 0) {
      deps.setScore(deps.getScore() + 500);
      init();
    }
  };

  const draw = (ctx: DrawingContext) => {
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    const ox = (W - state.cols * state.cs) / 2;
    const oy = (H - state.rows * state.cs) / 2;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const x = ox + c * state.cs;
        const y = oy + r * state.cs;
        if (state.maze[r][c] === 1) {
          ctx.fillStyle = '#2a1b5d';
          ctx.fillRect(x, y, state.cs, state.cs);
          ctx.strokeStyle = '#5533aa';
          ctx.strokeRect(x + 0.5, y + 0.5, state.cs - 1, state.cs - 1);
        } else if (state.dots.has(r + ',' + c)) {
          ctx.fillStyle = '#ffaa22';
          ctx.beginPath();
          ctx.arc(x + state.cs / 2, y + state.cs / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = '#ffaa22';
    ctx.beginPath();
    ctx.arc(
      ox + state.px * state.cs + state.cs / 2,
      oy + state.py * state.cs + state.cs / 2,
      8,
      0.2,
      Math.PI * 2 - 0.2,
    );
    ctx.lineTo(ox + state.px * state.cs + state.cs / 2, oy + state.py * state.cs + state.cs / 2);
    ctx.fill();
    for (const g of state.ghosts) {
      ctx.fillStyle = g.color;
      const gx = ox + g.x * state.cs + state.cs / 2;
      const gy = oy + g.y * state.cs + state.cs / 2;
      ctx.beginPath();
      ctx.arc(gx, gy - 2, 8, Math.PI, 0);
      ctx.lineTo(gx + 8, gy + 6);
      for (let i = 4; i >= -4; i -= 4) ctx.lineTo(gx + i, gy + (i % 8 === 0 ? 3 : 6));
      ctx.lineTo(gx - 8, gy + 6);
      ctx.fill();
    }
  };

  return {
    id: 'ghost',
    name: 'Ghost Chase',
    emoji: '👻',
    desc: 'Dots = scale, ghosts = tension',
    init,
    update,
    draw,
    onKey,
  };
};
