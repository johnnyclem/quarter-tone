import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ARPS,
  ATTACKS,
  KEYS,
  MAX_OCTAVE,
  MIN_OCTAVE,
  RELEASES,
  SCALES,
  WAVES,
  type ScaleName,
} from '../src/scale-mapper.js';
import {
  DEFAULT_SYNTH_STATE,
  MAX_BPM,
  MIN_BPM,
  createSynthStore,
  selectArp,
  selectAttack,
  selectKeyName,
  selectRelease,
  selectWave,
  synthStore,
} from '../src/synth-store.js';
import { makeDeterministicRng } from './harness.js';

describe('createSynthStore — defaults', () => {
  it('seeds every field from DEFAULT_SYNTH_STATE', () => {
    const store = createSynthStore();
    const s = store.getState();
    expect(s.key).toBe(DEFAULT_SYNTH_STATE.key);
    expect(s.scale).toBe(DEFAULT_SYNTH_STATE.scale);
    expect(s.waveIdx).toBe(DEFAULT_SYNTH_STATE.waveIdx);
    expect(s.arpIdx).toBe(DEFAULT_SYNTH_STATE.arpIdx);
    expect(s.octave).toBe(DEFAULT_SYNTH_STATE.octave);
    expect(s.attackIdx).toBe(DEFAULT_SYNTH_STATE.attackIdx);
    expect(s.releaseIdx).toBe(DEFAULT_SYNTH_STATE.releaseIdx);
    expect(s.delayWet).toBe(DEFAULT_SYNTH_STATE.delayWet);
    expect(s.reverbWet).toBe(DEFAULT_SYNTH_STATE.reverbWet);
    expect(s.volume).toBe(DEFAULT_SYNTH_STATE.volume);
    expect(s.bpm).toBe(DEFAULT_SYNTH_STATE.bpm);
    expect(s.drawerOpen).toBe(false);
  });

  it('accepts a partial initial override and normalises key into [0,12)', () => {
    const s = createSynthStore({ key: -1, bpm: 140 }).getState();
    expect(s.key).toBe(11);
    expect(s.bpm).toBe(140);
  });

  it('clamps slider overrides into [0,1] and bpm into range', () => {
    const s = createSynthStore({
      delayWet: -5,
      reverbWet: 17,
      volume: Number.NaN,
      bpm: 10_000,
    }).getState();
    expect(s.delayWet).toBe(0);
    expect(s.reverbWet).toBe(1);
    expect(s.volume).toBe(0);
    expect(s.bpm).toBe(MAX_BPM);
  });

  it('wraps discrete-index overrides and clamps octave', () => {
    const s = createSynthStore({
      waveIdx: WAVES.length + 2,
      arpIdx: -1,
      attackIdx: ATTACKS.length * 3,
      releaseIdx: -2,
      octave: 99,
    }).getState();
    expect(s.waveIdx).toBe(2);
    expect(s.arpIdx).toBe(ARPS.length - 1);
    expect(s.attackIdx).toBe(0);
    expect(s.releaseIdx).toBe(RELEASES.length - 2);
    expect(s.octave).toBe(MAX_OCTAVE);
  });

  it('rejects unknown scales in the seed', () => {
    expect(() => createSynthStore({ scale: 'Klingon' as unknown as ScaleName })).toThrow(
      /Unknown scale/,
    );
  });
});

