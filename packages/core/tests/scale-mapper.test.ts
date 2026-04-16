import { describe, expect, it } from 'vitest';
import {
  ARPS,
  ATTACKS,
  KEYS,
  MAX_OCTAVE,
  MIN_OCTAVE,
  RELEASES,
  SCALES,
  ScaleMapper,
  WAVES,
  randomScaleState,
  type ScaleName,
} from '../src/scale-mapper.js';
import { makeDeterministicRng } from './harness.js';

describe('constants', () => {
  it('KEYS covers all 12 chromatic pitch classes', () => {
    expect(KEYS).toHaveLength(12);
    expect(new Set(KEYS).size).toBe(12);
    expect(KEYS[0]).toBe('C');
    expect(KEYS[11]).toBe('B');
  });

  it('SCALES intervals are sorted and within one octave', () => {
    for (const [name, iv] of Object.entries(SCALES)) {
      expect(iv.length).toBeGreaterThan(0);
      for (let i = 1; i < iv.length; i++) {
        expect(iv[i], `${name}[${i}] should be ascending`).toBeGreaterThan(iv[i - 1]);
      }
      expect(iv[iv.length - 1]).toBeLessThan(12);
      expect(iv[0]).toBe(0);
    }
  });

  it('WAVES / ARPS / ATTACKS / RELEASES have expected catalogue', () => {
    expect(WAVES).toEqual(['triangle', 'sine', 'square', 'sawtooth']);
    expect(ARPS).toEqual(['Up', 'Down', 'Bounce', 'Random']);
    expect(ATTACKS).toEqual([0.005, 0.02, 0.05, 0.1, 0.2]);
    expect(RELEASES).toEqual([0.1, 0.2, 0.3, 0.5, 0.8, 1.2]);
  });

  it('MIN/MAX octave are numeric and ordered', () => {
    expect(MIN_OCTAVE).toBeLessThan(MAX_OCTAVE);
  });
});

describe('ScaleMapper — construction', () => {
  it('uses Major/C/4 by default', () => {
    const m = new ScaleMapper();
    expect(m.snapshot()).toEqual({ key: 0, scale: 'Major', octave: 4 });
  });

  it('accepts a partial override', () => {
    const m = new ScaleMapper({ key: 7, scale: 'Minor' });
    expect(m.snapshot()).toEqual({ key: 7, scale: 'Minor', octave: 4 });
  });

  it('normalises negative/oversized keys into [0,12)', () => {
    expect(new ScaleMapper({ key: -1 }).key).toBe(11);
    expect(new ScaleMapper({ key: 25 }).key).toBe(1);
    expect(new ScaleMapper({ key: 0 }).key).toBe(0);
  });

  it('rejects unknown scales', () => {
    expect(() => new ScaleMapper({ scale: 'Bogus' as unknown as ScaleName })).toThrow(
      /Unknown scale/,
    );
  });
});

describe('ScaleMapper — getNotes', () => {
  it('defaults to 16 notes', () => {
    const notes = new ScaleMapper().getNotes();
    expect(notes).toHaveLength(16);
  });

  it('produces the canonical C major starting run', () => {
    const notes = new ScaleMapper({ key: 0, scale: 'Major', octave: 4 }).getNotes(8);
    expect(notes).toEqual(['C3', 'D3', 'E3', 'F3', 'G3', 'A3', 'B3', 'C4']);
  });

  it('transposes tonic by 7 semitones for key=G', () => {
    const notes = new ScaleMapper({ key: 7, scale: 'Major', octave: 4 }).getNotes(8);
    // G major starts on G3 = (0+7)=7 -> G at octave 3 (lower of 3 octave span)
    expect(notes[0]).toBe('G3');
    expect(notes[1]).toBe('A3');
    expect(notes).toContain('F#4');
  });

  it('handles key wrap into next octave (key=11, interval=11 -> 22 -> A#+1)', () => {
    const notes = new ScaleMapper({ key: 11, scale: 'Major', octave: 4 }).getNotes(16);
    expect(notes[0]).toBe('B3');
    // interval 11 => pitch class (11+11)%12=10=A#; oct +1 due to floor(22/12)=1
    expect(notes).toContain('A#4');
  });

  it('Pentatonic has 5 notes per octave, 15 total across 3 octaves', () => {
    const notes = new ScaleMapper({ scale: 'Penta' }).getNotes(99);
    expect(notes).toHaveLength(15);
  });

  it('returns empty when n <= 0', () => {
    expect(new ScaleMapper().getNotes(0)).toEqual([]);
    expect(new ScaleMapper().getNotes(-5)).toEqual([]);
  });

  it('respects n when smaller than total pool', () => {
    expect(new ScaleMapper().getNotes(3)).toHaveLength(3);
  });
});

