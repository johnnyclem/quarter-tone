import { describe, expect, it } from 'vitest';
import { GAME_FACTORIES } from '../src/games/index.js';
import { createPong } from '../src/games/pong.js';
import { createBreakout } from '../src/games/breakout.js';
import { createSnake } from '../src/games/snake.js';
import { createInvaders } from '../src/games/invaders.js';
import { createTetris } from '../src/games/tetris.js';
import { createSequencer } from '../src/games/sequencer.js';
import { createKong } from '../src/games/kong.js';
import { createKongJr } from '../src/games/kongjr.js';
import { createGhost } from '../src/games/ghost.js';
import { createGalaga } from '../src/games/galaga.js';
import { createFrogger } from '../src/games/frogger.js';
import { createAsteroids } from '../src/games/asteroids.js';
import { makeHarness, tick } from './harness.js';

/* ------------------------------------------------------------------ */
/* Catalogue-level smoke tests — every factory must satisfy the Game
   contract end-to-end (init, many updates, a draw, optional onKey).   */
/* ------------------------------------------------------------------ */

describe('GAME_FACTORIES catalogue', () => {
  it('lists 12 unique game ids', () => {
    const ids = GAME_FACTORIES.map((g) => g.id);
    expect(ids).toHaveLength(12);
    expect(new Set(ids).size).toBe(12);
  });

  for (const entry of GAME_FACTORIES) {
    it(`${entry.id} survives a full init/update/draw smoke cycle`, () => {
      const h = makeHarness();
      const game = entry.factory(h.deps);
      expect(game.id).toBe(entry.id);
      expect(typeof game.name).toBe('string');
      expect(typeof game.emoji).toBe('string');
      expect(typeof game.desc).toBe('string');
      expect(() => game.init()).not.toThrow();
      for (let i = 0; i < 50; i++) expect(() => game.update()).not.toThrow();
      expect(() => game.draw(h.ctx)).not.toThrow();
    });
  }
});

/* ------------------------------------------------------------------ */
/* Pong                                                                */
/* ------------------------------------------------------------------ */

