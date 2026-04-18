/**
 * Galaga Groove — enemies dive-bomb; kills trigger random scale notes.
 */
export default function createGalaga(deps) {
  const { keys, playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'galaga',
    name: 'Galaga Groove',
    emoji: '🚀',
    desc: 'Dive bomb sequences',
    px: 240,
    bullets: [],
    enemies: [],
    tick: 0,
    wave: 1,

    init() {
      this.px = 240;
      this.bullets = [];
      this.enemies = [];
      this.tick = 0;
      this.wave = 1;
      this.sw();
      setScore(0);
    },

    sw() {
      for (let i = 0; i < 6 + this.wave; i++) {
        this.enemies.push({
          x: 60 + (i % 8) * 50,
          y: -20 - Math.floor(i / 8) * 30,
          ty: 40 + Math.floor(i / 8) * 30,
          alive: true, diving: false, da: 0,
        });
      }
    },

    update() {
      if (keys['ArrowLeft'] || keys['a']) this.px = Math.max(15, this.px - 4);
      if (keys['ArrowRight'] || keys['d']) this.px = Math.min(W - 15, this.px + 4);
      if (keys[' '] && this.tick % 10 === 0) { this.bullets.push({ x: this.px, y: 370 }); playNote(10); }
      this.tick++;
      for (const e of this.enemies) {
        if (!e.alive) continue;
        if (!e.diving) {
          if (e.y < e.ty) e.y += 2;
          else {
            e.x += Math.sin(this.tick * 0.03);
            if (Math.random() < 0.002) { e.diving = true; e.da = Math.atan2(this.px - e.x, 380 - e.y); }
          }
        } else {
          e.x += Math.sin(e.da) * 3;
          e.y += Math.cos(e.da) * 3;
          if (e.y > 420) { e.y = -20; e.diving = false; }
        }
      }
      for (const b of this.bullets) b.y -= 7;
      this.bullets = this.bullets.filter((b) => b.y > 0);
      for (const b of this.bullets) for (const e of this.enemies) {
        if (!e.alive) continue;
        if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
          e.alive = false; b.y = -10;
          playNote(Math.floor(Math.random() * 12));
          setScore(getScore() + (e.diving ? 50 : 25));
        }
      }
      if (this.enemies.every((e) => !e.alive)) { this.wave++; this.sw(); }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + Math.sin(this.tick * 0.02 + i) * 0.15) + ')';
        ctx.fillRect((i * 73) % W, (i * 47 + this.tick * 0.3) % H, 1, 1);
      }
      for (const e of this.enemies) {
        if (!e.alive) continue;
        ctx.fillStyle = e.diving ? '#ff2d95' : '#b829dd';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - 10);
        ctx.lineTo(e.x - 12, e.y + 8);
        ctx.lineTo(e.x - 4, e.y + 4);
        ctx.lineTo(e.x, e.y + 10);
        ctx.lineTo(e.x + 4, e.y + 4);
        ctx.lineTo(e.x + 12, e.y + 8);
        ctx.fill();
      }
      ctx.fillStyle = '#22eeff';
      ctx.beginPath();
      ctx.moveTo(this.px, 360);
      ctx.lineTo(this.px - 12, 385);
      ctx.lineTo(this.px + 12, 385);
      ctx.fill();
      ctx.fillStyle = '#ffaa22';
      for (const b of this.bullets) ctx.fillRect(b.x - 1, b.y, 2, 8);
    },

    getState() { return cloneState({ px: this.px, bullets: this.bullets, enemies: this.enemies, tick: this.tick, wave: this.wave }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
