import type { GameDefinition, GameHost } from '../types.js';

const state = {
  cols: 16,
  rows: 8,
  grid: [] as boolean[][],
  step: 0,
  tick: 0,
  curX: 0,
  curY: 0,
  playing: true,
  rn: ['KICK', 'SNARE', 'HAT', 'CLAP', 'TOM', 'RIM', 'PERC', 'FX'],
};

export const sequencer: GameDefinition = {
  id: 'sequencer',
  name: 'Off The Grid',
  emoji: '🎛️',
  desc: '16-step drum sequencer',

  init(host: GameHost) {
    state.cols = 16;
    state.rows = 8;
    state.grid = Array.from({ length: state.rows }, () =>
      Array(state.cols).fill(false) as boolean[],
    );
    state.step = 0;
    state.tick = 0;
    state.curX = 0;
    state.curY = 0;
    state.playing = true;
    host.emit({ type: 'score', value: 0 });
  },

  onKey(key: string, down: boolean, host: GameHost) {
    if (!down) return;
    if (key === 'ArrowRight' || key === 'd') state.curX = (state.curX + 1) % state.cols;
    if (key === 'ArrowLeft' || key === 'a') state.curX = (state.curX - 1 + state.cols) % state.cols;
    if (key === 'ArrowDown' || key === 's') state.curY = (state.curY + 1) % state.rows;
    if (key === 'ArrowUp' || key === 'w') state.curY = (state.curY - 1 + state.rows) % state.rows;
    if (key === ' ') {
      const row = state.grid[state.curY]!;
      row[state.curX] = !row[state.curX];
      if (row[state.curX]) host.emit({ type: 'note', index: state.curY });
    }
  },

  update(host: GameHost) {
    state.tick++;
    const bpm = host.synth.bpm;
    const stp = Math.max(4, Math.floor((60 / bpm) * 60 / 4));
    if (state.playing && state.tick % stp === 0) {
      state.step = (state.step + 1) % state.cols;
      for (let r = 0; r < state.rows; r++) {
        if (state.grid[r]![state.step]) host.emit({ type: 'note', index: r * 2 });
      }
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    const W = host.width;
    const H = host.height;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    const cw = 26;
    const ch = 40;
    const ox = 30;
    const oy = 30;
    ctx.font = '6px "Press Start 2P"';
    for (let r = 0; r < state.rows; r++) {
      ctx.fillStyle = 'rgba(184,41,221,0.5)';
      ctx.fillText(state.rn[r]!, 0, oy + r * ch + ch / 2 + 2);
      for (let c = 0; c < state.cols; c++) {
        const x = ox + c * cw;
        const y = oy + r * ch;
        ctx.fillStyle = state.grid[r]![c]
          ? (c === state.step ? '#ff2d95' : '#b829dd')
          : (c === state.step ? 'rgba(255,45,149,0.15)' : 'rgba(184,41,221,0.08)');
        ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
        if (c === state.curX && r === state.curY) {
          ctx.strokeStyle = '#ffaa22';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, cw, ch);
          ctx.lineWidth = 1;
        }
      }
    }
    ctx.fillStyle = '#ff2d95';
    ctx.fillRect(ox + state.step * cw, oy + state.rows * ch + 5, cw, 3);
  },
};
