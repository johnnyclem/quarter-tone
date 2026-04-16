import { describe, expect, it } from 'vitest';
import { ScaleMapper } from '@quarter-tone/core';
import { SynthMapper } from '../src/synth-mapper.js';
import { makeFakeTone, type FakeEvent } from './fake-tone.js';

type EventOf<K extends FakeEvent['kind']> = Extract<FakeEvent, { kind: K }>;
const isKind = <K extends FakeEvent['kind']>(k: K) =>
  (e: FakeEvent): e is EventOf<K> => e.kind === k;

function makeSubject(opts: {
  mapper?: ScaleMapper;
  options?: ConstructorParameters<typeof SynthMapper>[2];
} = {}) {
  const tone = makeFakeTone();
  const mapper = opts.mapper ?? new ScaleMapper({ key: 0, scale: 'Major', octave: 4 });
  const synth = new SynthMapper(mapper, tone, opts.options);
  return { tone, mapper, synth };
}

/* ------------------------------------------------------------------ */
/* Construction + signal chain                                         */
/* ------------------------------------------------------------------ */

describe('SynthMapper — signal chain', () => {
  it('builds PolySynth → Volume → FeedbackDelay → Reverb → destination in order', () => {
    const { tone } = makeSubject();
    expect(tone.describeChain()).toEqual([
      'Reverb -> destination',
      'FeedbackDelay -> Reverb',
      'Volume -> FeedbackDelay',
      'PolySynth -> Volume',
    ]);
  });

  it('instantiates exactly one node of each required type', () => {
    const { tone } = makeSubject();
    const types = tone.nodes.map((n) => n.type).sort();
    expect(types).toEqual(['FeedbackDelay', 'PolySynth', 'Reverb', 'Volume']);
  });

  it('seeds Reverb/Delay/Volume ctor args from options', () => {
    const { tone } = makeSubject({
      options: {
        reverbDecay: 3.0,
        reverbWet: 0.55,
        delayTime: '4n',
        delayFeedback: 0.42,
        delayWet: 0.25,
        volume: 1,
        voiceDb: -10,
        wave: 'square',
        attack: 0.1,
        release: 0.8,
      },
    });
    const reverbArgs = tone.firstNode('Reverb').ctorArgs.options as Record<string, unknown>;
    expect(reverbArgs).toMatchObject({ decay: 3.0, wet: 0.55 });

    const delayArgs = tone.firstNode('FeedbackDelay').ctorArgs.options as Record<string, unknown>;
    expect(delayArgs).toMatchObject({ delayTime: '4n', feedback: 0.42, wet: 0.25 });

    // Volume ctor takes a dB value derived from gainToDb(volume).
    // gainToDb(1) === 20*log10(1) === 0.
    expect(tone.firstNode('Volume').ctorArgs.db).toBe(0);

    const synthArgs = tone.firstNode('PolySynth').ctorArgs as Record<string, unknown>;
    expect(synthArgs.voice).toEqual({ __tag: 'Tone.Synth' });
    const synthOpts = synthArgs.options as Record<string, unknown>;
    expect(synthOpts).toMatchObject({
      oscillator: { type: 'square' },
      envelope: { attack: 0.1, decay: 0.2, sustain: 0.3, release: 0.8 },
      volume: -10,
    });
  });

  it('applies defaults when no options are passed', () => {
    const { synth } = makeSubject();
    expect(synth.snapshot()).toEqual({
      wave: 'triangle',
      attack: 0.02,
      release: 0.3,
      delayWet: 0.3,
      reverbWet: 0.4,
      volume: 0.7,
      bpm: 120,
    });
  });

  it('writes initial BPM to Tone.Transport.bpm', () => {
    const { tone } = makeSubject({ options: { bpm: 140 } });
    const bpmEvents = tone.events.filter((e) => e.kind === 'transportBpm');
    expect(bpmEvents).toHaveLength(1);
    expect(bpmEvents[0]).toMatchObject({ value: 140 });
  });
});

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

