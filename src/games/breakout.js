/**
 * Brick Beats — each brick row plays a different pitch.
 */
export default function createBreakout(deps) {
  const { keys, playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'breakout',
    name: 'Brick Beats',
    emoji: '🧱',
    desc: 'Each row = different pitch',
    padX: 200,
    padW: 60,
    ball: { x: 240, y: 350, vx: 3, vy: -3, r: 5 },
    bricks: [],

    init() {
      this.padX = 200;
      this.padW = 60;
      this.ball = { x: 240, y: 350, vx: 3, vy: -3, r: 5 };
      this.bricks = [];
      const c = ['#ff2d95', '#b829dd', '#ffaa22', '#22eeff', '#ff6644'];
      for (let r = 0; r < 5; r++) for (let col = 0; col < 10; col++) {
        this.bricks.push({ x: 14 + col * 46, y: 40 + r * 22, w: 42, h: 18, color: c[r], row: r, alive: true });
      }
      setScore(0);
    },

    update() {
      if (keys['ArrowLeft'] || keys['a']) this.padX = Math.max(0, this.padX - 6);
      if (keys['ArrowRight'] || keys['d']) this.padX = Math.min(W - this.padW, this.padX + 6);
      const b = this.ball;
      b.x += b.vx; b.y += b.vy;
      if (b.x <= b.r || b.x >= W - b.r) b.vx *= -1;
      if (b.y <= b.r) b.vy *= -1;
      if (b.y >= 390) { b.x = 240; b.y = 350; b.vx = 3 * (Math.random() > 0.5 ? 1 : -1); b.vy = -3; }
      if (b.y >= 370 && b.y <= 380 && b.x >= this.padX && b.x <= this.padX + this.padW) {
        b.vy = -Math.abs(b.vy);
        b.vx = ((b.x - this.padX) / this.padW - 0.5) * 6;
        playNote(7);
      }
      for (const br of this.bricks) {
        if (!br.alive) continue;
        if (b.x >= br.x && b.x <= br.x + br.w && b.y >= br.y && b.y <= br.y + br.h) {
          br.alive = false; b.vy *= -1; playNote(br.row * 2); setScore(getScore() + 10); break;
        }
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      for (const br of this.bricks) {
        if (!br.alive) continue;
        ctx.fillStyle = br.color; ctx.fillRect(br.x, br.y, br.w, br.h);
      }
      ctx.fillStyle = '#ff2d95'; ctx.fillRect(this.padX, 375, this.padW, 8);
      ctx.fillStyle = '#ffaa22';
      ctx.beginPath(); ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2); ctx.fill();
    },

    getState() { return cloneState({ padX: this.padX, padW: this.padW, ball: this.ball, bricks: this.bricks }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
