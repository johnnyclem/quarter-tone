import type {
  DrawingContext,
  GameDefinition,
  GameEvent,
  GameHost,
  NoteEvent,
  ScoreEvent,
  ScoreDeltaEvent,
  SynthConfig,
} from '../src/types.js';

export interface Harness {
  host: GameHost;
  events: GameEvent[];
  ctx: DrawingContext;
  press(...keys: string[]): void;
  release(...keys: string[]): void;
  clearKeys(): void;
  clearEvents(): void;
  noteIndices(): number[];
  scoreEvents(): ScoreEvent[];
  scoreDeltaEvents(): ScoreDeltaEvent[];
  lastScoreValue(): number | undefined;
}

export interface HarnessOptions {
  width?: number;
  height?: number;
  synth?: Partial<SynthConfig>;
}

const DEFAULT_SYNTH: SynthConfig = {
  key: 0,
  scale: 'Major',
  wave: 'triangle',
  arp: 'Up',
  octave: 4,
  attack: 0.02,
  release: 0.3,
  delayWet: 0.2,
  reverbWet: 0.2,
  volume: 0.5,
  bpm: 120,
};

/** Deterministic RNG for tests that need reproducible sequences. */
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

export function makeHarness(options: HarnessOptions = {}): Harness {
  const keys: Record<string, boolean> = {};
  const events: GameEvent[] = [];
  const ctx = makeCtx();
  const synth: SynthConfig = { ...DEFAULT_SYNTH, ...options.synth };
  const host: GameHost = {
    ctx,
    width: options.width ?? 480,
    height: options.height ?? 400,
    emit(event) { events.push(event); },
    isKeyDown(k) { return !!keys[k]; },
    get synth() { return synth; },
  };
  return {
    host,
    events,
    ctx,
    press: (...k) => { for (const key of k) keys[key] = true; },
    release: (...k) => { for (const key of k) keys[key] = false; },
    clearKeys: () => { for (const k of Object.keys(keys)) delete keys[k]; },
    clearEvents: () => { events.length = 0; },
    noteIndices: () =>
      events.filter((e): e is NoteEvent => e.type === 'note').map((e) => e.index),
    scoreEvents: () =>
      events.filter((e): e is ScoreEvent => e.type === 'score'),
    scoreDeltaEvents: () =>
      events.filter((e): e is ScoreDeltaEvent => e.type === 'scoreDelta'),
    lastScoreValue: () => {
      const s = events.filter((e): e is ScoreEvent => e.type === 'score');
      return s.length > 0 ? s[s.length - 1]!.value : undefined;
    },
  };
}

/** Run `update()` n times. Convenient for fast-forwarding tick-based games. */
export function tick(game: GameDefinition, h: Harness, n: number = 1): void {
  for (let i = 0; i < n; i++) game.update(h.host, 1 / 60);
}