describe('SynthMapper — construction validation', () => {
  it('rejects negative attack', () => {
    expect(() => makeSubject({ options: { attack: -0.01 } })).toThrow(/attack/);
  });
  it('rejects non-finite release', () => {
    expect(() => makeSubject({ options: { release: Number.NaN } })).toThrow(/release/);
  });
  it('rejects zero/negative bpm', () => {
    expect(() => makeSubject({ options: { bpm: 0 } })).toThrow(/bpm/);
    expect(() => makeSubject({ options: { bpm: -10 } })).toThrow(/bpm/);
    expect(() => makeSubject({ options: { bpm: Number.POSITIVE_INFINITY } })).toThrow(/bpm/);
  });

  it('clamps delayWet/reverbWet/volume/delayFeedback into [0,1]', () => {
    const { synth, tone } = makeSubject({
      options: {
        delayWet: 2,
        reverbWet: -1,
        volume: 5,
        delayFeedback: -0.5,
      },
    });
    expect(synth.snapshot().delayWet).toBe(1);
    expect(synth.snapshot().reverbWet).toBe(0);
    expect(synth.snapshot().volume).toBe(1);
    const delay = tone.firstNode('FeedbackDelay').ctorArgs.options as Record<string, unknown>;
    expect(delay.feedback).toBe(0);
  });
});

/* ------------------------------------------------------------------ */
/* Playback                                                            */
/* ------------------------------------------------------------------ */