describe('ScaleMapper — noteAt', () => {
  it('wraps negative indices via absolute value', () => {
    const m = new ScaleMapper();
    expect(m.noteAt(-1)).toBe(m.noteAt(1));
  });

  it('wraps indices larger than the pool', () => {
    const m = new ScaleMapper();
    const pool = m.getNotes();
    expect(m.noteAt(pool.length)).toBe(pool[0]);
    expect(m.noteAt(pool.length + 3)).toBe(pool[3]);
  });

  it('throws on empty pool', () => {
    const m = new ScaleMapper();
    expect(() => m.noteAt(0, 0)).toThrow(/empty scale pool/);
  });
});

describe('ScaleMapper — cycles', () => {
  it('cycleKey walks through all 12 keys and wraps', () => {
    const m = new ScaleMapper({ key: 0 });
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) seen.push(m.cycleKey());
    expect(seen[0]).toBe('C#');
    expect(seen[11]).toBe('C');
    expect(m.key).toBe(0);
  });

  it('cycleScale rotates through the catalogue and wraps back to start', () => {
    const m = new ScaleMapper({ scale: 'Major' });
    const names = Object.keys(SCALES) as ScaleName[];
    const seen: ScaleName[] = [];
    for (let i = 0; i < names.length; i++) seen.push(m.cycleScale());
    expect(seen[seen.length - 1]).toBe('Major');
    expect(new Set(seen).size).toBe(names.length);
  });

  it('cycleOctave wraps at MAX_OCTAVE back to MIN_OCTAVE', () => {
    const m = new ScaleMapper({ octave: MAX_OCTAVE });
    expect(m.cycleOctave()).toBe(MIN_OCTAVE);
    expect(m.cycleOctave()).toBe(MIN_OCTAVE + 1);
  });

  it('cycleOctave increments normally below MAX', () => {
    const m = new ScaleMapper({ octave: 3 });
    expect(m.cycleOctave()).toBe(4);
    expect(m.cycleOctave()).toBe(5);
  });
});

describe('ScaleMapper — setters', () => {
  it('setKey normalises inputs', () => {
    const m = new ScaleMapper();
    m.setKey(13);
    expect(m.key).toBe(1);
    m.setKey(-3);
    expect(m.key).toBe(9);
  });

  it('setScale accepts known scales and rejects unknown', () => {
    const m = new ScaleMapper();
    m.setScale('Blues');
    expect(m.scale).toBe('Blues');
    expect(() => m.setScale('Klingon' as unknown as ScaleName)).toThrow();
  });

  it('setOctave validates finiteness', () => {
    const m = new ScaleMapper();
    m.setOctave(5);
    expect(m.octave).toBe(5);
    expect(() => m.setOctave(Number.NaN)).toThrow();
    expect(() => m.setOctave(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('getKeyName returns the current key letter', () => {
    const m = new ScaleMapper({ key: 3 });
    expect(m.getKeyName()).toBe('D#');
  });
});

describe('randomScaleState', () => {
  it('produces values in the expected ranges (deterministic seed)', () => {
    const rng = makeDeterministicRng(42);
    for (let i = 0; i < 100; i++) {
      const s = randomScaleState(rng);
      expect(s.key).toBeGreaterThanOrEqual(0);
      expect(s.key).toBeLessThan(12);
      expect(Object.keys(SCALES)).toContain(s.scale);
      expect(s.octave).toBeGreaterThanOrEqual(MIN_OCTAVE);
      expect(s.octave).toBeLessThanOrEqual(MIN_OCTAVE + 3);
    }
  });

  it('uses Math.random when no rng passed', () => {
    const s = randomScaleState();
    expect(typeof s.key).toBe('number');
    expect(typeof s.octave).toBe('number');
  });
});
