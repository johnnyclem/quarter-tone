/**
 * ScaleMapper — pure function module for mapping sequencer steps to musical notes.
 *
 * Exposes:
 *   KEYS        — 12 chromatic note names
 *   SCALES      — 7 scale-interval presets
 *   ARP_MODES   — 4 arpeggiator traversal modes
 *   normalizeKey(key)                             → index 0..11
 *   getScaleNotes(key, scale, octave, octaveRange)→ array of "C4"-style notes
 *   arpIndex(step, length, mode, rng)             → index into note array
 *   mapStep(step, config, rng)                    → note string for a step
 *
 * All functions are pure: they take explicit inputs (including an injectable
 * `rng` for the Random arp mode) and return new values without side effects.
 */

const KEYS = Object.freeze([
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
]);

const SCALES = Object.freeze({
  Major:    Object.freeze([0, 2, 4, 5, 7, 9, 11]),
  Minor:    Object.freeze([0, 2, 3, 5, 7, 8, 10]),
  Penta:    Object.freeze([0, 2, 4, 7, 9]),
  Blues:    Object.freeze([0, 3, 5, 6, 7, 10]),
  Dorian:   Object.freeze([0, 2, 3, 5, 7, 9, 10]),
  Mixo:     Object.freeze([0, 2, 4, 5, 7, 9, 10]),
  Phrygian: Object.freeze([0, 1, 3, 5, 7, 8, 10]),
});

const ARP_MODES = Object.freeze(['Up', 'Down', 'Bounce', 'Random']);

/**
 * Normalize a key argument to an integer index 0..11.
 * Accepts a number (0..11) or a string name from KEYS.
 */
function normalizeKey(key) {
  if (typeof key === 'number') {
    if (!Number.isInteger(key) || key < 0 || key > 11) {
      throw new RangeError(`Invalid key index: ${key}`);
    }
    return key;
  }
  if (typeof key === 'string') {
    const idx = KEYS.indexOf(key);
    if (idx < 0) throw new RangeError(`Unknown key name: ${key}`);
    return idx;
  }
  throw new TypeError(`Key must be a number or string, got ${typeof key}`);
}

/**
 * Build an ascending list of scale notes spanning `octaveRange` octaves above
 * and below `octave`. Returns note strings like "C4", "D#5".
 */
function getScaleNotes(key, scale, octave = 4, octaveRange = 1) {
  const keyIndex = normalizeKey(key);
  const intervals = SCALES[scale];
  if (!intervals) throw new RangeError(`Unknown scale: ${scale}`);
  if (!Number.isInteger(octave)) {
    throw new TypeError(`octave must be an integer, got ${octave}`);
  }
  if (!Number.isInteger(octaveRange) || octaveRange < 0) {
    throw new RangeError(`octaveRange must be a non-negative integer, got ${octaveRange}`);
  }

  const notes = [];
  for (let o = octave - octaveRange; o <= octave + octaveRange; o++) {
    for (const iv of intervals) {
      const semitone = keyIndex + iv;
      const noteIndex = ((semitone % 12) + 12) % 12;
      const noteOctave = o + Math.floor(semitone / 12);
      notes.push(KEYS[noteIndex] + noteOctave);
    }
  }
  return notes;
}

/**
 * Map a monotonic `step` counter to an index in a list of `length` notes,
 * according to an arpeggiator `mode`. For the "Random" mode, an `rng`
 * function returning a float in [0, 1) may be supplied for determinism.
 */
function arpIndex(step, length, mode, rng = Math.random) {
  if (!Number.isInteger(length) || length <= 0) {
    throw new RangeError(`length must be a positive integer, got ${length}`);
  }
  if (!Number.isInteger(step)) {
    throw new TypeError(`step must be an integer, got ${step}`);
  }
  if (length === 1) return 0;

  const s = ((step % length) + length) % length; // safe positive for Up
  switch (mode) {
    case 'Up':
      return s;
    case 'Down':
      return length - 1 - s;
    case 'Bounce': {
      const period = 2 * (length - 1);
      const pos = ((step % period) + period) % period;
      return pos < length ? pos : period - pos;
    }
    case 'Random': {
      const r = rng();
      if (typeof r !== 'number' || !(r >= 0 && r < 1)) {
        throw new RangeError(`rng must return a number in [0, 1), got ${r}`);
      }
      return Math.floor(r * length);
    }
    default:
      throw new RangeError(`Unknown arp mode: ${mode}`);
  }
}

/**
 * Map a step to a concrete note string using the given scale/key/octave
 * configuration and arp mode. Convenience composition of the helpers above.
 */
function mapStep(step, config, rng = Math.random) {
  if (!config || typeof config !== 'object') {
    throw new TypeError('config must be an object');
  }
  const {
    key,
    scale,
    octave = 4,
    octaveRange = 1,
    arpMode = 'Up',
  } = config;
  const notes = getScaleNotes(key, scale, octave, octaveRange);
  const idx = arpIndex(step, notes.length, arpMode, rng);
  return notes[idx];
}

module.exports = {
  KEYS,
  SCALES,
  ARP_MODES,
  normalizeKey,
  getScaleNotes,
  arpIndex,
  mapStep,
};
