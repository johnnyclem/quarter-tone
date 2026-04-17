/**
 * Frog Hop — hop across traffic & water lanes; each hop plays a note.
 */
export default function createFrogger(deps) {
  const { playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'frogger',
    name: 'Frog Hop',
    emoji: '🐸',
    desc: 'Rhythmic hopping across lanes',
    px: 240,
    py: 380,
    ni: 0,
    lanes: [],

    init() {
      this.px = 240;
      this.py = 380;
      this.ni = 0;
      this.lanes = [];
      for (let i = 0; i < 10; i++) {
        const y = 340 - i * 36;
        const speed = (1 + Math.random() * 2) * (i % 2 === 0 ? 1 : -1);
        const cars = [];
        const gap = 100 + Math.random() * 60;
        for (let c = 0; c < 4; c++) cars.push({ x: c * gap, w: 30 + Math.random() * 30 });
        this.lanes.push({ y, speed, cars, isWater: i >= 5 });
      }
      setScore(0);
    },

    onKey(k) {
      if (k === 'ArrowUp' || k === 'w') { this.py -= 36; playNote(this.ni++); }
      if (k === 'ArrowDown' || k === 's') { this.py += 36; playNote(Math.max(0, --this.ni)); }
      if (k === 'ArrowLeft' || k === 'a') this.px -= 20;
      if (k === 'ArrowRight' || k === 'd') this.px += 20;
      this.px = Math.max(10, Math.min(W - 10, this.px));
      this.py = Math.max(0, Math.min(380, this.py));
    },

    update() {
      let onLog = false;
      for (const l of this.lanes) {
        for (const c of l.cars) {
          c.x += l.speed;
          if (c.x > W + 40) c.x = -c.w - 20;
          if (c.x < -c.w - 20) c.x = W + 40;
          if (Math.abs(this.py - l.y) < 16) {
            if (this.px >= c.x && this.px <= c.x + c.w) {
              if (l.isWater) { onLog = true; this.px += l.speed; }
              else { playNote(0); this.px = 240; this.py = 380; }
            }
          }
        }
      }
      for (const l of this.lanes) {
        if (l.isWater && Math.abs(this.py - l.y) < 16 && !onLog) {
          playNote(0); this.px = 240; this.py = 380; break;
        }
      }
      if (this.py <= 0) {
        setScore(getScore() + 100); playNote(12); this.px = 240; this.py = 380;
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(68,255,136,0.1)';
      ctx.fillRect(0, 370, W, 30);
      ctx.fillRect(0, 0, W, 16);
      for (const l of this.lanes) {
        ctx.fillStyle = l.isWater ? 'rgba(34,100,238,0.15)' : 'rgba(50,30,50,0.3)';
        ctx.fillRect(0, l.y - 14, W, 30);
        for (const c of l.cars) {
          ctx.fillStyle = l.isWater ? '#44aa66' : '#ff6644';
          ctx.fillRect(c.x, l.y - 8, c.w, 18);
        }
      }
      ctx.fillStyle = '#44ff88';
      ctx.beginPath(); ctx.arc(this.px, this.py, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(this.px - 3, this.py - 3, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(this.px + 3, this.py - 3, 2, 0, Math.PI * 2); ctx.fill();
    },

    getState() { return cloneState({ px: this.px, py: this.py, ni: this.ni, lanes: this.lanes }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
