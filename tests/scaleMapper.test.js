'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  KEYS,
  SCALES,
  ARP_MODES,
  normalizeKey,
  getScaleNotes,
  arpIndex,
  mapStep,
} = require('../src/scaleMapper');

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

test('KEYS contains all 12 chromatic pitches in order', () => {
  assert.deepEqual(
    [...KEYS],
    ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  );
  assert.equal(KEYS.length, 12);
  assert.ok(Object.isFrozen(KEYS));
});

test('SCALES exposes exactly the 7 named modes with correct interval sets', () => {
  assert.deepEqual(Object.keys(SCALES).sort(), [
    'Blues', 'Dorian', 'Major', 'Minor', 'Mixo', 'Penta', 'Phrygian',
  ]);
  assert.deepEqual([...SCALES.Major],    [0, 2, 4, 5, 7, 9, 11]);
  assert.deepEqual([...SCALES.Minor],    [0, 2, 3, 5, 7, 8, 10]);
  assert.deepEqual([...SCALES.Penta],    [0, 2, 4, 7, 9]);
  assert.deepEqual([...SCALES.Blues],    [0, 3, 5, 6, 7, 10]);
  assert.deepEqual([...SCALES.Dorian],   [0, 2, 3, 5, 7, 9, 10]);
  assert.deepEqual([...SCALES.Mixo],     [0, 2, 4, 5, 7, 9, 10]);
  assert.deepEqual([...SCALES.Phrygian], [0, 1, 3, 5, 7, 8, 10]);
  assert.ok(Object.isFrozen(SCALES));
  for (const s of Object.values(SCALES)) assert.ok(Object.isFrozen(s));
});

test('ARP_MODES lists the four traversal modes', () => {
  assert.deepEqual([...ARP_MODES], ['Up', 'Down', 'Bounce', 'Random']);
  assert.ok(Object.isFrozen(ARP_MODES));
});

// -----------------------------------------------------------------------------
// normalizeKey
// -----------------------------------------------------------------------------

test('normalizeKey accepts every valid numeric index 0..11', () => {
  for (let i = 0; i < 12; i++) assert.equal(normalizeKey(i), i);
});

test('normalizeKey accepts every valid key name', () => {
  KEYS.forEach((name, i) => assert.equal(normalizeKey(name), i));
});

test('normalizeKey rejects out-of-range numeric indices', () => {
  assert.throws(() => normalizeKey(-1),   RangeError);
  assert.throws(() => normalizeKey(12),   RangeError);
  assert.throws(() => normalizeKey(1.5),  RangeError);
  assert.throws(() => normalizeKey(NaN),  RangeError);
});

test('normalizeKey rejects unknown key names', () => {
  assert.throws(() => normalizeKey('H'),  RangeError);
  assert.throws(() => normalizeKey('Db'), RangeError);
  assert.throws(() => normalizeKey(''),   RangeError);
});

test('normalizeKey rejects non-string/non-number inputs', () => {
  assert.throws(() => normalizeKey(null),       TypeError);
  assert.throws(() => normalizeKey(undefined),  TypeError);
  assert.throws(() => normalizeKey({}),         TypeError);
  assert.throws(() => normalizeKey([]),         TypeError);
  assert.throws(() => normalizeKey(true),       TypeError);
});

// -----------------------------------------------------------------------------
// getScaleNotes
// -----------------------------------------------------------------------------

test('getScaleNotes produces the C Major scale across the default octave range', () => {
  assert.deepEqual(getScaleNotes('C', 'Major', 4, 1), [
    'C3','D3','E3','F3','G3','A3','B3',
    'C4','D4','E4','F4','G4','A4','B4',
    'C5','D5','E5','F5','G5','A5','B5',
  ]);
});

test('getScaleNotes produces A Minor scale', () => {
  assert.deepEqual(getScaleNotes('A', 'Minor', 4, 0), [
    'A4','B4','C5','D5','E5','F5','G5',
  ]);
});

test('getScaleNotes handles octave wraparound for high tonics', () => {
  // F#4 Mixolydian: F#4, G#4, A#4, B4, C#5, D#5, E5
  assert.deepEqual(getScaleNotes('F#', 'Mixo', 4, 0), [
    'F#4','G#4','A#4','B4','C#5','D#5','E5',
  ]);
  // B4 Blues: B4, D5, E5, F5, F#5, A5
  assert.deepEqual(getScaleNotes('B', 'Blues', 4, 0), [
    'B4','D5','E5','F5','F#5','A5',
  ]);
});

