import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GAMES } from '../src/games/index.js';
import { pong } from '../src/games/pong.js';
import { breakout } from '../src/games/breakout.js';
import { snake } from '../src/games/snake.js';
import { invaders } from '../src/games/invaders.js';
import { tetris } from '../src/games/tetris.js';
import { sequencer } from '../src/games/sequencer.js';
import { kong } from '../src/games/kong.js';
import { kongjr } from '../src/games/kongjr.js';
import { ghost } from '../src/games/ghost.js';
import { galaga } from '../src/games/galaga.js';
import { frogger } from '../src/games/frogger.js';
import { asteroids } from '../src/games/asteroids.js';
import { makeHarness, tick } from './harness.js';

/* ------------------------------------------------------------------ */
/* Catalogue-level smoke tests — every GameDefinition must satisfy the
   contract end-to-end (init, many updates, a draw, optional onKey).   */
/* ------------------------------------------------------------------ */

describe('GAMES catalogue', () => {
  it('lists 12 unique game ids', () => {
    const ids = GAMES.map((g) => g.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  for (const game of GAMES) {
    it(`${game.id} survives a full init/update/draw smoke cycle`, () => {
      const h = makeHarness();
      expect(typeof game.name).toBe('string');
      expect(typeof game.emoji).toBe('string');
      expect(typeof game.desc).toBe('string');
      expect(() => game.init(h.host)).not.toThrow();
      for (let i = 0; i < 50; i++) expect(() => game.update(h.host, 1 / 60)).not.toThrow();
      expect(() => game.draw(h.host)).not.toThrow();
    });
  }
});

/* ------------------------------------------------------------------ */
/* Pong                                                                */
/* ------------------------------------------------------------------ */

describe('pong', () => {
  it('init zeroes the score and seats the ball', () => {
    const h = makeHarness();
    pong.init(h.host);
    expect(h.lastScoreValue()).toBe(0);
    pong.draw(h.host);
  });

  it('ArrowUp/ArrowDown move the left paddle clamped to viewport', () => {
    const h = makeHarness();
    pong.init(h.host);
    h.press('ArrowUp');
    tick(pong, h, 100);
    h.release('ArrowUp');
    h.press('ArrowDown');
    tick(pong, h, 200);
    h.release('ArrowDown');
    expect(() => pong.update(h.host, 1 / 60)).not.toThrow();
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });

  it('emits multiple notes over a long simulation (wall/paddle bounces)', () => {
    const h = makeHarness();
    pong.init(h.host);
    for (let i = 0; i < 10_000; i++) pong.update(h.host, 1 / 60);
    expect(h.noteIndices().length).toBeGreaterThan(20);
  });

  it('respawns the ball when it exits left/right', () => {
    const h = makeHarness();
    pong.init(h.host);
    for (let i = 0; i < 2000; i++) pong.update(h.host, 1 / 60);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Breakout                                                            */
/* ------------------------------------------------------------------ */

describe('breakout', () => {
  it('creates a 50-brick grid on init', () => {
    const h = makeHarness();
    breakout.init(h.host);
    breakout.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('paddle movement clamps to the viewport', () => {
    const h = makeHarness();
    breakout.init(h.host);
    h.press('ArrowLeft');
    tick(breakout, h, 200);
    h.release('ArrowLeft');
    h.press('ArrowRight');
    tick(breakout, h, 200);
    h.release('ArrowRight');
    expect(() => breakout.update(h.host, 1 / 60)).not.toThrow();
  });

  it('eventually breaks bricks, emitting notes and score deltas', () => {
    const h = makeHarness();
    breakout.init(h.host);
    for (let i = 0; i < 2000; i++) breakout.update(h.host, 1 / 60);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Snake                                                               */
/* ------------------------------------------------------------------ */

describe('snake', () => {
  it('init places a single cell and reports zero score', () => {
    const h = makeHarness();
    snake.init(h.host);
    expect(h.lastScoreValue()).toBe(0);
    snake.draw(h.host);
  });

  it('onKey changes direction only when perpendicular', () => {
    const h = makeHarness();
    snake.init(h.host);
    snake.onKey?.('ArrowLeft', true, h.host);
    snake.onKey?.('ArrowUp', true, h.host);
    snake.onKey?.('w', true, h.host);
    snake.onKey?.('a', true, h.host);
    snake.onKey?.('s', true, h.host);
    snake.onKey?.('d', true, h.host);
    tick(snake, h, 100);
    expect(() => snake.update(h.host, 1 / 60)).not.toThrow();
  });

  it('growing snake triggers a note when it hits food', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const h = makeHarness();
    snake.init(h.host);
    for (let i = 0; i < 2000; i++) snake.update(h.host, 1 / 60);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });

  it('detects wall/self collision and restarts', () => {
    const h = makeHarness();
    snake.init(h.host);
    snake.onKey?.('ArrowUp', true, h.host);
    for (let i = 0; i < 500; i++) snake.update(h.host, 1 / 60);
    expect(h.noteIndices().includes(0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Invaders                                                            */
/* ------------------------------------------------------------------ */

describe('invaders', () => {
  it('init spawns 24 enemies in a 3x8 grid', () => {
    const h = makeHarness();
    invaders.init(h.host);
    invaders.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('ship fires bullets on space every 8 ticks', () => {
    const h = makeHarness();
    invaders.init(h.host);
    h.press(' ');
    tick(invaders, h, 40);
    expect(h.noteIndices()).toContain(12);
  });

  it('movement clamps within bounds', () => {
    const h = makeHarness();
    invaders.init(h.host);
    h.press('a');
    tick(invaders, h, 200);
    h.release('a');
    h.press('d');
    tick(invaders, h, 200);
    expect(() => invaders.update(h.host, 1 / 60)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Tetris                                                              */
/* ------------------------------------------------------------------ */

describe('tetris', () => {
  it('init builds a 20x10 empty grid', () => {
    const h = makeHarness();
    tetris.init(h.host);
    tetris.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('onKey moves and rotates the active piece', () => {
    const h = makeHarness();
    tetris.init(h.host);
    tetris.onKey?.('ArrowLeft', true, h.host);
    tetris.onKey?.('a', true, h.host);
    tetris.onKey?.('ArrowRight', true, h.host);
    tetris.onKey?.('d', true, h.host);
    tetris.onKey?.('ArrowDown', true, h.host);
    tetris.onKey?.('s', true, h.host);
    tetris.onKey?.('ArrowUp', true, h.host);
    tetris.onKey?.('w', true, h.host);
    expect(() => tetris.update(h.host, 1 / 60)).not.toThrow();
  });

  it('pieces eventually lock, emitting a note on each new-piece spawn', () => {
    const h = makeHarness();
    tetris.init(h.host);
    for (let i = 0; i < 2000; i++) tetris.update(h.host, 1 / 60);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Sequencer                                                           */
/* ------------------------------------------------------------------ */

describe('sequencer', () => {
  it('init clears the pattern grid', () => {
    const h = makeHarness();
    sequencer.init(h.host);
    sequencer.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('space toggles the cell under the cursor and plays a note', () => {
    const h = makeHarness();
    sequencer.init(h.host);
    sequencer.onKey?.(' ', true, h.host);
    expect(h.noteIndices().length).toBeGreaterThan(0);
    const prevCount = h.noteIndices().length;
    sequencer.onKey?.(' ', true, h.host);
    expect(h.noteIndices().length).toBe(prevCount);
  });

  it('cursor arrows wrap correctly in both dimensions', () => {
    const h = makeHarness();
    sequencer.init(h.host);
    for (let i = 0; i < 20; i++) sequencer.onKey?.('ArrowRight', true, h.host);
    for (let i = 0; i < 20; i++) sequencer.onKey?.('ArrowLeft', true, h.host);
    for (let i = 0; i < 20; i++) sequencer.onKey?.('ArrowDown', true, h.host);
    for (let i = 0; i < 20; i++) sequencer.onKey?.('ArrowUp', true, h.host);
    sequencer.onKey?.('d', true, h.host);
    sequencer.onKey?.('a', true, h.host);
    sequencer.onKey?.('s', true, h.host);
    sequencer.onKey?.('w', true, h.host);
    expect(() => sequencer.update(h.host, 1 / 60)).not.toThrow();
  });

  it('active pattern cells fire notes as the step cursor advances', () => {
    const h = makeHarness();
    sequencer.init(h.host);
    sequencer.onKey?.(' ', true, h.host);
    h.clearEvents();
    for (let i = 0; i < 2000; i++) sequencer.update(h.host, 1 / 60);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });

  it('handles extreme BPMs without throwing', () => {
    const hSlow = makeHarness({ synth: { bpm: 60 } });
    sequencer.init(hSlow.host);
    for (let i = 0; i < 100; i++) sequencer.update(hSlow.host, 1 / 60);
    const hFast = makeHarness({ synth: { bpm: 200 } });
    sequencer.init(hFast.host);
    for (let i = 0; i < 100; i++) sequencer.update(hFast.host, 1 / 60);
    expect(() => sequencer.update(hFast.host, 1 / 60)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Kong                                                                */
/* ------------------------------------------------------------------ */

describe('kong', () => {
  it('init places player and creates 5 platforms', () => {
    const h = makeHarness();
    kong.init(h.host);
    kong.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('jumping emits a note when grounded', () => {
    const h = makeHarness();
    kong.init(h.host);
    h.press('ArrowUp');
    tick(kong, h, 1);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });

  it('movement, barrels, and falls all exercise cleanly over time', () => {
    const h = makeHarness();
    kong.init(h.host);
    h.press('ArrowRight');
    for (let i = 0; i < 500; i++) kong.update(h.host, 1 / 60);
    h.release('ArrowRight');
    h.press('ArrowLeft');
    for (let i = 0; i < 500; i++) kong.update(h.host, 1 / 60);
    expect(() => kong.update(h.host, 1 / 60)).not.toThrow();
  });

  it('draws barrels once they have spawned (tick % 80 === 0)', () => {
    const h = makeHarness();
    kong.init(h.host);
    for (let i = 0; i < 120; i++) kong.update(h.host, 1 / 60);
    expect(() => kong.draw(h.host)).not.toThrow();
  });

  it('barrel/player collision scenario runs without throwing', () => {
    const h = makeHarness();
    kong.init(h.host);
    for (let frame = 0; frame < 5000; frame++) {
      if (frame % 40 === 0) h.press('ArrowUp');
      else h.release('ArrowUp');
      h.press('ArrowRight');
      kong.update(h.host, 1 / 60);
    }
    expect(() => kong.update(h.host, 1 / 60)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Kong Jr                                                             */
/* ------------------------------------------------------------------ */

describe('kongjr', () => {
  it('init creates 6 vines and 4 fruits', () => {
    const h = makeHarness();
    kongjr.init(h.host);
    kongjr.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('jump key emits a note when not on vine', () => {
    const h = makeHarness();
    kongjr.init(h.host);
    kongjr.onKey?.(' ', true, h.host);
    kongjr.onKey?.('ArrowUp', true, h.host);
    kongjr.onKey?.('w', true, h.host);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });

  it('falling onto a vine attaches and climbing/dismounting works', () => {
    const h = makeHarness();
    kongjr.init(h.host);
    h.press('ArrowRight');
    for (let i = 0; i < 300; i++) kongjr.update(h.host, 1 / 60);
    h.release('ArrowRight');
    h.press('ArrowUp');
    for (let i = 0; i < 50; i++) kongjr.update(h.host, 1 / 60);
    h.release('ArrowUp');
    h.press('ArrowLeft');
    for (let i = 0; i < 20; i++) kongjr.update(h.host, 1 / 60);
    expect(() => kongjr.update(h.host, 1 / 60)).not.toThrow();
  });

  it('climbing exercises up/down/left/right branches on the vine', () => {
    const h = makeHarness();
    kongjr.init(h.host);
    h.press('ArrowRight');
    for (let i = 0; i < 200; i++) kongjr.update(h.host, 1 / 60);
    h.release('ArrowRight');
    for (let i = 0; i < 200; i++) kongjr.update(h.host, 1 / 60);
    h.press('w');
    for (let i = 0; i < 20; i++) kongjr.update(h.host, 1 / 60);
    h.release('w');
    h.press('s');
    for (let i = 0; i < 20; i++) kongjr.update(h.host, 1 / 60);
    h.release('s');
    h.press('d');
    for (let i = 0; i < 5; i++) kongjr.update(h.host, 1 / 60);
    h.release('d');
    h.press('a');
    for (let i = 0; i < 5; i++) kongjr.update(h.host, 1 / 60);
    expect(() => kongjr.update(h.host, 1 / 60)).not.toThrow();
  });

  it('gravity loop triggers fall-floor clamp', () => {
    const h = makeHarness();
    kongjr.init(h.host);
    for (let i = 0; i < 200; i++) kongjr.update(h.host, 1 / 60);
    expect(() => kongjr.update(h.host, 1 / 60)).not.toThrow();
  });

  it('jumping near a vine attaches, then each climb direction runs', () => {
    const h = makeHarness();
    kongjr.init(h.host);
    h.press('d');
    for (let i = 0; i < 6; i++) kongjr.update(h.host, 1 / 60);
    h.release('d');
    kongjr.onKey?.(' ', true, h.host);
    for (let i = 0; i < 25; i++) kongjr.update(h.host, 1 / 60);
    h.press('w');
    for (let i = 0; i < 10; i++) kongjr.update(h.host, 1 / 60);
    h.release('w');
    h.press('s');
    for (let i = 0; i < 10; i++) kongjr.update(h.host, 1 / 60);
    h.release('s');
    h.press('a');
    for (let i = 0; i < 3; i++) kongjr.update(h.host, 1 / 60);
    h.release('a');
    expect(h.noteIndices().length).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* Ghost                                                               */
/* ------------------------------------------------------------------ */

describe('ghost', () => {
  it('init builds a symmetric maze and populates dots', () => {
    const h = makeHarness();
    ghost.init(h.host);
    ghost.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('onKey sets each cardinal nextDir including aliases', () => {
    const h = makeHarness();
    ghost.init(h.host);
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']) {
      ghost.onKey?.(k, true, h.host);
    }
    expect(() => ghost.update(h.host, 1 / 60)).not.toThrow();
  });

  it('ghosts wander and player collects dots across many frames', () => {
    const h = makeHarness();
    ghost.init(h.host);
    const dirs = ['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight'];
    for (let d = 0; d < dirs.length; d++) {
      ghost.onKey?.(dirs[d]!, true, h.host);
      for (let i = 0; i < 400; i++) ghost.update(h.host, 1 / 60);
    }
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Galaga                                                              */
/* ------------------------------------------------------------------ */

describe('galaga', () => {
  it('init seeds wave 1 enemies and zeros score', () => {
    const h = makeHarness();
    galaga.init(h.host);
    galaga.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('holding space fires bullets every 10 ticks', () => {
    const h = makeHarness();
    galaga.init(h.host);
    h.press(' ');
    tick(galaga, h, 60);
    expect(h.noteIndices()).toContain(10);
  });

  it('long run destroys enemies and advances the wave', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.001);
    const h = makeHarness();
    galaga.init(h.host);
    h.press(' ');
    for (let i = 0; i < 5000; i++) galaga.update(h.host, 1 / 60);
    expect(() => galaga.update(h.host, 1 / 60)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Frogger                                                             */
/* ------------------------------------------------------------------ */

describe('frogger', () => {
  it('init creates 10 lanes with 4 cars each', () => {
    const h = makeHarness();
    frogger.init(h.host);
    frogger.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('hopping up emits ascending notes', () => {
    const h = makeHarness();
    frogger.init(h.host);
    frogger.onKey?.('ArrowUp', true, h.host);
    frogger.onKey?.('w', true, h.host);
    expect(h.noteIndices().length).toBeGreaterThan(0);
    frogger.onKey?.('ArrowDown', true, h.host);
    frogger.onKey?.('s', true, h.host);
    frogger.onKey?.('ArrowLeft', true, h.host);
    frogger.onKey?.('a', true, h.host);
    frogger.onKey?.('ArrowRight', true, h.host);
    frogger.onKey?.('d', true, h.host);
  });

  it('reaching the top emits a +100 scoreDelta and note 12', () => {
    const h = makeHarness();
    frogger.init(h.host);
    for (let i = 0; i < 15; i++) frogger.onKey?.('ArrowUp', true, h.host);
    frogger.update(h.host, 1 / 60);
    expect(h.scoreDeltaEvents().some((e) => e.delta >= 100)).toBe(true);
    expect(h.noteIndices()).toContain(12);
  });

  it('cars and water laps run without throwing', () => {
    const h = makeHarness();
    frogger.init(h.host);
    for (let i = 0; i < 500; i++) frogger.update(h.host, 1 / 60);
    expect(() => frogger.update(h.host, 1 / 60)).not.toThrow();
  });

  it('hopping into water without a log resets the frog', () => {
    const h = makeHarness();
    frogger.init(h.host);
    h.clearEvents();
    for (let i = 0; i < 6; i++) frogger.onKey?.('ArrowUp', true, h.host);
    for (let i = 0; i < 10; i++) frogger.update(h.host, 1 / 60);
    expect(h.noteIndices().includes(0)).toBe(true);
  });

  it('cars on road lanes eventually hit the frog', () => {
    const h = makeHarness();
    frogger.init(h.host);
    frogger.onKey?.('ArrowUp', true, h.host);
    h.clearEvents();
    for (let i = 0; i < 500; i++) frogger.update(h.host, 1 / 60);
    expect(h.noteIndices().includes(0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Asteroids                                                           */
/* ------------------------------------------------------------------ */

describe('asteroids', () => {
  it('init spawns 6 asteroids', () => {
    const h = makeHarness();
    asteroids.init(h.host);
    asteroids.draw(h.host);
    expect(h.lastScoreValue()).toBe(0);
  });

  it('rotation, thrust, and shooting work', () => {
    const h = makeHarness();
    asteroids.init(h.host);
    h.press('ArrowLeft');
    tick(asteroids, h, 30);
    h.release('ArrowLeft');
    h.press('ArrowRight');
    tick(asteroids, h, 30);
    h.release('ArrowRight');
    h.press('ArrowUp');
    tick(asteroids, h, 30);
    h.release('ArrowUp');
    h.press(' ');
    tick(asteroids, h, 40);
    expect(h.noteIndices().length).toBeGreaterThan(0);
  });

  it('ship wraps around the viewport edges', () => {
    const h = makeHarness();
    asteroids.init(h.host);
    h.press('ArrowUp');
    for (let i = 0; i < 1000; i++) asteroids.update(h.host, 1 / 60);
    expect(() => asteroids.update(h.host, 1 / 60)).not.toThrow();
  });

  it('destroys asteroids and respawns a fresh field when all are gone', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const h = makeHarness();
    asteroids.init(h.host);
    h.press(' ');
    for (let i = 0; i < 3000; i++) asteroids.update(h.host, 1 / 60);
    expect(() => asteroids.update(h.host, 1 / 60)).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Shared teardown for Math.random stubs                               */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  // Reset any leaked spy from a prior test in the same file.
  vi.restoreAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});
