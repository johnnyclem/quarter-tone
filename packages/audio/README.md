# @quarter-tone/audio

Tone.js bridge for the [Quarter Tone](../../README.md) arcade cabinet.

Wraps a polyphonic [`Tone.js`](https://tonejs.github.io/) signal chain and
couples it to the pure [`ScaleMapper`](../core/README.md) from
`@quarter-tone/core`, so games can emit scale-degree **indices** and the
SynthMapper resolves them to concrete notes, triggers the synth, and routes
through FX.

## Signal chain

```
 PolySynth (Tone.Synth voice)
     │
     ▼
 Volume   (master trim, linear → dB)
     │
     ▼
 FeedbackDelay
     │
     ▼
 Reverb
     │
     ▼
 destination (speakers)
```

## Usage

```ts
import * as Tone from 'tone';
import { ScaleMapper } from '@quarter-tone/core';
import { SynthMapper } from '@quarter-tone/audio';

const mapper = new ScaleMapper({ key: 7, scale: 'Minor', octave: 4 });
const synth  = new SynthMapper(mapper, Tone, {
  wave:      'triangle',
  delayWet:  0.3,
  reverbWet: 0.4,
  volume:    0.7,
  bpm:       120,
});

// Unlock the AudioContext on a user gesture before playing:
document.querySelector('#start')?.addEventListener('click', async () => {
  await synth.start();
  synth.playNote(0);          // resolves to scale degree 0 → e.g. 'A3'
  synth.playChord([0, 2, 4]); // triad of the first, third, fifth degree
});

// Later, knob tweaks:
synth.setReverbWet(0.6);
synth.setVolume(0.5);
synth.setWave('square');
synth.setBpm(140);

// On teardown:
synth.dispose();
```

## API

| Member                                 | Description                                     |
| -------------------------------------- | ----------------------------------------------- |
| `new SynthMapper(scale, tone, opts?)`  | Build the chain; accepts an injected Tone lib.  |
| `start()`                              | Resume the AudioContext (idempotent).           |
| `playNote(index, duration?, vel?)`     | Trigger one scale-degree note.                  |
| `playChord(indices, duration?, vel?)`  | Trigger multiple scale-degree notes at once.    |
| `setWave(wave)`                        | `'sine' \| 'triangle' \| 'square' \| 'sawtooth'`|
| `setAttack(sec)` / `setRelease(sec)`   | Envelope shaping.                               |
| `setDelayWet(0..1)` / `setReverbWet(0..1)` | FX send amounts (auto-clamped).             |
| `setVolume(0..1)`                      | Linear master gain (converted to dB).           |
| `setBpm(bpm)`                          | Write `Tone.Transport.bpm`.                     |
| `snapshot()`                           | Read-only view of current knob positions.       |
| `dispose()`                            | Release voices and tear down nodes.             |

## Scripts

| Command                 | Description                         |
| ----------------------- | ----------------------------------- |
| `npm run build`         | Emit ESM + `.d.ts` into `dist/`.    |
| `npm test`              | Run the Vitest suite.               |
| `npm run test:coverage` | Run tests with v8 coverage.         |
| `npm run typecheck`     | `tsc --noEmit`.                     |

The package has a **peer dependency** on `tone@^14 || ^15`; consumers supply
their own Tone.js at runtime. Tests inject a lightweight fake implementation
so coverage runs without a Web Audio API.
