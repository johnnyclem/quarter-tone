import type { GameDefinition, GameHost } from '../types.js';

interface Enemy {
  x: number;
  y: number;
  ty: number;
  alive: boolean;
  diving: boolean;
  da: number;
}
interface Bullet {
  x: number;
  y: number;
}

const state = {
  px: 240,
  bullets: [] as Bullet[],
  enemies: [] as Enemy[],
  tick: 0,
  wave: 1,
};

const spawnWave = (): void => {
  for (let i = 0; i < 6 + state.wave; i++) {
    state.enemies.push({
      x: 60 + (i % 8) * 50,
      y: -20 - Math.floor(i / 8) * 30,
      ty: 40 + Math.floor(i / 8) * 30,
      alive: true,
      diving: false,
      da: 0,
    });
  }
};

export const galaga: GameDefinition = {
  id: 'galaga',
  name: 'Galaga Groove',
  emoji: '🚀',
  desc: 'Dive bomb sequences',

  init(host: GameHost) {
    state.px = 240;
    state.bullets = [];
    state.enemies = [];
    state.tick = 0;
    state.wave = 1;
    spawnWave();
    host.emit({ type: 'score', value: 0 });
  },

  update(host: GameHost) {
    const W = host.width;
    if (host.isKeyDown('ArrowLeft') || host.isKeyDown('a')) state.px = Math.max(15, state.px - 4);
    if (host.isKeyDown('ArrowRight') || host.isKeyDown('d')) state.px = Math.min(W - 15, state.px + 4);
    if (host.isKeyDown(' ') && state.tick % 10 === 0) {
      state.bullets.push({ x: state.px, y: 370 });
      host.emit({ type: 'note', index: 10 });
    }
    state.tick++;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      if (!e.diving) {
        if (e.y < e.ty) {
          e.y += 2;
        } else {
          e.x += Math.sin(state.tick * 0.03);
          if (Math.random() < 0.002) {
            e.diving = true;
            e.da = Math.atan2(state.px - e.x, 380 - e.y);
          }
        }
      } else {
        e.x += Math.sin(e.da) * 3;
        e.y += Math.cos(e.da) * 3;
        if (e.y > 420) {
          e.y = -20;
          e.diving = false;
        }
      }
    }
    for (const b of state.bullets) b.y -= 7;
    state.bullets = state.bullets.filter((b) => b.y > 0);
    for (const b of state.bullets) {
      for (const e of state.enemies) {
        if (!e.alive) continue;
        if (Math.abs(b.x - e.x) < 16 && Math.abs(b.y - e.y) < 16) {
          e.alive = false;
          b.y = -10;
          host.emit({ type: 'note', index: Math.floor(Math.random() * 12) });
          host.emit({ type: 'scoreDelta', delta: e.diving ? 50 : 25 });
        }
      }
    }
    if (state.enemies.every((e) => !e.alive)) {
      state.wave++;
      spawnWave();
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, host.width, host.height);
    for (const e of state.enemies) {
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
    ctx.moveTo(state.px, 360);
    ctx.lineTo(state.px - 12, 385);
    ctx.lineTo(state.px + 12, 385);
    ctx.fill();
    ctx.fillStyle = '#ffaa22';
    for (const b of state.bullets) ctx.fillRect(b.x - 1, b.y, 2, 8);
  },
};
