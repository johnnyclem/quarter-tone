/**
 * Off The Grid — 16-step drum sequencer.
 * Step rate is derived from the injected BPM.
 */
export default function createSequencer(deps) {
  const { playNote, setScore, getBpm, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'sequencer',
    name: 'Off The Grid',
    emoji: '🎛️',
    desc: '16-step drum sequencer',
    cols: 16,
    rows: 8,
    grid: [],
    step: 0,
    tick: 0,
    curX: 0,
    curY: 0,
    playing: true,
    rn: ['KICK', 'SNARE', 'HAT', 'CLAP', 'TOM', 'RIM', 'PERC', 'FX'],

    init() {
      this.cols = 16; this.rows = 8;
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(false));
      this.step = 0; this.tick = 0;
      this.curX = 0; this.curY = 0;
      this.playing = true;
      this.rn = ['KICK', 'SNARE', 'HAT', 'CLAP', 'TOM', 'RIM', 'PERC', 'FX'];
      setScore(0);
    },

    onKey(k) {
      if (k === 'ArrowRight' || k === 'd') this.curX = (this.curX + 1) % this.cols;
      if (k === 'ArrowLeft' || k === 'a') this.curX = (this.curX - 1 + this.cols) % this.cols;
      if (k === 'ArrowDown' || k === 's') this.curY = (this.curY + 1) % this.rows;
      if (k === 'ArrowUp' || k === 'w') this.curY = (this.curY - 1 + this.rows) % this.rows;
      if (k === ' ') {
        this.grid[this.curY][this.curX] = !this.grid[this.curY][this.curX];
        if (this.grid[this.curY][this.curX]) playNote(this.curY);
      }
    },

    update() {
      this.tick++;
      const bpm = getBpm();
      const stp = Math.max(4, Math.floor(60 / bpm * 60 / 4));
      if (this.playing && this.tick % stp === 0) {
        this.step = (this.step + 1) % this.cols;
        for (let r = 0; r < this.rows; r++) {
          if (this.grid[r][this.step]) playNote(r * 2);
        }
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      const cw = 26, ch = 40, ox = 30, oy = 30;
      ctx.font = '6px "Press Start 2P"';
      for (let r = 0; r < this.rows; r++) {
        ctx.fillStyle = 'rgba(184,41,221,0.5)';
        ctx.fillText(this.rn[r], 0, oy + r * ch + ch / 2 + 2);
        for (let c = 0; c < this.cols; c++) {
          const x = ox + c * cw, y = oy + r * ch;
          ctx.fillStyle = this.grid[r][c]
            ? (c === this.step ? '#ff2d95' : '#b829dd')
            : (c === this.step ? 'rgba(255,45,149,0.15)' : 'rgba(184,41,221,0.08)');
          ctx.fillRect(x + 1, y + 1, cw - 2, ch - 2);
          if (c === this.curX && r === this.curY) {
            ctx.strokeStyle = '#ffaa22';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, cw, ch);
            ctx.lineWidth = 1;
          }
        }
      }
      ctx.fillStyle = '#ff2d95';
      ctx.fillRect(ox + this.step * cw, oy + this.rows * ch + 5, cw, 3);
    },

    getState() { return cloneState({ grid: this.grid, step: this.step, tick: this.tick, curX: this.curX, curY: this.curY, playing: this.playing }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
