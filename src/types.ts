/**
 * Core type definitions for Quarter Tone.
 *
 * These interfaces form the contract between:
 *   - games (self-contained playables in the cabinet)
 *   - the synth engine (note/FX routing)
 *   - the arcade host (canvas, input, score, menu)
 *
 * This module is intentionally dependency-free: types only, no runtime.
 */

/* -------------------------------------------------------------------------- */
/*  Synth primitives                                                          */
/* -------------------------------------------------------------------------- */

/** Oscillator waveforms exposed by the synth UI. */
export type Waveform = 'sine' | 'triangle' | 'square' | 'sawtooth';

/** Named scales supported by the synth. */
export type ScaleName =
  | 'Major'
  | 'Minor'
  | 'Penta'
  | 'Blues'
  | 'Dorian'
  | 'Mixo'
  | 'Phrygian';

/** Arpeggiator directions. */
export type ArpMode = 'Up' | 'Down' | 'Bounce' | 'Random';

/**
 * Full synth configuration — the persistable shape of the user-tweakable
 * synth state exposed by the drawer. Values are stored in their natural
 * units (seconds, 0..1 wet amounts, BPM) rather than UI indices, so this
 * type doubles as a preset format.
 */
export interface SynthConfig {
  /** Root key as a semitone offset from C (0..11). */
  key: number;
  /** Active scale name. */
  scale: ScaleName;
  /** Oscillator waveform. */
  wave: Waveform;
  /** Arpeggiator mode. */
  arp: ArpMode;
  /** Center octave for scale-degree lookups (typically 2..6). */
  octave: number;
  /** Envelope attack time in seconds. */
  attack: number;
  /** Envelope release time in seconds. */
  release: number;
  /** Delay FX wet amount (0..1). */
  delayWet: number;
  /** Reverb FX wet amount (0..1). */
  reverbWet: number;
  /** Master volume (0..1, mapped to dB by the engine). */
  volume: number;
  /** Tempo in beats per minute. */
  bpm: number;
}

/* -------------------------------------------------------------------------- */
/*  Game -> host events                                                       */
/* -------------------------------------------------------------------------- */

/** Play a single note, referenced by scale-degree index (wraps automatically). */
export interface NoteEvent {
  type: 'note';
  index: number;
  /** Tone.js-style duration token (e.g. '16n'). Defaults to '16n'. */
  duration?: string;
  /** Velocity 0..1. Defaults to 1. */
  velocity?: number;
}

/** Play several scale-degree indices simultaneously. */
export interface ChordEvent {
  type: 'chord';
  indices: number[];
  duration?: string;
  velocity?: number;
}

/** Set the cabinet score to an absolute value. */
export interface ScoreEvent {
  type: 'score';
  value: number;
}

/** Add to the cabinet score (positive or negative). */
export interface ScoreDeltaEvent {
  type: 'scoreDelta';
  delta: number;
}

/** Fire a named FX trigger (reserved for future routing). */
export interface FxEvent {
  type: 'fx';
  name: string;
  params?: Record<string, number | string>;
}

/** Discriminated union of every event a game can emit back to the host. */
export type GameEvent =
  | NoteEvent
  | ChordEvent
  | ScoreEvent
  | ScoreDeltaEvent
  | FxEvent;

/* -------------------------------------------------------------------------- */
/*  Host -> game API                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Services the arcade host hands to a game on each lifecycle call.
 * Keeping this explicit (rather than using module-scope globals) is what
 * lets games be written, tested, and swapped independently.
 */
export interface GameHost {
  /** 2D rendering context for the game viewport. */
  ctx: CanvasRenderingContext2D;
  /** Logical viewport width in pixels. */
  width: number;
  /** Logical viewport height in pixels. */
  height: number;
  /** Emit a GameEvent (note, chord, score, fx...) to the host. */
  emit(event: GameEvent): void;
  /** Poll keyboard state: true if the given key is currently held. */
  isKeyDown(key: string): boolean;
  /** Read-only view of the current synth config (e.g. for BPM-synced games). */
  readonly synth: Readonly<SynthConfig>;
}

/* -------------------------------------------------------------------------- */
/*  Game definition                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The contract every arcade game implements. A GameDefinition is a plain
 * descriptor plus lifecycle hooks; it owns its own internal state but
 * never reaches outside the GameHost it is given.
 */
export interface GameDefinition {
  /** Stable, url-safe identifier (used for menus, save state, deep links). */
  id: string;
  /** Display name shown in the menu and marquee. */
  name: string;
  /** Emoji shown on the menu card. */
  emoji: string;
  /** One-line description shown on the menu card. */
  desc: string;

  /** Called once when the game is launched or restarted. */
  init(host: GameHost): void;
  /** Called each frame; `dt` is the seconds since the previous frame. */
  update(host: GameHost, dt: number): void;
  /** Called each frame after update to render to `host.ctx`. */
  draw(host: GameHost): void;
  /** Optional key handler; invoked on keydown/keyup with the raw key name. */
  onKey?(key: string, down: boolean, host: GameHost): void;
  /** Optional cleanup hook called before another game is launched. */
  teardown?(host: GameHost): void;
}
