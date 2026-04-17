/**
 * Tetris Tones — drops play notes, line clears trigger chords.
 */
const SHAPES = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0], [1, 0], [1, 1]],
  [[0, 1], [0, 1], [1, 1]],
  [[1, 1, 0], [0, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
];
const COLORS = ['#22eeff', '#ffaa22', '#b829dd', '#ff2d95', '#44ff88', '#ff6644', '#ff2d95'];

export default function createTetris(deps) {
  const { playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'tetris',
    name: 'Tetris Tones',
    emoji: '🟦',
    desc: 'Drops = notes, clears = chords',
    shapes: SHAPES,
    colors: COLORS,
    cols: 10,
    rows: 20,
    cw: 20,
    grid: [],
    tick: 0,
    ds: 30,
    piece: null,
    px: 3,
    py: 0,

    init() {
      this.cols = 10; this.rows = 20; this.cw = 20;
      this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(0));
      this.tick = 0; this.ds = 30;
      this.piece = this.np();
      this.px = 3; this.py = 0;
      setScore(0);
    },

    np() {
      const i = Math.floor(Math.random() * this.shapes.length);
      return { shape: this.shapes[i].map((r) => [...r]), color: this.colors[i], type: i };
    },

    col(px, py, s) {
      for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue;
        const nx = px + c, ny = py + r;
        if (nx < 0 || nx >= this.cols || ny >= this.rows) return true;
        if (ny >= 0 && this.grid[ny][nx]) return true;
      }
      return false;
    },

    lock() {
      for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++) {
        if (!this.piece.shape[r][c]) continue;
        const ny = this.py + r;
        if (ny < 0) { this.init(); return; }
        this.grid[ny][this.px + c] = this.piece.color;
      }
      let cl = 0;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r].every((c) => c)) {
          this.grid.splice(r, 1);
          this.grid.unshift(Array(this.cols).fill(0));
          cl++; r++;
        }
      }
      if (cl > 0) {
        for (let i = 0; i < cl + 2; i++) playNote(i * 2);
        setScore(getScore() + cl * 100);
      }
      this.piece = this.np();
      this.px = 3; this.py = 0;
      playNote(this.piece.type);
    },

    onKey(k) {
      if ((k === 'ArrowLeft' || k === 'a') && !this.col(this.px - 1, this.py, this.piece.shape)) this.px--;
      if ((k === 'ArrowRight' || k === 'd') && !this.col(this.px + 1, this.py, this.piece.shape)) this.px++;
      if (k === 'ArrowDown' || k === 's') {
        if (!this.col(this.px, this.py + 1, this.piece.shape)) this.py++;
      }
      if (k === 'ArrowUp' || k === 'w') {
        const rot = this.piece.shape[0].map((_, i) => this.piece.shape.map((r) => r[i]).reverse());
        if (!this.col(this.px, this.py, rot)) { this.piece.shape = rot; playNote(5); }
      }
    },

    update() {
      this.tick++;
      if (this.tick % this.ds === 0) {
        if (!this.col(this.px, this.py + 1, this.piece.shape)) this.py++;
        else this.lock();
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      const ox = (W - this.cols * this.cw) / 2;
      ctx.strokeStyle = 'rgba(184,41,221,0.1)';
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        ctx.strokeRect(ox + c * this.cw, r * this.cw, this.cw, this.cw);
      }
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c]) {
          ctx.fillStyle = this.grid[r][c];
          ctx.fillRect(ox + c * this.cw + 1, r * this.cw + 1, this.cw - 2, this.cw - 2);
        }
      }
      ctx.fillStyle = this.piece.color;
      for (let r = 0; r < this.piece.shape.length; r++) for (let c = 0; c < this.piece.shape[r].length; c++) {
        if (this.piece.shape[r][c]) ctx.fillRect(ox + (this.px + c) * this.cw + 1, (this.py + r) * this.cw + 1, this.cw - 2, this.cw - 2);
      }
    },

    getState() { return cloneState({ grid: this.grid, tick: this.tick, ds: this.ds, piece: this.piece, px: this.px, py: this.py }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
