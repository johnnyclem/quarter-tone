/**
 * SynthMapper — bridge between `@quarter-tone/core`'s pure ScaleMapper and a
 * real Tone.js audio engine.
 *
 * Builds (and owns) a fixed signal chain:
 *
 *   PolySynth ─▶ Volume ─▶ FeedbackDelay ─▶ Reverb ─▶ destination
 *
 * Games emit scale-degree indices via `playNote(i)` / `playChord([i,j,...])`;
 * the SynthMapper resolves those indices to concrete note names using its
 * ScaleMapper and triggers the polyphonic synth. Knobs (wave, attack, release,
 * delay wet, reverb wet, volume, BPM) are exposed as setters that update the
 * underlying Tone nodes in place.
 *
 * The Tone.js namespace is injected rather than imported so the class can be
 * unit-tested against a lightweight fake while the arcade host binds it to the
 * real `Tone` global.
 */

import { ScaleMapper } from '@quarter-tone/core';
import type {
  ToneFeedbackDelay,
  ToneLib,
  TonePolySynth,
  ToneReverb,
  ToneVolume,
  ToneWave,
} from './tone-types.js';

/** Construction-time tweakables. All fields optional — sensible defaults. */
export interface SynthMapperOptions {
  /** Oscillator waveform. Default `'triangle'`. */
  wave?: ToneWave;
  /** Envelope attack seconds. Default `0.02`. */
  attack?: number;
  /** Envelope release seconds. Default `0.3`. */
  release?: number;
  /** FeedbackDelay wet amount, 0..1. Default `0.3`. */
  delayWet?: number;
  /** Reverb wet amount, 0..1. Default `0.4`. */
  reverbWet?: number;
  /** Master volume as linear gain 0..1 (converted to dB). Default `0.7`. */
  volume?: number;
  /** Transport tempo in BPM. Default `120`. */
  bpm?: number;
  /** Per-voice dB trim applied to the PolySynth. Default `-8`. */
  voiceDb?: number;
  /** Reverb decay in seconds. Default `2.5`. */
  reverbDecay?: number;
  /** FeedbackDelay delayTime (Tone subdivision or seconds). Default `'8n'`. */
  delayTime?: string | number;
  /** FeedbackDelay feedback coefficient, 0..1. Default `0.3`. */
  delayFeedback?: number;
  /**
   * Default duration for `playNote` / `playChord` when the caller doesn't
   * pass one. Any Tone.js time token (`'16n'`, `'8n'`, `'1s'`...). Default
   * `'16n'`.
   */
  defaultDuration?: string;
}

/** Fully-resolved options after defaults are applied. */
type ResolvedOptions = Required<SynthMapperOptions>;

const DEFAULTS: ResolvedOptions = {
  wave: 'triangle',
  attack: 0.02,
  release: 0.3,
  delayWet: 0.3,
  reverbWet: 0.4,
  volume: 0.7,
  bpm: 120,
  voiceDb: -8,
  reverbDecay: 2.5,
  delayTime: '8n',
  delayFeedback: 0.3,
  defaultDuration: '16n',
};

/** Read-only view of current knob positions. */
export interface SynthMapperSnapshot {
  wave: ToneWave;
  attack: number;
  release: number;
  delayWet: number;
  reverbWet: number;
  volume: number;
  bpm: number;
}

/** Clamp a linear gain value into the [0, 1] range. NaN / Infinity → 0. */
function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function assertNonNegative(name: string, v: number): void {
  if (!Number.isFinite(v) || v < 0) {
    throw new RangeError(`${name} must be a finite non-negative number, got ${v}`);
  }
}

export class SynthMapper {
  /** Pure note-name resolver. Owned by the caller; mutate via its API. */
  readonly scaleMapper: ScaleMapper;
  /** Injected Tone.js namespace (or compatible fake). */
  readonly tone: ToneLib;

  /** Polyphonic synth voice — the source end of the chain. */
  readonly polySynth: TonePolySynth;
  /** Master Volume trim. */
  readonly volumeNode: ToneVolume;
  /** FeedbackDelay FX. */
  readonly delay: ToneFeedbackDelay;
  /** Reverb FX — tail of the chain, routed to destination. */
  readonly reverb: ToneReverb;

  private state: ResolvedOptions;
  private started = false;
  private disposed = false;

