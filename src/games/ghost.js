/**
 * Ghost Chase — pellet-collection maze; ghosts add dissonance.
 */
export default function createGhost(deps) {
  const { playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'ghost',
    name: 'Ghost Chase',
    emoji: '👻',
    desc: 'Dots = scale, ghosts = tension',
    cs: 20,
    cols: 21,
    rows: 19,
    maze: [],
    px: 10,
    py: 14,
    dir: { x: 0, y: 0 },
    nd: { x: 0, y: 0 },
    dots: new Set(),
    ghosts: [],
    ni: 0,
    tick: 0,

    init() {
      this.cs = 20; this.cols = 21; this.rows = 19;
      this.maze = this.gm();
      this.px = 10; this.py = 14;
      this.dir = { x: 0, y: 0 };
      this.nd = { x: 0, y: 0 };
      this.dots = new Set();
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        if (this.maze[r][c] === 0) this.dots.add(r + ',' + c);
      }
      this.dots.delete(this.py + ',' + this.px);
      this.ghosts = [
        { x: 9, y: 8, color: '#ff2d95', vx: 1, vy: 0 },
        { x: 10, y: 8, color: '#22eeff', vx: -1, vy: 0 },
        { x: 11, y: 8, color: '#ffaa22', vx: 0, vy: 1 },
      ];
      this.ni = 0;
      this.tick = 0;
      setScore(0);
    },

    gm() {
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
    },

    onKey(k) {
      if (k === 'ArrowUp' || k === 'w') this.nd = { x: 0, y: -1 };
      if (k === 'ArrowDown' || k === 's') this.nd = { x: 0, y: 1 };
      if (k === 'ArrowLeft' || k === 'a') this.nd = { x: -1, y: 0 };
      if (k === 'ArrowRight' || k === 'd') this.nd = { x: 1, y: 0 };
    },

    cm(gx, gy, dx, dy) {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) return false;
      return this.maze[ny][nx] === 0;
    },

    update() {
      this.tick++;
      if (this.tick % 6 !== 0) return;
      if (this.cm(this.px, this.py, this.nd.x, this.nd.y)) this.dir = { ...this.nd };
      if (this.cm(this.px, this.py, this.dir.x, this.dir.y)) {
        this.px += this.dir.x; this.py += this.dir.y;
      }
      if (this.px < 0) this.px = this.cols - 1;
      if (this.px >= this.cols) this.px = 0;
      const dk = this.py + ',' + this.px;
      if (this.dots.has(dk)) {
        this.dots.delete(dk); playNote(this.ni++); setScore(getScore() + 10);
      }
      for (const g of this.ghosts) {
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        const valid = dirs.filter((d) => this.cm(g.x, g.y, d.x, d.y) && !(d.x === -g.vx && d.y === -g.vy));
        if (valid.length > 0) {
          valid.sort((a, b) => {
            const da = Math.abs(g.x + a.x - this.px) + Math.abs(g.y + a.y - this.py);
            const db = Math.abs(g.x + b.x - this.px) + Math.abs(g.y + b.y - this.py);
            return da - db + (Math.random() - 0.5) * 4;
          });
          g.vx = valid[0].x; g.vy = valid[0].y;
        }
        g.x += g.vx; g.y += g.vy;
        g.x = Math.max(0, Math.min(this.cols - 1, g.x));
        g.y = Math.max(0, Math.min(this.rows - 1, g.y));
        if (g.x === this.px && g.y === this.py) {
          playNote(0); this.px = 10; this.py = 14; this.dir = { x: 0, y: 0 };
        }
      }
      if (this.dots.size === 0) { setScore(getScore() + 500); this.init(); }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      const ox = (W - this.cols * this.cs) / 2, oy = (H - this.rows * this.cs) / 2;
      for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
        const x = ox + c * this.cs, y = oy + r * this.cs;
        if (this.maze[r][c] === 1) {
          ctx.fillStyle = '#2a1b5d'; ctx.fillRect(x, y, this.cs, this.cs);
          ctx.strokeStyle = '#5533aa'; ctx.strokeRect(x + 0.5, y + 0.5, this.cs - 1, this.cs - 1);
        } else if (this.dots.has(r + ',' + c)) {
          ctx.fillStyle = '#ffaa22';
          ctx.beginPath(); ctx.arc(x + this.cs / 2, y + this.cs / 2, 2.5, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.fillStyle = '#ffaa22';
      ctx.beginPath(); ctx.arc(ox + this.px * this.cs + this.cs / 2, oy + this.py * this.cs + this.cs / 2, 8, 0.2, Math.PI * 2 - 0.2);
      ctx.lineTo(ox + this.px * this.cs + this.cs / 2, oy + this.py * this.cs + this.cs / 2); ctx.fill();
      for (const g of this.ghosts) {
        ctx.fillStyle = g.color;
        const gx = ox + g.x * this.cs + this.cs / 2, gy = oy + g.y * this.cs + this.cs / 2;
        ctx.beginPath(); ctx.arc(gx, gy - 2, 8, Math.PI, 0); ctx.lineTo(gx + 8, gy + 6);
        for (let i = 4; i >= -4; i -= 4) ctx.lineTo(gx + i, gy + (i % 8 === 0 ? 3 : 6));
        ctx.lineTo(gx - 8, gy + 6); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(gx - 3, gy - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(gx + 3, gy - 3, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.arc(gx - 2, gy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(gx + 4, gy - 3, 1.5, 0, Math.PI * 2); ctx.fill();
      }
    },

    getState() {
      return {
        px: this.px, py: this.py,
        dir: cloneState(this.dir), nd: cloneState(this.nd),
        dots: [...this.dots], ghosts: cloneState(this.ghosts),
        ni: this.ni, tick: this.tick,
      };
    },

    loadState(s) {
      this.px = s.px; this.py = s.py;
      this.dir = cloneState(s.dir); this.nd = cloneState(s.nd);
      this.dots = new Set(s.dots);
      this.ghosts = cloneState(s.ghosts);
      this.ni = s.ni; this.tick = s.tick;
    },
  };

  return self;
}