test('getScaleNotes respects octaveRange=0 (single octave)', () => {
  const notes = getScaleNotes('C', 'Penta', 3, 0);
  assert.deepEqual(notes, ['C3', 'D3', 'E3', 'G3', 'A3']);
});

test('getScaleNotes octaveRange expands window symmetrically', () => {
  const base = getScaleNotes('C', 'Major', 4, 0);
  const wide = getScaleNotes('C', 'Major', 4, 2);
  assert.equal(base.length, 7);
  assert.equal(wide.length, 7 * 5); // 5 octaves: 2..6
  assert.ok(wide.includes('C2'));
  assert.ok(wide.includes('C6'));
  assert.ok(wide.includes('B6'));
});

test('getScaleNotes covers all 12 keys with Major scale', () => {
  for (const key of KEYS) {
    const notes = getScaleNotes(key, 'Major', 4, 0);
    assert.equal(notes.length, 7);
    // Every note must start with a known key name.
    for (const n of notes) {
      const name = n.replace(/[0-9]+$/, '');
      assert.ok(KEYS.includes(name), `${n} has unknown note name`);
      const octave = Number(n.slice(name.length));
      assert.ok(Number.isInteger(octave), `${n} has non-integer octave`);
    }
  }
});

test('getScaleNotes covers all 7 scales with a fixed key', () => {
  for (const scale of Object.keys(SCALES)) {
    const notes = getScaleNotes('D', scale, 4, 0);
    assert.equal(notes.length, SCALES[scale].length);
    assert.ok(notes[0].startsWith('D')); // tonic first
  }
});

test('getScaleNotes applies default octave=4 and octaveRange=1', () => {
  const defaults = getScaleNotes('C', 'Major');
  const explicit = getScaleNotes('C', 'Major', 4, 1);
  assert.deepEqual(defaults, explicit);
});

test('getScaleNotes rejects unknown scales', () => {
  assert.throws(() => getScaleNotes('C', 'Lydian', 4, 0), RangeError);
  assert.throws(() => getScaleNotes('C', '', 4, 0),       RangeError);
});

test('getScaleNotes rejects invalid octave and octaveRange values', () => {
  assert.throws(() => getScaleNotes('C', 'Major', 4.5, 1), TypeError);
  assert.throws(() => getScaleNotes('C', 'Major', 4, -1),  RangeError);
  assert.throws(() => getScaleNotes('C', 'Major', 4, 1.5), RangeError);
});

// -----------------------------------------------------------------------------
// arpIndex
// -----------------------------------------------------------------------------

test('arpIndex Up walks forward and wraps', () => {
  const xs = Array.from({ length: 10 }, (_, i) => arpIndex(i, 4, 'Up'));
  assert.deepEqual(xs, [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]);
});

test('arpIndex Up handles negative steps', () => {
  assert.equal(arpIndex(-1, 4, 'Up'), 3);
  assert.equal(arpIndex(-4, 4, 'Up'), 0);
});

test('arpIndex Down walks backward and wraps', () => {
  const xs = Array.from({ length: 6 }, (_, i) => arpIndex(i, 4, 'Down'));
  assert.deepEqual(xs, [3, 2, 1, 0, 3, 2]);
});

test('arpIndex Bounce ping-pongs without revisiting endpoints twice', () => {
  // length=4 → period=6: 0,1,2,3,2,1 | 0,1,2,3,2,1 ...
  const xs = Array.from({ length: 12 }, (_, i) => arpIndex(i, 4, 'Bounce'));
  assert.deepEqual(xs, [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1]);
});

test('arpIndex Bounce handles negative steps (symmetric period)', () => {
  // Period=6 for length=4, so step=-1 → pos=5 → 6-5=1
  assert.equal(arpIndex(-1, 4, 'Bounce'), 1);
  assert.equal(arpIndex(-6, 4, 'Bounce'), 0);
});

test('arpIndex Random produces indices within range for the given rng', () => {
  // Deterministic rng sequence.
  const sequence = [0.0, 0.25, 0.5, 0.75, 0.999];
  let i = 0;
  const rng = () => sequence[i++];
  assert.equal(arpIndex(0, 4, 'Random', rng), 0);  // 0.00 * 4 → 0
  assert.equal(arpIndex(1, 4, 'Random', rng), 1);  // 0.25 * 4 → 1
  assert.equal(arpIndex(2, 4, 'Random', rng), 2);  // 0.50 * 4 → 2
  assert.equal(arpIndex(3, 4, 'Random', rng), 3);  // 0.75 * 4 → 3
  assert.equal(arpIndex(4, 4, 'Random', rng), 3);  // 0.999 * 4 → 3
});

