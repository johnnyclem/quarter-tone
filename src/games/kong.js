/**
 * Kong Climb — jump platforms, dodge barrels, reach the top.
 */
export default function createKong(deps) {
  const { keys, playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'kong',
    name: 'Kong Climb',
    emoji: '🦍',
    desc: 'Barrels = falling arpeggios',
    px: 40,
    py: 360,
    vy: 0,
    og: true,
    barrels: [],
    tick: 0,
    ni: 0,
    plats: [],

    init() {
      this.px = 40;
      this.py = 360;
      this.vy = 0;
      this.og = true;
      this.barrels = [];
      this.tick = 0;
      this.ni = 0;
      this.plats = [
        { x: 0, y: 380, w: W },
        { x: 40, y: 310, w: 400 },
        { x: 20, y: 240, w: 420 },
        { x: 60, y: 170, w: 380 },
        { x: 0, y: 100, w: 400 },
      ];
      setScore(0);
    },

    update() {
      if (keys['ArrowLeft'] || keys['a']) this.px = Math.max(0, this.px - 3);
      if (keys['ArrowRight'] || keys['d']) this.px = Math.min(W - 12, this.px + 3);
      if ((keys['ArrowUp'] || keys['w'] || keys[' ']) && this.og) {
        this.vy = -8; this.og = false; playNote(this.ni++);
      }
      this.vy += 0.35;
      this.py += this.vy;
      this.og = false;
      for (const p of this.plats) {
        if (this.py >= p.y - 18 && this.py <= p.y && this.px >= p.x && this.px <= p.x + p.w && this.vy >= 0) {
          this.py = p.y - 18; this.vy = 0; this.og = true;
        }
      }
      if (this.py > H) { this.py = 360; this.px = 40; this.vy = 0; }
      this.tick++;
      if (this.tick % 80 === 0) this.barrels.push({ x: 400, y: 88, vx: -2, vy: 0, pi: 4 });
      for (const b of this.barrels) {
        b.x += b.vx; b.vy += 0.2; b.y += b.vy;
        for (let i = b.pi; i >= 0; i--) {
          const p = this.plats[i];
          if (b.y >= p.y - 10 && b.y <= p.y + 5 && b.x >= p.x && b.x <= p.x + p.w) {
            b.y = p.y - 10; b.vy = 0; b.pi = i; b.vx = (i % 2 === 0) ? -2 : 2; break;
          }
        }
        if (Math.abs(b.x - this.px) < 16 && Math.abs(b.y - this.py) < 16) {
          playNote(0); this.px = 40; this.py = 360;
        }
      }
      this.barrels = this.barrels.filter((b) => b.y < H && b.x > -20 && b.x < W + 20);
      if (this.py < 100) {
        setScore(getScore() + 100); playNote(10); this.init();
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      for (const p of this.plats) { ctx.fillStyle = '#b829dd'; ctx.fillRect(p.x, p.y, p.w, 6); }
      ctx.fillStyle = '#ffaa22'; ctx.fillRect(380, 60, 30, 28);
      ctx.fillStyle = '#ff2d95'; ctx.fillRect(this.px - 6, this.py - 16, 12, 16);
      ctx.fillStyle = '#ff6644';
      for (const b of this.barrels) { ctx.beginPath(); ctx.arc(b.x, b.y, 8, 0, Math.PI * 2); ctx.fill(); }
    },

    getState() { return cloneState({ px: this.px, py: this.py, vy: this.vy, og: this.og, barrels: this.barrels, tick: this.tick, ni: this.ni }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
