/**
 * Sound Pong — paddle vs. CPU; bounces play scale notes.
 * Factory returns a Game bound to the injected arcade deps.
 */
export default function createPong(deps) {
  const { keys, playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'pong',
    name: 'Sound Pong',
    emoji: '🏓',
    desc: 'Ball bounces trigger notes',
    ball: { x: 240, y: 200, vx: 3, vy: 2.5, r: 6 },
    padY: 180,
    cpuY: 180,
    padH: 60,
    noteIdx: 0,

    init() {
      this.ball = { x: 240, y: 200, vx: 3, vy: 2.5, r: 6 };
      this.padY = 180;
      this.cpuY = 180;
      this.padH = 60;
      this.noteIdx = 0;
      setScore(0);
    },

    update() {
      const b = this.ball;
      if (keys['ArrowUp'] || keys['w']) this.padY = Math.max(0, this.padY - 5);
      if (keys['ArrowDown'] || keys['s']) this.padY = Math.min(H - this.padH, this.padY + 5);
      this.cpuY += (b.y - this.cpuY - this.padH / 2) * 0.06;
      this.cpuY = Math.max(0, Math.min(H - this.padH, this.cpuY));
      b.x += b.vx;
      b.y += b.vy;
      if (b.y <= b.r || b.y >= H - b.r) { b.vy *= -1; playNote(this.noteIdx++); }
      if (b.x <= 22 && b.y >= this.padY && b.y <= this.padY + this.padH) {
        b.vx = Math.abs(b.vx) * 1.02; playNote(this.noteIdx++); setScore(getScore() + 10);
      }
      if (b.x >= W - 22 && b.y >= this.cpuY && b.y <= this.cpuY + this.padH) {
        b.vx = -Math.abs(b.vx) * 1.02; playNote(this.noteIdx++);
      }
      if (b.x < -10 || b.x > W + 10) {
        b.x = 240; b.y = 200;
        b.vx = 3 * (Math.random() > 0.5 ? 1 : -1);
        b.vy = 2.5 * (Math.random() > 0.5 ? 1 : -1);
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(184,41,221,0.3)';
      ctx.beginPath(); ctx.moveTo(240, 0); ctx.lineTo(240, H); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#ff2d95'; ctx.fillRect(10, this.padY, 10, this.padH);
      ctx.fillStyle = '#b829dd'; ctx.fillRect(W - 20, this.cpuY, 10, this.padH);
      ctx.fillStyle = '#ffaa22';
      ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); ctx.fill();
    },

    getState() {
      return cloneState({
        ball: this.ball, padY: this.padY, cpuY: this.cpuY, padH: this.padH, noteIdx: this.noteIdx,
      });
    },

    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
