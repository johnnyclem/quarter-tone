/**
 * Kong Jr — swing across vines to grab fruit and climb.
 */
export default function createKongJr(deps) {
  const { keys, playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'kongjr',
    name: 'Kong Jr',
    emoji: '🐒',
    desc: 'Vine-swinging melodies',
    px: 60,
    py: 350,
    vy: 0,
    ov: false,
    vi: -1,
    vines: [],
    fruits: [],
    ni: 0,

    init() {
      this.px = 60;
      this.py = 350;
      this.vy = 0;
      this.ov = false;
      this.vi = -1;
      this.vines = [];
      for (let i = 0; i < 6; i++) this.vines.push({ x: 80 + i * 65, top: 60, bottom: 340 });
      this.fruits = [];
      for (let i = 0; i < 4; i++) this.fruits.push({ x: 100 + i * 90, y: 100 + Math.random() * 200, alive: true });
      this.ni = 0;
      setScore(0);
    },

    onKey(k) {
      if (k === ' ' || k === 'ArrowUp' || k === 'w') {
        if (!this.ov) { this.vy = -7; playNote(this.ni++); }
      }
    },

    update() {
      if (this.ov) {
        if (keys['ArrowUp'] || keys['w']) { this.py -= 3; playNote(this.ni++ % 12); }
        if (keys['ArrowDown'] || keys['s']) { this.py += 3; playNote((this.ni++ + 4) % 12); }
        if (keys['ArrowLeft'] || keys['a']) { this.ov = false; this.px -= 15; this.vy = -3; }
        if (keys['ArrowRight'] || keys['d']) { this.ov = false; this.px += 15; this.vy = -3; }
        const v = this.vines[this.vi];
        if (v) this.py = Math.max(v.top, Math.min(v.bottom, this.py));
      } else {
        if (keys['ArrowLeft'] || keys['a']) this.px -= 3;
        if (keys['ArrowRight'] || keys['d']) this.px += 3;
        this.vy += 0.3;
        this.py += this.vy;
        for (let i = 0; i < this.vines.length; i++) {
          const v = this.vines[i];
          if (Math.abs(this.px - v.x) < 12 && this.py >= v.top && this.py <= v.bottom) {
            this.ov = true; this.vi = i; this.vy = 0; this.px = v.x; playNote(i * 2); break;
          }
        }
        if (this.py > 380) { this.py = 350; this.vy = 0; }
      }
      this.px = Math.max(0, Math.min(W, this.px));
      for (const f of this.fruits) {
        if (f.alive && Math.abs(this.px - f.x) < 14 && Math.abs(this.py - f.y) < 14) {
          f.alive = false; setScore(getScore() + 50); playNote(10);
        }
      }
      if (this.py < 60) { setScore(getScore() + 200); this.init(); }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#44ff88'; ctx.lineWidth = 3;
      for (const v of this.vines) { ctx.beginPath(); ctx.moveTo(v.x, v.top); ctx.lineTo(v.x, v.bottom); ctx.stroke(); }
      ctx.lineWidth = 1;
      for (const f of this.fruits) {
        if (!f.alive) continue;
        ctx.fillStyle = '#ffaa22';
        ctx.beginPath(); ctx.arc(f.x, f.y, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = '#ff2d95'; ctx.fillRect(this.px - 6, this.py - 12, 12, 14);
      ctx.fillStyle = '#ffaa22'; ctx.fillRect(370, 30, 40, 30);
    },

    getState() { return cloneState({ px: this.px, py: this.py, vy: this.vy, ov: this.ov, vi: this.vi, fruits: this.fruits, ni: this.ni }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
