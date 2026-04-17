import { vi } from 'vitest';
import type { DrawingContext, Game, GameDeps } from '../src/types.js';

export interface Harness {
  deps: GameDeps;
  playNote: ReturnType<typeof vi.fn>;
  setScore: ReturnType<typeof vi.fn>;
  getScore: () => number;
  press(...keys: string[]): void;
  release(...keys: string[]): void;
  clearKeys(): void;
  ctx: DrawingContext;
}

export function makeDeterministicRng(seed: number = 0x1234_5678): () => number {
  // Mulberry32 — tiny, deterministic, good enough for tests.
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeCtx(): DrawingContext {
  const noop = () => {};
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fillText: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    fill: noop,
    stroke: noop,
    setLineDash: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
  };
}

export function makeHarness(overrides: Partial<GameDeps> = {}): Harness {
  const keys: Record<string, boolean> = {};
  let score = 0;
  const playNote = vi.fn();
  const setScore = vi.fn((s: number) => {
    score = s;
  }) as ReturnType<typeof vi.fn>;
  // Assignment above widens the Mock type so TS is happy with GameDeps.setScore's
  // broader (s: number) => void shape.
  const getScore = () => score;
  const deps: GameDeps = {
    keys,
    playNote,
    setScore,
    getScore,
    width: 480,
    height: 400,
    getBpm: () => 120,
    random: makeDeterministicRng(),
    ...overrides,
  };
  return {
    deps,
    playNote,
    setScore,
    getScore,
    press: (...k: string[]) => {
      for (const key of k) keys[key] = true;
    },
    release: (...k: string[]) => {
      for (const key of k) keys[key] = false;
    },
    clearKeys: () => {
      for (const k of Object.keys(keys)) delete keys[k];
    },
    ctx: makeCtx(),
  };
}

/** Run `update()` n times. Convenient for fast-forwarding tick-based games. */
export function tick(game: Game, n: number = 1): void {
  for (let i = 0; i < n; i++) game.update();
}
