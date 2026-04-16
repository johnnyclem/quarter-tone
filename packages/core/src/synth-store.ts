/**
 * SynthStore — Zustand vanilla store that owns every control exposed in the
 * arcade cabinet's slide-out synth drawer: TONE knobs (KEY / SCALE / WAVE /
 * ARP), FX knobs (OCTAVE / ATTACK / RELEASE), MIX sliders (DELAY / REVERB /
 * VOLUME / BPM), and the drawer's open/close flag.
 *
 * The store is framework-free (pure `zustand/vanilla`) so the arcade UI, the
 * Tone.js audio engine, and game code can all subscribe to a single source
 * of truth without pulling React into the core package.
 */

import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  ARPS,
  ATTACKS,
  KEYS,
  MAX_OCTAVE,
  MIN_OCTAVE,
  RELEASES,
  SCALES,
  WAVES,
  type Arp,
  type Key,
  type ScaleName,
  type Wave,
} from './scale-mapper.js';

/** Lower bound for the BPM slider (matches the cabinet's range). */
export const MIN_BPM = 60;
/** Upper bound for the BPM slider. */
export const MAX_BPM = 200;

export interface SynthState {
  /** Tonic pitch class index into {@link KEYS} (0..11). */
  key: number;
  /** Active scale name (keyof SCALES). */
  scale: ScaleName;
  /** Oscillator wave index into {@link WAVES}. */
  waveIdx: number;
  /** Arpeggiator pattern index into {@link ARPS}. */
  arpIdx: number;
  /** Centre octave (MIN_OCTAVE..MAX_OCTAVE). */
  octave: number;
  /** Envelope attack index into {@link ATTACKS}. */
  attackIdx: number;
  /** Envelope release index into {@link RELEASES}. */
  releaseIdx: number;
  /** Delay send wet amount (0..1). */
  delayWet: number;
  /** Reverb send wet amount (0..1). */
  reverbWet: number;
  /** Master volume (0..1, linear — convert to dB at the audio boundary). */
  volume: number;
  /** Transport BPM (MIN_BPM..MAX_BPM). */
  bpm: number;
  /** True when the slide-out synth drawer is visible. */
  drawerOpen: boolean;
}

export interface SynthActions {
  /** Advance the KEY knob one semitone (wraps B → C). */
  cycleKey: () => void;
  /** Advance the SCALE knob to the next catalogue entry. */
  cycleScale: () => void;
  /** Advance the WAVE knob to the next oscillator shape. */
  cycleWave: () => void;
  /** Advance the ARP knob to the next arpeggiator pattern. */
  cycleArp: () => void;
  /** Advance the OCTAVE knob, wrapping MAX_OCTAVE → MIN_OCTAVE. */
  cycleOctave: () => void;
  /** Advance the ATTACK knob through the envelope preset list. */
  cycleAttack: () => void;
  /** Advance the RELEASE knob through the envelope preset list. */
  cycleRelease: () => void;
  /** Set DELAY wet from a 0..1 value (clamped). */
  setDelay: (v: number) => void;
  /** Set REVERB wet from a 0..1 value (clamped). */
  setReverb: (v: number) => void;
  /** Set master VOLUME from a 0..1 value (clamped). */
  setVolume: (v: number) => void;
  /** Set BPM (clamped to MIN_BPM..MAX_BPM, coerced to integer). */
  setBpm: (v: number) => void;
  /** Randomise the tone knobs (KEY / SCALE / WAVE / ARP / OCTAVE). */
  randomize: (rng?: () => number) => void;
  /** Force the drawer open. */
  openDrawer: () => void;
  /** Force the drawer closed. */
  closeDrawer: () => void;
  /** Flip the drawer's open/closed flag. */
  toggleDrawer: () => void;
  /** Reset every field back to {@link DEFAULT_SYNTH_STATE}. */
  reset: () => void;
}

export type SynthStoreState = SynthState & SynthActions;
export type SynthStore = StoreApi<SynthStoreState>;

export const DEFAULT_SYNTH_STATE: SynthState = {
  key: 0,
  scale: 'Major',
  waveIdx: 0,
  arpIdx: 0,
  octave: 4,
  attackIdx: 1,
  releaseIdx: 2,
  delayWet: 0.3,
  reverbWet: 0.4,
  volume: 0.7,
  bpm: 120,
  drawerOpen: false,
};

const SCALE_NAMES = Object.keys(SCALES) as ScaleName[];

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function clampBpm(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_SYNTH_STATE.bpm;
  const n = Math.round(v);
  if (n < MIN_BPM) return MIN_BPM;
  if (n > MAX_BPM) return MAX_BPM;
  return n;
}

