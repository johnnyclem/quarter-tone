/**
 * ScaleMapper — the music-theory core of Quarter Tone.
 *
 * Pure, deterministic, audio-engine-free: given a (key, scale, octave)
 * triple it returns an ordered list of note names ("C4", "D#4", ...) that
 * games use to sonify their events.
 */

export const KEYS = [
  'C', 'C#', 'D', 'D#', 'E', 'F',
  'F#', 'G', 'G#', 'A', 'A#', 'B',
] as const;
export type Key = (typeof KEYS)[number];

export const SCALES = {
  Major:    [0, 2, 4, 5, 7, 9, 11],
  Minor:    [0, 2, 3, 5, 7, 8, 10],
  Penta:    [0, 2, 4, 7, 9],
  Blues:    [0, 3, 5, 6, 7, 10],
  Dorian:   [0, 2, 3, 5, 7, 9, 10],
  Mixo:     [0, 2, 4, 5, 7, 9, 10],
  Phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const;
export type ScaleName = keyof typeof SCALES;

export const WAVES = ['triangle', 'sine', 'square', 'sawtooth'] as const;
export type Wave = (typeof WAVES)[number];

export const ARPS = ['Up', 'Down', 'Bounce', 'Random'] as const;
export type Arp = (typeof ARPS)[number];

export const ATTACKS = [0.005, 0.02, 0.05, 0.1, 0.2] as const;
export const RELEASES = [0.1, 0.2, 0.3, 0.5, 0.8, 1.2] as const;

/** Minimum octave the `cycleOctave` helper will wrap to. */
export const MIN_OCTAVE = 2;
/** Maximum octave the `cycleOctave` helper will emit before wrapping. */
export const MAX_OCTAVE = 6;

export interface ScaleMapperState {
  key: number;
  scale: ScaleName;
  octave: number;
}

const DEFAULT_STATE: ScaleMapperState = {
  key: 0,
  scale: 'Major',
  octave: 4,
};

function normKey(k: number): number {
  return ((k % 12) + 12) % 12;
}

export class ScaleMapper {
  key: number;
  scale: ScaleName;
  octave: number;

  constructor(state: Partial<ScaleMapperState> = {}) {
    this.key = normKey(state.key ?? DEFAULT_STATE.key);
    this.scale = state.scale ?? DEFAULT_STATE.scale;
    if (!(this.scale in SCALES)) {
      throw new Error(`Unknown scale: ${this.scale}`);
    }
    this.octave = state.octave ?? DEFAULT_STATE.octave;
  }

  /**
   * Return up to `n` note-name strings spanning three octaves centred on
   * `this.octave`. The sequence begins at the tonic of the lower octave
   * and proceeds by scale degree, preserving the original arcade ordering.
   */
  getNotes(n: number = 16): string[] {
    const intervals = SCALES[this.scale];
    const notes: string[] = [];
    for (let o = this.octave - 1; o <= this.octave + 1; o++) {
      for (const i of intervals) {
        const ni = (this.key + i) % 12;
        const oct = o + Math.floor((this.key + i) / 12);
        notes.push(KEYS[ni] + oct);
      }
    }
    if (n <= 0) return [];
    return notes.slice(0, n);
  }

  /** Map an arbitrary integer index to a note (wraps with abs + modulo). */
  noteAt(index: number, poolSize: number = 16): string {
    const notes = this.getNotes(poolSize);
    if (notes.length === 0) {
      throw new Error('Cannot resolve note from empty scale pool');
    }
    return notes[Math.abs(index | 0) % notes.length];
  }

  /** Transpose the tonic up one semitone (wraps B → C). */
  cycleKey(): Key {
    this.key = (this.key + 1) % 12;
    return KEYS[this.key];
  }

  /** Advance to the next scale in the catalogue. */
  cycleScale(): ScaleName {
    const names = Object.keys(SCALES) as ScaleName[];
    const i = (names.indexOf(this.scale) + 1) % names.length;
    this.scale = names[i];
    return this.scale;
  }

  /**
   * Increment the octave, wrapping back to `MIN_OCTAVE` once it would
   * exceed `MAX_OCTAVE`. Mirrors the arcade cabinet's OCTAVE knob.
   */
  cycleOctave(): number {
    this.octave = this.octave >= MAX_OCTAVE ? MIN_OCTAVE : this.octave + 1;
    return this.octave;
  }

  setKey(k: number): void {
    this.key = normKey(k);
  }

  setScale(s: ScaleName): void {
    if (!(s in SCALES)) throw new Error(`Unknown scale: ${s}`);
    this.scale = s;
  }

  setOctave(o: number): void {
    if (!Number.isFinite(o)) throw new Error('Octave must be finite');
    this.octave = o;
  }

  getKeyName(): Key {
    return KEYS[this.key];
  }

  snapshot(): ScaleMapperState {
    return { key: this.key, scale: this.scale, octave: this.octave };
  }
}

/**
 * Produce a pseudo-random, musically sensible scale state. The generator
 * is injectable so tests can make it deterministic.
 */
export function randomScaleState(
  rng: () => number = Math.random,
): ScaleMapperState {
  const scaleNames = Object.keys(SCALES) as ScaleName[];
  return {
    key: Math.floor(rng() * 12),
    scale: scaleNames[Math.floor(rng() * scaleNames.length)],
    // Matches arcade-cabinet randomiser: 2 + floor(rng()*4) => 2..5.
    octave: MIN_OCTAVE + Math.floor(rng() * 4),
  };
}