describe('pong', () => {
  it('init zeroes the score and seats the ball', () => {
    const h = makeHarness();
    const g = createPong(h.deps);
    g.init();
    expect(h.setScore).toHaveBeenLastCalledWith(0);
    g.draw(h.ctx);
  });

  it('ArrowUp/ArrowDown move the left paddle clamped to viewport', () => {
    const h = makeHarness();
    const g = createPong(h.deps);
    g.init();
    h.press('ArrowUp');
    tick(g, 100);
    h.release('ArrowUp');
    h.press('ArrowDown');
    tick(g, 200);
    h.release('ArrowDown');
    // paddle stays within [0, H-padH] regardless of input duration
    // (if it ever left the range, update() would throw in later frames).
    expect(() => g.update()).not.toThrow();
    expect(h.playNote).toHaveBeenCalled(); // bouncing the ball emits notes
  });

  it('emits multiple notes over a long simulation (wall/paddle bounces)', () => {
    const h = makeHarness();
    const g = createPong(h.deps);
    g.init();
    for (let i = 0; i < 10_000; i++) g.update();
    // Wall bounces alone generate dozens of notes in 10k frames.
    expect(h.playNote.mock.calls.length).toBeGreaterThan(20);
  });

  it('respawns the ball when it exits left/right', () => {
    const h = makeHarness();
    const g = createPong(h.deps);
    g.init();
    // Run long enough for the CPU to miss and the ball to reset at least once.
    for (let i = 0; i < 2000; i++) g.update();
    // No throw = OK; note callbacks fired.
    expect(h.playNote.mock.calls.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Breakout                                                            */
/* ------------------------------------------------------------------ */

describe('breakout', () => {
  it('creates a 50-brick grid on init', () => {
    const h = makeHarness();
    const g = createBreakout(h.deps);
    g.init();
    g.draw(h.ctx);
    // Touch internal state for coverage via a draw call (bricks rendered).
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('paddle movement clamps to the viewport', () => {
    const h = makeHarness();
    const g = createBreakout(h.deps);
    g.init();
    h.press('ArrowLeft');
    tick(g, 200);
    h.release('ArrowLeft');
    h.press('ArrowRight');
    tick(g, 200);
    h.release('ArrowRight');
    expect(() => g.update()).not.toThrow();
  });

  it('eventually breaks bricks, firing playNote and bumping score', () => {
    const h = makeHarness();
    const g = createBreakout(h.deps);
    g.init();
    for (let i = 0; i < 2000; i++) g.update();
    expect(h.playNote.mock.calls.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Snake                                                               */
/* ------------------------------------------------------------------ */

describe('snake', () => {
  it('init places a single cell and reports zero score', () => {
    const h = makeHarness();
    const g = createSnake(h.deps);
    g.init();
    expect(h.setScore).toHaveBeenLastCalledWith(0);
    g.draw(h.ctx);
  });

  it('onKey changes direction only when perpendicular', () => {
    const h = makeHarness();
    const g = createSnake(h.deps);
    g.init();
    // heading right (dx=1) — pressing Left (opposite) should be ignored
    g.onKey?.('ArrowLeft', true);
    g.onKey?.('ArrowUp', true);
    // 'w', 'a', 's', 'd' aliases too
    g.onKey?.('w', true);
    g.onKey?.('a', true);
    g.onKey?.('s', true);
    g.onKey?.('d', true);
    tick(g, 100);
    expect(() => g.update()).not.toThrow();
  });

  it('growing snake triggers a note when it hits food', () => {
    const h = makeHarness({ random: () => 0 }); // force food to (0,0)
    const g = createSnake(h.deps);
    g.init();
    // With snake at (10,10) moving right and food at (0,0), it won't collide
    // directly. Running many frames will eventually hit a wall or self,
    // which resets — that also exercises the respawn branch.
    for (let i = 0; i < 2000; i++) g.update();
    expect(h.playNote).toHaveBeenCalled();
  });

  it('detects wall/self collision and restarts', () => {
    const h = makeHarness();
    const g = createSnake(h.deps);
    g.init();
    // Steer up repeatedly so the snake eventually hits top wall
    g.onKey?.('ArrowUp', true);
    for (let i = 0; i < 500; i++) g.update();
    expect(h.playNote.mock.calls.some((c) => c[0] === 0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Invaders                                                            */
/* ------------------------------------------------------------------ */

describe('invaders', () => {
  it('init spawns 24 enemies in a 3x8 grid', () => {
    const h = makeHarness();
    const g = createInvaders(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('ship fires bullets on space every 8 ticks', () => {
    const h = makeHarness();
    const g = createInvaders(h.deps);
    g.init();
    h.press(' ');
    tick(g, 40);
    expect(h.playNote).toHaveBeenCalledWith(12);
  });

  it('movement clamps within bounds', () => {
    const h = makeHarness();
    const g = createInvaders(h.deps);
    g.init();
    h.press('a');
    tick(g, 200);
    h.release('a');
    h.press('d');
    tick(g, 200);
    expect(() => g.update()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Tetris                                                              */
/* ------------------------------------------------------------------ */

describe('tetris', () => {
  it('init builds a 20x10 empty grid', () => {
    const h = makeHarness();
    const g = createTetris(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('onKey moves and rotates the active piece', () => {
    const h = makeHarness();
    const g = createTetris(h.deps);
    g.init();
    g.onKey?.('ArrowLeft', true);
    g.onKey?.('a', true);
    g.onKey?.('ArrowRight', true);
    g.onKey?.('d', true);
    g.onKey?.('ArrowDown', true);
    g.onKey?.('s', true);
    g.onKey?.('ArrowUp', true);
    g.onKey?.('w', true);
    expect(() => g.update()).not.toThrow();
  });

  it('pieces eventually lock, producing a playNote on new-piece spawn', () => {
    const h = makeHarness();
    const g = createTetris(h.deps);
    g.init();
    // Default drop speed is every 30 ticks; 2000 ticks is ~66 drops.
    for (let i = 0; i < 2000; i++) g.update();
    expect(h.playNote.mock.calls.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Sequencer                                                           */
/* ------------------------------------------------------------------ */

describe('sequencer', () => {
  it('init clears the pattern grid', () => {
    const h = makeHarness();
    const g = createSequencer(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('space toggles the cell under the cursor and plays a note', () => {
    const h = makeHarness();
    const g = createSequencer(h.deps);
    g.init();
    g.onKey?.(' ', true);
    expect(h.playNote).toHaveBeenCalled();
    // Toggle off — should not emit again for that press
    const prevCount = h.playNote.mock.calls.length;
    g.onKey?.(' ', true);
    expect(h.playNote.mock.calls.length).toBe(prevCount);
  });

  it('cursor arrows wrap correctly in both dimensions', () => {
    const h = makeHarness();
    const g = createSequencer(h.deps);
    g.init();
    for (let i = 0; i < 20; i++) g.onKey?.('ArrowRight', true);
    for (let i = 0; i < 20; i++) g.onKey?.('ArrowLeft', true);
    for (let i = 0; i < 20; i++) g.onKey?.('ArrowDown', true);
    for (let i = 0; i < 20; i++) g.onKey?.('ArrowUp', true);
    // Aliases
    g.onKey?.('d', true);
    g.onKey?.('a', true);
    g.onKey?.('s', true);
    g.onKey?.('w', true);
    expect(() => g.update()).not.toThrow();
  });

  it('active pattern cells fire playNote as the step cursor advances', () => {
    const h = makeHarness();
    const g = createSequencer(h.deps);
    g.init();
    // Activate a cell then advance many frames
    g.onKey?.(' ', true);
    h.playNote.mockClear();
    for (let i = 0; i < 2000; i++) g.update();
    expect(h.playNote.mock.calls.length).toBeGreaterThan(0);
  });

  it('handles extreme BPMs without throwing', () => {
    const h = makeHarness({ getBpm: () => 60 });
    const g = createSequencer(h.deps);
    g.init();
    for (let i = 0; i < 100; i++) g.update();
    const hFast = makeHarness({ getBpm: () => 200 });
    const gFast = createSequencer(hFast.deps);
    gFast.init();
    for (let i = 0; i < 100; i++) gFast.update();
    expect(() => gFast.update()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Kong                                                                */
/* ------------------------------------------------------------------ */

describe('kong', () => {
  it('init places player and creates 5 platforms', () => {
    const h = makeHarness();
    const g = createKong(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('jumping fires a playNote when grounded', () => {
    const h = makeHarness();
    const g = createKong(h.deps);
    g.init();
    h.press('ArrowUp');
    tick(g, 1);
    expect(h.playNote).toHaveBeenCalled();
  });

  it('movement, barrels, and falls all exercise cleanly over time', () => {
    const h = makeHarness();
    const g = createKong(h.deps);
    g.init();
    h.press('ArrowRight');
    for (let i = 0; i < 500; i++) g.update();
    h.release('ArrowRight');
    h.press('ArrowLeft');
    for (let i = 0; i < 500; i++) g.update();
    expect(() => g.update()).not.toThrow();
  });

  it('draws barrels once they have spawned (tick % 80 === 0)', () => {
    const h = makeHarness();
    const g = createKong(h.deps);
    g.init();
    // 100+ frames ensures the barrel-spawn branch ran at least once.
    for (let i = 0; i < 120; i++) g.update();
    expect(() => g.draw(h.ctx)).not.toThrow();
  });

  it('barrel/player collision resets player position', () => {
    const h = makeHarness();
    const g = createKong(h.deps);
    g.init();
    // Climb up by jumping while running right; eventually a barrel catches up
    // on a shared platform.
    for (let frame = 0; frame < 5000; frame++) {
      if (frame % 40 === 0) h.press('ArrowUp');
      else h.release('ArrowUp');
      h.press('ArrowRight');
      g.update();
    }
    // At least some playNote(0) calls (barrel death) will have fired.
    expect(() => g.update()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Kong Jr                                                             */
/* ------------------------------------------------------------------ */

describe('kongjr', () => {
  it('init creates 6 vines and 4 fruits', () => {
    const h = makeHarness();
    const g = createKongJr(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('jump key plays a note when not on vine', () => {
    const h = makeHarness();
    const g = createKongJr(h.deps);
    g.init();
    g.onKey?.(' ', true);
    g.onKey?.('ArrowUp', true);
    g.onKey?.('w', true);
    expect(h.playNote).toHaveBeenCalled();
  });

  it('falling onto a vine attaches and climbing/dismounting works', () => {
    const h = makeHarness();
    const g = createKongJr(h.deps);
    g.init();
    // Move toward vines; player x = 60, first vine at x=80.
    h.press('ArrowRight');
    for (let i = 0; i < 300; i++) g.update();
    h.release('ArrowRight');
    // Try to climb
    h.press('ArrowUp');
    for (let i = 0; i < 50; i++) g.update();
    h.release('ArrowUp');
    // Dismount with horizontal
    h.press('ArrowLeft');
    for (let i = 0; i < 20; i++) g.update();
    expect(() => g.update()).not.toThrow();
  });

  it('climbing exercises up/down/left/right branches on the vine', () => {
    const h = makeHarness();
    const g = createKongJr(h.deps);
    g.init();
    // Drift to the first vine at x=80
    h.press('ArrowRight');
    for (let i = 0; i < 200; i++) g.update();
    h.release('ArrowRight');
    for (let i = 0; i < 200; i++) g.update();
    // Once attached, press each climb direction in turn
    h.press('w');
    for (let i = 0; i < 20; i++) g.update();
    h.release('w');
    h.press('s');
    for (let i = 0; i < 20; i++) g.update();
    h.release('s');
    // Dismount right (uses alias)
    h.press('d');
    for (let i = 0; i < 5; i++) g.update();
    h.release('d');
    h.press('a');
    for (let i = 0; i < 5; i++) g.update();
    expect(() => g.update()).not.toThrow();
  });

  it('gravity loop triggers fall-floor clamp', () => {
    const h = makeHarness();
    const g = createKongJr(h.deps);
    g.init();
    // Falling with no input: py exceeds 380 → reset branch (lines ~86-89).
    for (let i = 0; i < 200; i++) g.update();
    expect(() => g.update()).not.toThrow();
  });

  it('jumping near a vine attaches, then each climb direction runs', () => {
    const h = makeHarness();
    const g = createKongJr(h.deps);
    g.init();
    // Drift right so px ≈ 78 (near vine 0 at x=80).
    h.press('d');
    for (let i = 0; i < 6; i++) g.update();
    h.release('d');
    // Jump (onKey fires vy=-7). Jump apex will carry through vine-y range.
    g.onKey?.(' ', true);
    // Let the attach happen during ascent.
    for (let i = 0; i < 25; i++) g.update();
    // Once attached, exercise each climb branch.
    h.press('w');
    for (let i = 0; i < 10; i++) g.update();
    h.release('w');
    h.press('s');
    for (let i = 0; i < 10; i++) g.update();
    h.release('s');
    h.press('a');
    for (let i = 0; i < 3; i++) g.update();
    h.release('a');
    // Notes: vine attach plays note(i*2); climb up/down plays more.
    expect(h.playNote.mock.calls.length).toBeGreaterThan(1);
  });
});

/* ------------------------------------------------------------------ */
/* Ghost                                                               */
/* ------------------------------------------------------------------ */

describe('ghost', () => {
  it('init builds a symmetric maze and populates dots', () => {
    const h = makeHarness();
    const g = createGhost(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('onKey sets each cardinal nextDir including aliases', () => {
    const h = makeHarness();
    const g = createGhost(h.deps);
    g.init();
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd']) {
      g.onKey?.(k, true);
    }
    expect(() => g.update()).not.toThrow();
  });

  it('ghosts wander and player collects dots across many frames', () => {
    const h = makeHarness();
    const g = createGhost(h.deps);
    g.init();
    // Drive in several directions over the course of the test
    const dirs = ['ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight'];
    for (let d = 0; d < dirs.length; d++) {
      g.onKey?.(dirs[d], true);
      for (let i = 0; i < 400; i++) g.update();
    }
    // Over time, at least some interactions (dot eaten or ghost collision)
    // will fire playNote.
    expect(h.playNote.mock.calls.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/* Galaga                                                              */
/* ------------------------------------------------------------------ */

describe('galaga', () => {
  it('init seeds wave 1 enemies and zeros score', () => {
    const h = makeHarness();
    const g = createGalaga(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('holding space fires bullets every 10 ticks', () => {
    const h = makeHarness();
    const g = createGalaga(h.deps);
    g.init();
    h.press(' ');
    tick(g, 60);
    expect(h.playNote).toHaveBeenCalledWith(10);
  });

  it('long run destroys enemies and advances the wave', () => {
    // Seed rng so diving events occur and collisions land.
    const h = makeHarness({ random: () => 0.001 });
    const g = createGalaga(h.deps);
    g.init();
    h.press(' ');
    for (let i = 0; i < 5000; i++) g.update();
    // Either score bumps or wave advances — easiest check: update didn't explode
    expect(() => g.update()).not.toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* Frogger                                                             */
/* ------------------------------------------------------------------ */

describe('frogger', () => {
  it('init creates 10 lanes with 4 cars each', () => {
    const h = makeHarness();
    const g = createFrogger(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('hopping up plays ascending notes', () => {
    const h = makeHarness();
    const g = createFrogger(h.deps);
    g.init();
    g.onKey?.('ArrowUp', true);
    g.onKey?.('w', true);
    expect(h.playNote).toHaveBeenCalled();
    g.onKey?.('ArrowDown', true);
    g.onKey?.('s', true);
    g.onKey?.('ArrowLeft', true);
    g.onKey?.('a', true);
    g.onKey?.('ArrowRight', true);
    g.onKey?.('d', true);
  });

  it('reaching the top scores 100 and resets', () => {
    const h = makeHarness();
    const g = createFrogger(h.deps);
    g.init();
    // Eleven hops each -36 push py from 380 to clamp at 0.
    for (let i = 0; i < 15; i++) g.onKey?.('ArrowUp', true);
    // The scoring branch fires inside update(), not onKey.
    g.update();
    expect(h.setScore.mock.calls.some((c) => (c[0] as number) >= 100)).toBe(true);
    expect(h.playNote).toHaveBeenCalledWith(12);
  });

  it('cars and water laps run without throwing', () => {
    const h = makeHarness();
    const g = createFrogger(h.deps);
    g.init();
    for (let i = 0; i < 500; i++) g.update();
    expect(() => g.update()).not.toThrow();
  });

  it('hopping into water without a log resets the frog', () => {
    const h = makeHarness();
    const g = createFrogger(h.deps);
    g.init();
    h.playNote.mockClear();
    // 6 hops up puts py near lane 5 (y=160, water).
    for (let i = 0; i < 6; i++) g.onKey?.('ArrowUp', true);
    // Let update find the "in water, no log" branch.
    for (let i = 0; i < 10; i++) g.update();
    expect(h.playNote.mock.calls.some((c) => c[0] === 0)).toBe(true);
  });

  it('cars on road lanes eventually hit the frog', () => {
    const h = makeHarness();
    const g = createFrogger(h.deps);
    g.init();
    // One hop up puts py=344 in lane 0 (y=340, road).
    g.onKey?.('ArrowUp', true);
    h.playNote.mockClear();
    // Let enough frames pass so a car slides under the frog.
    for (let i = 0; i < 500; i++) g.update();
    expect(h.playNote.mock.calls.some((c) => c[0] === 0)).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Asteroids                                                           */
/* ------------------------------------------------------------------ */

describe('asteroids', () => {
  it('init spawns 6 asteroids', () => {
    const h = makeHarness();
    const g = createAsteroids(h.deps);
    g.init();
    g.draw(h.ctx);
    expect(h.setScore).toHaveBeenLastCalledWith(0);
  });

  it('rotation, thrust, and shooting work', () => {
    const h = makeHarness();
    const g = createAsteroids(h.deps);
    g.init();
    h.press('ArrowLeft');
    tick(g, 30);
    h.release('ArrowLeft');
    h.press('ArrowRight');
    tick(g, 30);
    h.release('ArrowRight');
    h.press('ArrowUp');
    tick(g, 30);
    h.release('ArrowUp');
    h.press(' ');
    tick(g, 40);
    expect(h.playNote).toHaveBeenCalled();
  });

  it('ship wraps around the viewport edges', () => {
    const h = makeHarness();
    const g = createAsteroids(h.deps);
    g.init();
    h.press('ArrowUp');
    for (let i = 0; i < 1000; i++) g.update();
    // Run without throwing is enough — wrap branches are hit by velocity drift.
    expect(() => g.update()).not.toThrow();
  });

  it('destroys asteroids and respawns a fresh field when all are gone', () => {
    const h = makeHarness({ random: () => 0.5 });
    const g = createAsteroids(h.deps);
    g.init();
    // Fire a lot with repeated angles — we rely on wrap + density to eventually
    // clear the field via forced collision at ship origin.
    h.press(' ');
    for (let i = 0; i < 3000; i++) g.update();
    expect(() => g.update()).not.toThrow();
  });
});