describe('SynthMapper — playNote / playChord', () => {
  it('resolves the index through the ScaleMapper', () => {
    const mapper = new ScaleMapper({ key: 0, scale: 'Major', octave: 4 });
    const expected = mapper.noteAt(3);
    const { synth, tone } = makeSubject({ mapper });
    synth.playNote(3);
    const ev = tone.events.filter((e) => e.kind === 'triggerAttackRelease');
    expect(ev).toHaveLength(1);
    expect(ev[0]).toMatchObject({ note: expected, duration: '16n' });
  });

  it('accepts a custom duration + velocity', () => {
    const { synth, tone } = makeSubject();
    synth.playNote(0, '8n', 0.4);
    const ev = tone.events.find((e) => e.kind === 'triggerAttackRelease');
    expect(ev).toMatchObject({ duration: '8n', velocity: 0.4 });
  });

  it('wraps out-of-range indices via ScaleMapper.noteAt', () => {
    const mapper = new ScaleMapper({ key: 0, scale: 'Major', octave: 4 });
    const { synth, tone } = makeSubject({ mapper });
    synth.playNote(999);
    const ev = tone.events.find((e) => e.kind === 'triggerAttackRelease');
    // noteAt wraps |999| % pool-size; the only requirement is that it's a
    // valid scale note string like 'C4'.
    expect(typeof ev?.note).toBe('string');
    expect(ev?.note).toMatch(/^[A-G]#?\d$/);
  });

  it('playChord triggers all notes simultaneously', () => {
    const mapper = new ScaleMapper({ key: 0, scale: 'Major', octave: 4 });
    const { synth, tone } = makeSubject({ mapper });
    synth.playChord([0, 2, 4]);
    const ev = tone.events.find((e) => e.kind === 'triggerAttackRelease');
    expect(Array.isArray(ev?.note)).toBe(true);
    expect(ev?.note).toEqual([mapper.noteAt(0), mapper.noteAt(2), mapper.noteAt(4)]);
  });

  it('playChord with an empty list is a silent no-op', () => {
    const { synth, tone } = makeSubject();
    synth.playChord([]);
    expect(tone.events.some((e) => e.kind === 'triggerAttackRelease')).toBe(false);
  });

  it('respects custom default duration via options', () => {
    const { synth, tone } = makeSubject({ options: { defaultDuration: '4n' } });
    synth.playNote(0);
    synth.playChord([0, 2]);
    const evs = tone.events.filter((e) => e.kind === 'triggerAttackRelease');
    expect(evs).toHaveLength(2);
    for (const e of evs) expect(e.duration).toBe('4n');
  });
});

/* ------------------------------------------------------------------ */
/* Setters                                                             */
/* ------------------------------------------------------------------ */

describe('SynthMapper — setters', () => {
  it('setWave updates snapshot and forwards to synth.set', () => {
    const { synth, tone } = makeSubject();
    synth.setWave('sawtooth');
    expect(synth.snapshot().wave).toBe('sawtooth');
    const setEv = tone.events.filter((e) => e.kind === 'set').pop();
    expect(setEv).toMatchObject({ partial: { oscillator: { type: 'sawtooth' } } });
  });

  it('setAttack / setRelease push envelope updates', () => {
    const { synth, tone } = makeSubject();
    synth.setAttack(0.15);
    synth.setRelease(0.9);
    expect(synth.snapshot().attack).toBe(0.15);
    expect(synth.snapshot().release).toBe(0.9);
    const envs = tone.events.filter((e) => e.kind === 'set');
    expect(envs.some((e) => JSON.stringify(e.partial).includes('"attack":0.15'))).toBe(true);
    expect(envs.some((e) => JSON.stringify(e.partial).includes('"release":0.9'))).toBe(true);
  });

  it('setAttack rejects invalid values', () => {
    const { synth } = makeSubject();
    expect(() => synth.setAttack(-1)).toThrow();
    expect(() => synth.setAttack(Number.NaN)).toThrow();
  });

  it('setRelease rejects invalid values', () => {
    const { synth } = makeSubject();
    expect(() => synth.setRelease(-1)).toThrow();
    expect(() => synth.setRelease(Number.POSITIVE_INFINITY)).toThrow();
  });

  it('setDelayWet clamps + writes to Delay.wet.value', () => {
    const { synth, tone } = makeSubject();
    synth.setDelayWet(0.42);
    synth.setDelayWet(2); // clamped to 1
    expect(synth.snapshot().delayWet).toBe(1);
    const wet = tone.events.filter((e) => e.kind === 'wetSet' && e.node === 'FeedbackDelay');
    expect(wet.length).toBeGreaterThanOrEqual(2);
    expect(wet[wet.length - 1]).toMatchObject({ value: 1 });
  });

  it('setReverbWet clamps + writes to Reverb.wet.value', () => {
    const { synth, tone } = makeSubject();
    synth.setReverbWet(-0.5); // clamped to 0
    expect(synth.snapshot().reverbWet).toBe(0);
    const wet = tone.events.filter((e) => e.kind === 'wetSet' && e.node === 'Reverb');
    expect(wet[wet.length - 1]).toMatchObject({ value: 0 });
  });

  it('setVolume converts linear → dB and writes to Volume.volume', () => {
    const { synth, tone } = makeSubject();
    synth.setVolume(0.5);
    // 20*log10(0.5) ≈ -6.02
    const vol = tone.events.filter(isKind('volumeSet')).filter((e) => e.node === 'Volume');
    expect(vol.length).toBeGreaterThan(0);
    const last = vol[vol.length - 1];
    expect(last.value).toBeCloseTo(20 * Math.log10(0.5), 5);
    expect(synth.snapshot().volume).toBe(0.5);
  });

  it('setVolume(0) produces -Infinity dB', () => {
    const { synth, tone } = makeSubject();
    synth.setVolume(0);
    const vol = tone.events.filter(isKind('volumeSet')).pop();
    expect(vol?.value).toBe(-Infinity);
  });

  it('setVolume clamps non-finite to 0 (silence)', () => {
    const { synth } = makeSubject();
    synth.setVolume(Number.NaN);
    expect(synth.snapshot().volume).toBe(0);
  });

  it('setBpm writes Tone.Transport.bpm', () => {
    const { synth, tone } = makeSubject();
    synth.setBpm(96);
    const bpms = tone.events.filter((e) => e.kind === 'transportBpm');
    // One initial write during ctor + one here.
    expect(bpms[bpms.length - 1]).toMatchObject({ value: 96 });
    expect(synth.snapshot().bpm).toBe(96);
  });

  it('setBpm rejects invalid values', () => {
    const { synth } = makeSubject();
    expect(() => synth.setBpm(0)).toThrow();
    expect(() => synth.setBpm(-5)).toThrow();
    expect(() => synth.setBpm(Number.NaN)).toThrow();
  });
});

/* ------------------------------------------------------------------ */
/* start / dispose lifecycle                                           */
/* ------------------------------------------------------------------ */

describe('SynthMapper — lifecycle', () => {
  it('start() calls Tone.start once (idempotent)', async () => {
    const { synth, tone } = makeSubject();
    expect(synth.isStarted).toBe(false);
    await synth.start();
    await synth.start();
    await synth.start();
    expect(synth.isStarted).toBe(true);
    expect(tone.events.filter((e) => e.kind === 'startCalled')).toHaveLength(1);
  });

  it('dispose() releases voices + disposes every node', () => {
    const { synth, tone } = makeSubject();
    synth.dispose();
    expect(synth.isDisposed).toBe(true);
    expect(tone.events.filter((e) => e.kind === 'releaseAll')).toHaveLength(1);
    const disposes = tone.events.filter((e) => e.kind === 'dispose').map((e) => e.node);
    expect(disposes).toEqual(['PolySynth', 'Volume', 'FeedbackDelay', 'Reverb']);
  });

  it('dispose() is idempotent', () => {
    const { synth, tone } = makeSubject();
    synth.dispose();
    synth.dispose();
    synth.dispose();
    expect(tone.events.filter((e) => e.kind === 'releaseAll')).toHaveLength(1);
  });

  it('playNote / playChord are no-ops after dispose', () => {
    const { synth, tone } = makeSubject();
    synth.dispose();
    synth.playNote(5);
    synth.playChord([0, 2]);
    expect(tone.events.some((e) => e.kind === 'triggerAttackRelease')).toBe(false);
  });

  it('start() after dispose stays a no-op', async () => {
    const { synth, tone } = makeSubject();
    synth.dispose();
    await synth.start();
    expect(tone.events.some((e) => e.kind === 'startCalled')).toBe(false);
    expect(synth.isStarted).toBe(false);
  });

  it('releaseAll swallowed errors do not leak out of dispose', () => {
    const { synth } = makeSubject();
    // Force polySynth.releaseAll to throw — dispose must still complete.
    (synth.polySynth as unknown as { releaseAll: () => void }).releaseAll = () => {
      throw new Error('boom');
    };
    expect(() => synth.dispose()).not.toThrow();
    expect(synth.isDisposed).toBe(true);
  });
});

/* ------------------------------------------------------------------ */
/* Integration with ScaleMapper                                        */
/* ------------------------------------------------------------------ */

describe('SynthMapper — ScaleMapper integration', () => {
  it('re-reads the ScaleMapper on every note so cycles/key changes propagate', () => {
    const mapper = new ScaleMapper({ key: 0, scale: 'Major', octave: 4 });
    const { synth, tone } = makeSubject({ mapper });

    synth.playNote(0);
    const before = tone.events.find((e) => e.kind === 'triggerAttackRelease');
    mapper.cycleKey(); // C -> C#
    synth.playNote(0);
    const after = tone.events.filter((e) => e.kind === 'triggerAttackRelease')[1];

    expect(before?.note).not.toBe(after?.note);
  });

  it('exposes the backing ScaleMapper for external mutation', () => {
    const mapper = new ScaleMapper({ key: 0, scale: 'Minor' });
    const { synth } = makeSubject({ mapper });
    expect(synth.scaleMapper).toBe(mapper);
  });
});