test('arpIndex Random uses Math.random by default and stays in range', () => {
  // Sanity: default rng works.
  for (let i = 0; i < 50; i++) {
    const idx = arpIndex(i, 8, 'Random');
    assert.ok(idx >= 0 && idx < 8);
    assert.ok(Number.isInteger(idx));
  }
});

test('arpIndex Random rejects rng outputs outside [0,1)', () => {
  assert.throws(() => arpIndex(0, 4, 'Random', () => 1),    RangeError);
  assert.throws(() => arpIndex(0, 4, 'Random', () => -0.1), RangeError);
  assert.throws(() => arpIndex(0, 4, 'Random', () => NaN),  RangeError);
  assert.throws(() => arpIndex(0, 4, 'Random', () => 'x'),  RangeError);
});

test('arpIndex length=1 always returns 0 for every mode', () => {
  for (const mode of ARP_MODES) {
    for (let i = -3; i < 5; i++) assert.equal(arpIndex(i, 1, mode), 0);
  }
});

test('arpIndex rejects unknown modes', () => {
  assert.throws(() => arpIndex(0, 4, 'Spiral'), RangeError);
});

test('arpIndex rejects invalid length', () => {
  assert.throws(() => arpIndex(0, 0, 'Up'),   RangeError);
  assert.throws(() => arpIndex(0, -3, 'Up'),  RangeError);
  assert.throws(() => arpIndex(0, 2.5, 'Up'), RangeError);
});

test('arpIndex rejects non-integer step', () => {
  assert.throws(() => arpIndex(1.5, 4, 'Up'), TypeError);
  assert.throws(() => arpIndex(NaN, 4, 'Up'), TypeError);
});

// -----------------------------------------------------------------------------
// mapStep
// -----------------------------------------------------------------------------

test('mapStep resolves a step to a concrete note', () => {
  const cfg = { key: 'C', scale: 'Major', octave: 4, octaveRange: 0, arpMode: 'Up' };
  assert.equal(mapStep(0, cfg), 'C4');
  assert.equal(mapStep(6, cfg), 'B4');
  assert.equal(mapStep(7, cfg), 'C4'); // wraps
});

test('mapStep Down and Bounce modes pull from the same note pool', () => {
  const cfg = { key: 'C', scale: 'Major', octave: 4, octaveRange: 0 };
  assert.equal(mapStep(0, { ...cfg, arpMode: 'Down' }),   'B4');
  assert.equal(mapStep(1, { ...cfg, arpMode: 'Down' }),   'A4');
  assert.equal(mapStep(0,  { ...cfg, arpMode: 'Bounce' }), 'C4');
  assert.equal(mapStep(6,  { ...cfg, arpMode: 'Bounce' }), 'B4'); // peak
  assert.equal(mapStep(12, { ...cfg, arpMode: 'Bounce' }), 'C4'); // full cycle
});

test('mapStep Random honours the injected rng', () => {
  const rng = () => 0; // always first note
  const cfg = { key: 'C', scale: 'Major', octave: 4, octaveRange: 0, arpMode: 'Random' };
  assert.equal(mapStep(0, cfg, rng), 'C4');
  assert.equal(mapStep(99, cfg, rng), 'C4');
});

test('mapStep applies defaults for octave, octaveRange, arpMode', () => {
  // Default arpMode=Up, octave=4, octaveRange=1 → 21 notes, step 0 is C3.
  const note = mapStep(0, { key: 'C', scale: 'Major' });
  assert.equal(note, 'C3');
});

test('mapStep rejects non-object config', () => {
  assert.throws(() => mapStep(0, null),      TypeError);
  assert.throws(() => mapStep(0, undefined), TypeError);
  assert.throws(() => mapStep(0, 'nope'),    TypeError);
});

// -----------------------------------------------------------------------------
// Full matrix sanity check: all 12 keys × 7 scales × 4 arp modes produce notes.
// -----------------------------------------------------------------------------

test('every (key × scale × arpMode) combination yields a valid note string', () => {
  const rng = () => 0.5;
  for (let k = 0; k < 12; k++) {
    for (const scale of Object.keys(SCALES)) {
      for (const arpMode of ARP_MODES) {
        const note = mapStep(3, { key: k, scale, arpMode, octave: 4, octaveRange: 1 }, rng);
        assert.match(note, /^[A-G](#)?[0-9]+$/, `bad note ${note} for ${k}/${scale}/${arpMode}`);
      }
    }
  }
});