describe('knob cycles', () => {
  it('cycleKey walks through all 12 keys and wraps back to C', () => {
    const store = createSynthStore();
    const seen: string[] = [];
    for (let i = 0; i < 12; i++) {
      store.getState().cycleKey();
      seen.push(selectKeyName(store.getState()));
    }
    expect(seen[0]).toBe('C#');
    expect(seen[11]).toBe('C');
    expect(new Set(seen).size).toBe(12);
  });

  it('cycleScale rotates through every scale in catalogue order', () => {
    const store = createSynthStore();
    const names = Object.keys(SCALES) as ScaleName[];
    const seen: ScaleName[] = [];
    for (let i = 0; i < names.length; i++) {
      store.getState().cycleScale();
      seen.push(store.getState().scale);
    }
    expect(seen[seen.length - 1]).toBe('Major');
    expect(new Set(seen).size).toBe(names.length);
  });

  it('cycleWave walks the WAVES catalogue', () => {
    const store = createSynthStore();
    for (let i = 1; i <= WAVES.length; i++) {
      store.getState().cycleWave();
      expect(selectWave(store.getState())).toBe(WAVES[i % WAVES.length]);
    }
  });

  it('cycleArp walks the ARPS catalogue', () => {
    const store = createSynthStore();
    for (let i = 1; i <= ARPS.length; i++) {
      store.getState().cycleArp();
      expect(selectArp(store.getState())).toBe(ARPS[i % ARPS.length]);
    }
  });

  it('cycleOctave increments and wraps MAX → MIN', () => {
    const store = createSynthStore({ octave: MAX_OCTAVE - 1 });
    store.getState().cycleOctave();
    expect(store.getState().octave).toBe(MAX_OCTAVE);
    store.getState().cycleOctave();
    expect(store.getState().octave).toBe(MIN_OCTAVE);
  });

  it('cycleAttack / cycleRelease walk their preset arrays', () => {
    const store = createSynthStore({ attackIdx: 0, releaseIdx: 0 });
    for (let i = 1; i <= ATTACKS.length; i++) {
      store.getState().cycleAttack();
      expect(selectAttack(store.getState())).toBe(ATTACKS[i % ATTACKS.length]);
    }
    for (let i = 1; i <= RELEASES.length; i++) {
      store.getState().cycleRelease();
      expect(selectRelease(store.getState())).toBe(RELEASES[i % RELEASES.length]);
    }
  });
});

describe('slider setters', () => {
  let store = createSynthStore();
  beforeEach(() => {
    store = createSynthStore();
  });

  it('setDelay / setReverb / setVolume clamp into [0,1]', () => {
    store.getState().setDelay(-1);
    store.getState().setReverb(5);
    store.getState().setVolume(0.42);
    const s = store.getState();
    expect(s.delayWet).toBe(0);
    expect(s.reverbWet).toBe(1);
    expect(s.volume).toBe(0.42);
  });

  it('setDelay treats non-finite input as 0', () => {
    store.getState().setDelay(Number.NaN);
    expect(store.getState().delayWet).toBe(0);
  });

  it('setBpm clamps to [MIN_BPM, MAX_BPM] and rounds', () => {
    store.getState().setBpm(10);
    expect(store.getState().bpm).toBe(MIN_BPM);
    store.getState().setBpm(9999);
    expect(store.getState().bpm).toBe(MAX_BPM);
    store.getState().setBpm(128.7);
    expect(store.getState().bpm).toBe(129);
  });

  it('setBpm falls back to default on non-finite input', () => {
    store.getState().setBpm(Number.NaN);
    expect(store.getState().bpm).toBe(DEFAULT_SYNTH_STATE.bpm);
  });
});