  constructor(
    scaleMapper: ScaleMapper,
    tone: ToneLib,
    options: SynthMapperOptions = {},
  ) {
    this.scaleMapper = scaleMapper;
    this.tone = tone;
    this.state = { ...DEFAULTS, ...options };

    // Validate user-supplied numeric knobs up-front so the audio graph
    // never lands in a malformed state.
    assertNonNegative('attack', this.state.attack);
    assertNonNegative('release', this.state.release);
    if (!Number.isFinite(this.state.bpm) || this.state.bpm <= 0) {
      throw new RangeError(`bpm must be positive, got ${this.state.bpm}`);
    }
    this.state.delayWet = clamp01(this.state.delayWet);
    this.state.reverbWet = clamp01(this.state.reverbWet);
    this.state.volume = clamp01(this.state.volume);
    this.state.delayFeedback = clamp01(this.state.delayFeedback);

    // Build chain tail-first so every `.connect()` has a live destination.
    this.reverb = new tone.Reverb({
      decay: this.state.reverbDecay,
      wet: this.state.reverbWet,
    });
    this.reverb.toDestination();

    this.delay = new tone.FeedbackDelay({
      delayTime: this.state.delayTime,
      feedback: this.state.delayFeedback,
      wet: this.state.delayWet,
    });
    this.delay.connect(this.reverb);

    this.volumeNode = new tone.Volume(tone.gainToDb(this.state.volume));
    this.volumeNode.connect(this.delay);

    this.polySynth = new tone.PolySynth(tone.Synth, {
      oscillator: { type: this.state.wave },
      envelope: {
        attack: this.state.attack,
        decay: 0.2,
        sustain: 0.3,
        release: this.state.release,
      },
      volume: this.state.voiceDb,
    });
    this.polySynth.connect(this.volumeNode);

    tone.Transport.bpm.value = this.state.bpm;
  }

  /**
   * Resume the AudioContext. Browsers require a user-gesture-triggered call
   * before any sound plays. Idempotent.
   */
  async start(): Promise<void> {
    if (this.started || this.disposed) return;
    await this.tone.start();
    this.started = true;
  }

  /** True once `start()` has resolved. */
  get isStarted(): boolean {
    return this.started;
  }

  /** True once `dispose()` has been called. */
  get isDisposed(): boolean {
    return this.disposed;
  }

  /**
   * Play a single scale-degree index. The ScaleMapper resolves the index to
   * a concrete note (e.g. `5` → `'A3'`); the PolySynth triggers an
   * attack/release over `duration`.
   */
  playNote(index: number, duration?: string, velocity?: number): void {
    if (this.disposed) return;
    const note = this.scaleMapper.noteAt(index);
    this.polySynth.triggerAttackRelease(
      note,
      duration ?? this.state.defaultDuration,
      undefined,
      velocity,
    );
  }

  /**
   * Play several scale-degree indices simultaneously. An empty index list is
   * a no-op; otherwise every index is resolved through the ScaleMapper and
   * all notes strike together.
   */
  playChord(indices: number[], duration?: string, velocity?: number): void {
    if (this.disposed) return;
    if (indices.length === 0) return;
    const notes = indices.map((i) => this.scaleMapper.noteAt(i));
    this.polySynth.triggerAttackRelease(
      notes,
      duration ?? this.state.defaultDuration,
      undefined,
      velocity,
    );
  }

  /** Swap the oscillator waveform (propagates via `synth.set`). */
  setWave(wave: ToneWave): void {
    this.state.wave = wave;
    this.polySynth.set({ oscillator: { type: wave } });
  }

  /** Update the envelope attack in seconds. */
  setAttack(attack: number): void {
    assertNonNegative('attack', attack);
    this.state.attack = attack;
    this.polySynth.set({ envelope: { attack } });
  }

  /** Update the envelope release in seconds. */
  setRelease(release: number): void {
    assertNonNegative('release', release);
    this.state.release = release;
    this.polySynth.set({ envelope: { release } });
  }

  /** Set the FeedbackDelay wet amount (auto-clamped into [0, 1]). */
  setDelayWet(wet: number): void {
    const v = clamp01(wet);
    this.state.delayWet = v;
    this.delay.wet.value = v;
  }

  /** Set the Reverb wet amount (auto-clamped into [0, 1]). */
  setReverbWet(wet: number): void {
    const v = clamp01(wet);
    this.state.reverbWet = v;
    this.reverb.wet.value = v;
  }

  /**
   * Set the master volume as linear gain (auto-clamped to [0, 1]); the
   * SynthMapper converts to dB internally before writing to the Volume node.
   */
  setVolume(volume: number): void {
    const v = clamp01(volume);
    this.state.volume = v;
    this.volumeNode.volume.value = this.tone.gainToDb(v);
  }

  /** Update the global Tone.Transport BPM. */
  setBpm(bpm: number): void {
    if (!Number.isFinite(bpm) || bpm <= 0) {
      throw new RangeError(`bpm must be positive, got ${bpm}`);
    }
    this.state.bpm = bpm;
    this.tone.Transport.bpm.value = bpm;
  }

  /** Release every active voice and dispose the chain. Idempotent. */
  dispose(): void {
    if (this.disposed) return;
    try {
      this.polySynth.releaseAll();
    } catch {
      // releaseAll is best-effort; never let cleanup errors escape dispose.
    }
    this.polySynth.dispose();
    this.volumeNode.dispose();
    this.delay.dispose();
    this.reverb.dispose();
    this.disposed = true;
  }

  /** Immutable snapshot of the externally-visible knob values. */
  snapshot(): SynthMapperSnapshot {
    return {
      wave: this.state.wave,
      attack: this.state.attack,
      release: this.state.release,
      delayWet: this.state.delayWet,
      reverbWet: this.state.reverbWet,
      volume: this.state.volume,
      bpm: this.state.bpm,
    };
  }
}
