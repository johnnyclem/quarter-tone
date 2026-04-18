/**
 * Space Synth — shooting gallery; kills pick random scale notes.
 */
export default function createInvaders(deps) {
  const { keys, playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'invaders',
    name: 'Space Synth',
    emoji: '👾',
    desc: 'Shooting gallery synth',
    px: 240,
    bullets: [],
    enemies: [],
    tick: 0,
    ed: 1,
    es: 0.4,

    init() {
      this.px = 240;
      this.bullets = [];
      this.enemies = [];
      this.tick = 0;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 8; c++) {
        this.enemies.push({ x: 40 + c * 50, y: 30 + r * 36, alive: true, w: 30, h: 20 });
      }
      this.ed = 1;
      this.es = 0.4;
      setScore(0);
    },

    update() {
      if (keys['ArrowLeft'] || keys['a']) this.px = Math.max(15, this.px - 4);
      if (keys['ArrowRight'] || keys['d']) this.px = Math.min(W - 15, this.px + 4);
      if (keys[' '] && this.tick % 8 === 0) { this.bullets.push({ x: this.px, y: 370 }); playNote(12); }
      this.tick++;
      let edge = false;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        e.x += this.ed * this.es;
        if (e.x <= 5 || e.x >= W - 35) edge = true;
      }
      if (edge) {
        this.ed *= -1;
        for (const e of this.enemies) if (e.alive) e.y += 10;
      }
      for (const b of this.bullets) b.y -= 6;
      this.bullets = this.bullets.filter((b) => b.y > 0);
      for (const b of this.bullets) for (const e of this.enemies) {
        if (!e.alive) continue;
        if (b.x >= e.x && b.x <= e.x + e.w && b.y >= e.y && b.y <= e.y + e.h) {
          e.alive = false; b.y = -10;
          playNote(Math.floor(Math.random() * 8));
          setScore(getScore() + 25);
        }
      }
      if (this.enemies.every((e) => !e.alive)) this.init();
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      for (const e of this.enemies) {
        if (!e.alive) continue;
        ctx.fillStyle = '#b829dd'; ctx.fillRect(e.x, e.y, e.w, e.h);
        ctx.fillStyle = '#ff2d95';
        ctx.fillRect(e.x + 4, e.y + 4, 6, 6);
        ctx.fillRect(e.x + e.w - 10, e.y + 4, 6, 6);
      }
      ctx.fillStyle = '#22eeff';
      ctx.fillRect(this.px - 12, 375, 24, 10);
      ctx.fillRect(this.px - 2, 368, 4, 8);
      ctx.fillStyle = '#ffaa22';
      for (const b of this.bullets) ctx.fillRect(b.x - 1, b.y, 2, 8);
    },

    getState() { return cloneState({ px: this.px, bullets: this.bullets, enemies: this.enemies, tick: this.tick, ed: this.ed, es: this.es }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
