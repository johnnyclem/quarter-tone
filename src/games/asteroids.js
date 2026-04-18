/**
 * Deep Spaced — thrust-and-shoot asteroids with wraparound space.
 */
export default function createAsteroids(deps) {
  const { keys, playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'asteroids',
    name: 'Deep Spaced',
    emoji: '☄️',
    desc: 'Shooting & collisions = arps',
    px: 240,
    py: 200,
    angle: -Math.PI / 2,
    vx: 0,
    vy: 0,
    bullets: [],
    asteroids: [],
    tick: 0,
    ni: 0,

    init() {
      this.px = 240; this.py = 200;
      this.angle = -Math.PI / 2;
      this.vx = 0; this.vy = 0;
      this.bullets = [];
      this.asteroids = [];
      this.tick = 0; this.ni = 0;
      for (let i = 0; i < 6; i++) this.asteroids.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
        r: 20 + Math.random() * 15,
      });
      setScore(0);
    },

    update() {
      if (keys['ArrowLeft'] || keys['a']) this.angle -= 0.06;
      if (keys['ArrowRight'] || keys['d']) this.angle += 0.06;
      if (keys['ArrowUp'] || keys['w']) {
        this.vx += Math.cos(this.angle) * 0.15;
        this.vy += Math.sin(this.angle) * 0.15;
      }
      this.px += this.vx; this.py += this.vy;
      this.vx *= 0.99; this.vy *= 0.99;
      if (this.px < 0) this.px = W;
      if (this.px > W) this.px = 0;
      if (this.py < 0) this.py = H;
      if (this.py > H) this.py = 0;
      this.tick++;
      if (keys[' '] && this.tick % 8 === 0) {
        this.bullets.push({
          x: this.px + Math.cos(this.angle) * 14,
          y: this.py + Math.sin(this.angle) * 14,
          vx: Math.cos(this.angle) * 6,
          vy: Math.sin(this.angle) * 6,
          life: 50,
        });
        playNote(this.ni++);
      }
      for (const b of this.bullets) { b.x += b.vx; b.y += b.vy; b.life--; }
      this.bullets = this.bullets.filter((b) => b.life > 0);
      for (const a of this.asteroids) {
        a.x += a.vx; a.y += a.vy;
        if (a.x < -30) a.x = W + 30;
        if (a.x > W + 30) a.x = -30;
        if (a.y < -30) a.y = H + 30;
        if (a.y > H + 30) a.y = -30;
      }
      for (const b of this.bullets) {
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
          const a = this.asteroids[i];
          if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
            b.life = 0;
            if (a.r > 14) {
              for (let j = 0; j < 2; j++) this.asteroids.push({
                x: a.x, y: a.y,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                r: a.r * 0.55,
              });
            }
            this.asteroids.splice(i, 1);
            playNote(this.ni++); setScore(getScore() + 25);
            break;
          }
        }
      }
      for (const a of this.asteroids) {
        if (Math.hypot(this.px - a.x, this.py - a.y) < a.r + 8) {
          playNote(0); this.px = 240; this.py = 200; this.vx = 0; this.vy = 0;
        }
      }
      if (this.asteroids.length === 0) {
        for (let i = 0; i < 6; i++) this.asteroids.push({
          x: Math.random() * W, y: Math.random() * H,
          vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
          r: 20 + Math.random() * 15,
        });
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 50; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + Math.sin(i * 0.7 + this.tick * 0.01) * 0.1) + ')';
        ctx.fillRect((i * 97) % W, (i * 53) % H, 1, 1);
      }
      ctx.save();
      ctx.translate(this.px, this.py);
      ctx.rotate(this.angle);
      ctx.fillStyle = '#22eeff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.fill();
      if (keys['ArrowUp'] || keys['w']) {
        ctx.fillStyle = '#ffaa22';
        ctx.beginPath();
        ctx.moveTo(-6, -3);
        ctx.lineTo(-14, 0);
        ctx.lineTo(-6, 3);
        ctx.fill();
      }
      ctx.restore();
      for (const a of this.asteroids) {
        ctx.strokeStyle = '#b829dd'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = '#ff2d95';
      for (const b of this.bullets) ctx.fillRect(b.x - 1, b.y - 1, 3, 3);
    },

    getState() { return cloneState({ px: this.px, py: this.py, angle: this.angle, vx: this.vx, vy: this.vy, bullets: this.bullets, asteroids: this.asteroids, tick: this.tick, ni: this.ni }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