/**
 * Build a fresh Zustand vanilla store seeded from {@link DEFAULT_SYNTH_STATE}.
 * Tests (and any app code that wants an isolated instance, e.g. for a
 * preview pane) can call this directly instead of importing the module
 * singleton.
 */
export function createSynthStore(
  initial: Partial<SynthState> = {},
): SynthStore {
  const seed: SynthState = { ...DEFAULT_SYNTH_STATE, ...initial };
  // Normalise caller-provided values so invariants hold from tick zero.
  seed.key = ((seed.key % 12) + 12) % 12;
  if (!(seed.scale in SCALES)) {
    throw new Error(`Unknown scale: ${seed.scale}`);
  }
  seed.waveIdx = ((seed.waveIdx % WAVES.length) + WAVES.length) % WAVES.length;
  seed.arpIdx = ((seed.arpIdx % ARPS.length) + ARPS.length) % ARPS.length;
  seed.octave = Math.max(MIN_OCTAVE, Math.min(MAX_OCTAVE, seed.octave | 0));
  seed.attackIdx =
    ((seed.attackIdx % ATTACKS.length) + ATTACKS.length) % ATTACKS.length;
  seed.releaseIdx =
    ((seed.releaseIdx % RELEASES.length) + RELEASES.length) % RELEASES.length;
  seed.delayWet = clamp01(seed.delayWet);
  seed.reverbWet = clamp01(seed.reverbWet);
  seed.volume = clamp01(seed.volume);
  seed.bpm = clampBpm(seed.bpm);

  return createStore<SynthStoreState>((set, get) => ({
    ...seed,

    cycleKey: () => set({ key: (get().key + 1) % 12 }),

    cycleScale: () => {
      const i = (SCALE_NAMES.indexOf(get().scale) + 1) % SCALE_NAMES.length;
      set({ scale: SCALE_NAMES[i] });
    },

    cycleWave: () =>
      set({ waveIdx: (get().waveIdx + 1) % WAVES.length }),

    cycleArp: () => set({ arpIdx: (get().arpIdx + 1) % ARPS.length }),

    cycleOctave: () => {
      const next = get().octave >= MAX_OCTAVE ? MIN_OCTAVE : get().octave + 1;
      set({ octave: next });
    },

    cycleAttack: () =>
      set({ attackIdx: (get().attackIdx + 1) % ATTACKS.length }),

    cycleRelease: () =>
      set({ releaseIdx: (get().releaseIdx + 1) % RELEASES.length }),

    setDelay: (v: number) => set({ delayWet: clamp01(v) }),
    setReverb: (v: number) => set({ reverbWet: clamp01(v) }),
    setVolume: (v: number) => set({ volume: clamp01(v) }),
    setBpm: (v: number) => set({ bpm: clampBpm(v) }),

    randomize: (rng: () => number = Math.random) => {
      set({
        key: Math.floor(rng() * 12),
        scale: SCALE_NAMES[Math.floor(rng() * SCALE_NAMES.length)],
        waveIdx: Math.floor(rng() * WAVES.length),
        arpIdx: Math.floor(rng() * ARPS.length),
        // Matches arcade cabinet randomiser: 2..5 inclusive.
        octave: MIN_OCTAVE + Math.floor(rng() * 4),
      });
    },

    openDrawer: () => set({ drawerOpen: true }),
    closeDrawer: () => set({ drawerOpen: false }),
    toggleDrawer: () => set({ drawerOpen: !get().drawerOpen }),

    reset: () => set({ ...DEFAULT_SYNTH_STATE }),
  }));
}

/**
 * Module-singleton store. Most callers (UI layer, audio layer) should import
 * this directly; use {@link createSynthStore} for isolated instances.
 */
export const synthStore: SynthStore = createSynthStore();

/* ----------------------------------------------------------------------------
 * Selectors — small pure readers that translate indices into display names
 * or typed catalogue entries. Keeping them outside the store keeps the state
 * shape minimal and makes them trivially tree-shakeable.
 * -------------------------------------------------------------------------- */

export function selectKeyName(s: SynthState): Key {
  return KEYS[s.key];
}
export function selectWave(s: SynthState): Wave {
  return WAVES[s.waveIdx];
}
export function selectArp(s: SynthState): Arp {
  return ARPS[s.arpIdx];
}
export function selectAttack(s: SynthState): number {
  return ATTACKS[s.attackIdx];
}
export function selectRelease(s: SynthState): number {
  return RELEASES[s.releaseIdx];
}
