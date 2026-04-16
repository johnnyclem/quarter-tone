/**
 * Snake Beats — each body segment adds a note to the arp.
 */
export default function createSnake(deps) {
  const { playNote, setScore, getScore, ctx, W, H, cloneState } = deps;

  const self = {
    id: 'snake',
    name: 'Snake Beats',
    emoji: '🐍',
    desc: 'Growing snake = growing melody',
    snake: [{ x: 10, y: 10 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 5, y: 5 },
    tick: 0,
    speed: 8,

    init() {
      this.snake = [{ x: 10, y: 10 }];
      this.dir = { x: 1, y: 0 };
      this.nextDir = { x: 1, y: 0 };
      this.food = this.sf();
      this.tick = 0;
      this.speed = 8;
      setScore(0);
    },

    sf() { return { x: Math.floor(Math.random() * 24), y: Math.floor(Math.random() * 20) }; },

    onKey(k) {
      if ((k === 'ArrowUp' || k === 'w') && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
      if ((k === 'ArrowDown' || k === 's') && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
      if ((k === 'ArrowLeft' || k === 'a') && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
      if ((k === 'ArrowRight' || k === 'd') && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
    },

    update() {
      this.tick++;
      if (this.tick % this.speed !== 0) return;
      this.dir = { ...this.nextDir };
      const h = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
      if (h.x < 0 || h.x >= 24 || h.y < 0 || h.y >= 20 || this.snake.some((s) => s.x === h.x && s.y === h.y)) {
        playNote(0); this.init(); return;
      }
      this.snake.unshift(h);
      if (h.x === this.food.x && h.y === this.food.y) {
        this.food = this.sf(); playNote(this.snake.length); setScore(getScore() + 10);
      } else {
        this.snake.pop();
      }
    },

    draw() {
      ctx.fillStyle = '#0a0612'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < this.snake.length; i++) {
        const t = i / this.snake.length;
        ctx.fillStyle = 'hsl(' + (320 - t * 60) + ',80%,' + (60 - t * 20) + '%)';
        ctx.fillRect(this.snake[i].x * 20 + 1, this.snake[i].y * 20 + 1, 18, 18);
      }
      ctx.fillStyle = '#ffaa22';
      ctx.fillRect(this.food.x * 20 + 3, this.food.y * 20 + 3, 14, 14);
    },

    getState() { return cloneState({ snake: this.snake, dir: this.dir, nextDir: this.nextDir, food: this.food, tick: this.tick, speed: this.speed }); },
    loadState(s) { Object.assign(this, cloneState(s)); },
  };

  return self;
}
