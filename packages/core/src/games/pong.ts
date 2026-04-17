import type { GameDefinition, GameHost } from '../types.js';

const state = {
  ball: { x: 240, y: 200, vx: 3, vy: 2.5, r: 6 },
  padY: 180,
  cpuY: 180,
  padH: 60,
  noteIdx: 0,
};

export const pong: GameDefinition = {
  id: 'pong',
  name: 'Sound Pong',
  emoji: '🏓',
  desc: 'Ball bounces trigger notes',

  init(host: GameHost) {
    state.ball = { x: 240, y: 200, vx: 3, vy: 2.5, r: 6 };
    state.padY = 180;
    state.cpuY = 180;
    state.padH = 60;
    state.noteIdx = 0;
    host.emit({ type: 'score', value: 0 });
  },

  update(host: GameHost) {
    const W = host.width;
    const H = host.height;
    const b = state.ball;
    if (host.isKeyDown('ArrowUp') || host.isKeyDown('w')) state.padY = Math.max(0, state.padY - 5);
    if (host.isKeyDown('ArrowDown') || host.isKeyDown('s')) state.padY = Math.min(H - state.padH, state.padY + 5);
    state.cpuY += (b.y - state.cpuY - state.padH / 2) * 0.06;
    state.cpuY = Math.max(0, Math.min(H - state.padH, state.cpuY));
    b.x += b.vx;
    b.y += b.vy;
    if (b.y <= b.r || b.y >= H - b.r) {
      b.vy *= -1;
      host.emit({ type: 'note', index: state.noteIdx++ });
    }
    if (b.x <= 22 && b.y >= state.padY && b.y <= state.padY + state.padH) {
      b.vx = Math.abs(b.vx) * 1.02;
      host.emit({ type: 'note', index: state.noteIdx++ });
      host.emit({ type: 'scoreDelta', delta: 10 });
    }
    if (b.x >= W - 22 && b.y >= state.cpuY && b.y <= state.cpuY + state.padH) {
      b.vx = -Math.abs(b.vx) * 1.02;
      host.emit({ type: 'note', index: state.noteIdx++ });
    }
    if (b.x < -10 || b.x > W + 10) {
      b.x = 240;
      b.y = 200;
      b.vx = 3 * (Math.random() > 0.5 ? 1 : -1);
      b.vy = 2.5 * (Math.random() > 0.5 ? 1 : -1);
    }
  },

  draw(host: GameHost) {
    const ctx = host.ctx;
    const W = host.width;
    const H = host.height;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, W, H);
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgba(184,41,221,0.3)';
    ctx.beginPath();
    ctx.moveTo(240, 0);
    ctx.lineTo(240, H);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff2d95';
    ctx.fillRect(10, state.padY, 10, state.padH);
    ctx.fillStyle = '#b829dd';
    ctx.fillRect(W - 20, state.cpuY, 10, state.padH);
    ctx.fillStyle = '#ffaa22';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
  },
};