describe('randomize', () => {
  it('produces values in valid ranges with a deterministic rng', () => {
    const store = createSynthStore();
    const rng = makeDeterministicRng(7);
    for (let i = 0; i < 50; i++) {
      store.getState().randomize(rng);
      const s = store.getState();
      expect(s.key).toBeGreaterThanOrEqual(0);
      expect(s.key).toBeLessThan(12);
      expect(Object.keys(SCALES)).toContain(s.scale);
      expect(s.waveIdx).toBeGreaterThanOrEqual(0);
      expect(s.waveIdx).toBeLessThan(WAVES.length);
      expect(s.arpIdx).toBeGreaterThanOrEqual(0);
      expect(s.arpIdx).toBeLessThan(ARPS.length);
      expect(s.octave).toBeGreaterThanOrEqual(MIN_OCTAVE);
      expect(s.octave).toBeLessThanOrEqual(MIN_OCTAVE + 3);
    }
  });

  it('leaves mix sliders and drawer untouched', () => {
    const store = createSynthStore();
    const before = store.getState();
    store.getState().randomize(makeDeterministicRng(1));
    const after = store.getState();
    expect(after.delayWet).toBe(before.delayWet);
    expect(after.reverbWet).toBe(before.reverbWet);
    expect(after.volume).toBe(before.volume);
    expect(after.bpm).toBe(before.bpm);
    expect(after.drawerOpen).toBe(before.drawerOpen);
  });

  it('defaults to Math.random when no rng passed', () => {
    const store = createSynthStore();
    store.getState().randomize();
    const s = store.getState();
    expect(typeof s.key).toBe('number');
    expect(Object.keys(SCALES)).toContain(s.scale);
  });
});

describe('drawer open/close', () => {
  it('openDrawer / closeDrawer set the flag explicitly', () => {
    const store = createSynthStore();
    expect(store.getState().drawerOpen).toBe(false);
    store.getState().openDrawer();
    expect(store.getState().drawerOpen).toBe(true);
    // Idempotent.
    store.getState().openDrawer();
    expect(store.getState().drawerOpen).toBe(true);
    store.getState().closeDrawer();
    expect(store.getState().drawerOpen).toBe(false);
  });

  it('toggleDrawer flips the flag each call', () => {
    const store = createSynthStore();
    store.getState().toggleDrawer();
    expect(store.getState().drawerOpen).toBe(true);
    store.getState().toggleDrawer();
    expect(store.getState().drawerOpen).toBe(false);
  });
});

describe('subscribe + reset', () => {
  it('subscribe fires listeners on any change', () => {
    const store = createSynthStore();
    const spy = vi.fn();
    const unsub = store.subscribe(spy);
    store.getState().cycleKey();
    store.getState().setDelay(0.5);
    unsub();
    store.getState().cycleKey(); // should NOT fire after unsub
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('reset restores every field to DEFAULT_SYNTH_STATE', () => {
    const store = createSynthStore();
    const a = store.getState();
    a.cycleKey();
    a.cycleScale();
    a.setDelay(0.9);
    a.setBpm(180);
    a.openDrawer();
    expect(store.getState().drawerOpen).toBe(true);
    expect(store.getState().bpm).toBe(180);
    store.getState().reset();
    const s = store.getState();
    expect(s.key).toBe(DEFAULT_SYNTH_STATE.key);
    expect(s.scale).toBe(DEFAULT_SYNTH_STATE.scale);
    expect(s.delayWet).toBe(DEFAULT_SYNTH_STATE.delayWet);
    expect(s.bpm).toBe(DEFAULT_SYNTH_STATE.bpm);
    expect(s.drawerOpen).toBe(false);
  });
});

describe('module singleton synthStore', () => {
  it('is a usable store with all actions', () => {
    // Reset first in case another test mutated the singleton earlier.
    synthStore.getState().reset();
    expect(synthStore.getState().key).toBe(0);
    synthStore.getState().cycleKey();
    expect(synthStore.getState().key).toBe(1);
    synthStore.getState().reset();
  });
});

describe('selectors', () => {
  it('map state to display-friendly values', () => {
    const store = createSynthStore({
      key: 3,
      waveIdx: 2,
      arpIdx: 1,
      attackIdx: 4,
      releaseIdx: 5,
    });
    const s = store.getState();
    expect(selectKeyName(s)).toBe(KEYS[3]);
    expect(selectWave(s)).toBe(WAVES[2]);
    expect(selectArp(s)).toBe(ARPS[1]);
    expect(selectAttack(s)).toBe(ATTACKS[4]);
    expect(selectRelease(s)).toBe(RELEASES[5]);
  });
});
