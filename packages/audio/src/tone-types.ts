/**
 * Minimal Tone.js surface used by @quarter-tone/audio.
 *
 * Declared locally rather than importing `tone` directly so that:
 *   - The package can be consumed without `@types/tone` installed.
 *   - Tests can inject a lightweight fake implementation.
 *   - We depend on a narrow contract instead of Tone's sprawling surface.
 *
 * Satisfied by the real Tone.js namespace at runtime.
 */

/** Oscillator waveforms recognised by Tone.Synth. */
export type ToneWave = 'sine' | 'triangle' | 'square' | 'sawtooth';

/** A Tone.js Signal/Param — what exposes `.value`. */
export interface ToneSignal<T = number> {
  value: T;
}

/** Base node: everything in the audio graph can connect / be disposed. */
export interface ToneNode {
  connect(destination: ToneNode): ToneNode;
  toDestination(): ToneNode;
  dispose(): ToneNode;
}

/** The PolySynth instance created by `new Tone.PolySynth(Tone.Synth, opts)`. */
export interface TonePolySynth extends ToneNode {
  triggerAttackRelease(
    note: string | string[],
    duration: string,
    time?: number,
    velocity?: number,
  ): void;
  set(partial: Record<string, unknown>): void;
  releaseAll(): void;
  volume: ToneSignal;
}

/** Reverb FX node: `wet` crossfades dry↔wet. */
export interface ToneReverb extends ToneNode {
  wet: ToneSignal;
}

/** FeedbackDelay FX node. */
export interface ToneFeedbackDelay extends ToneNode {
  wet: ToneSignal;
  feedback: ToneSignal;
  delayTime: ToneSignal<string | number>;
}

/** Master volume trim. */
export interface ToneVolume extends ToneNode {
  volume: ToneSignal;
  mute: boolean;
}

/** Opaque handle to `Tone.Synth` (passed into PolySynth as the voice ctor). */
export type ToneSynthVoice = unknown;

/**
 * The slice of the `Tone` namespace SynthMapper needs. The real Tone.js module
 * satisfies this shape; tests inject a recording double.
 */
export interface ToneLib {
  start(): Promise<void>;
  Synth: ToneSynthVoice;
  PolySynth: new (
    voice: ToneSynthVoice,
    options?: Record<string, unknown>,
  ) => TonePolySynth;
  Reverb: new (options?: Record<string, unknown>) => ToneReverb;
  FeedbackDelay: new (options?: Record<string, unknown>) => ToneFeedbackDelay;
  Volume: new (db?: number) => ToneVolume;
  gainToDb(gain: number): number;
  Transport: { bpm: ToneSignal };
}
