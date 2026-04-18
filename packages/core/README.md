# @quarter-tone/core

Pure-TypeScript core for the [Quarter Tone](../../README.md) arcade cabinet:

- `ScaleMapper` — key / scale / octave → note-name resolver used to sonify
  every game event.
- Twelve arcade game modules (`pong`, `breakout`, `snake`, `invaders`,
  `tetris`, `sequencer`, `kong`, `kongjr`, `ghost`, `galaga`, `frogger`,
  `asteroids`) exposed as dependency-injected factories.

The package has **zero runtime dependencies** and does not touch the DOM,
`Tone.js`, or any audio engine — it is a pure logic core. Consumers wire
audio and rendering through the `GameDeps` interface.

## Usage

```ts
import { ScaleMapper, createPong } from '@quarter-tone/core';

const mapper = new ScaleMapper({ key: 7, scale: 'Minor', octave: 4 });
mapper.getNotes(5); // ['G3', 'A3', 'A#3', 'C4', 'D4']

const game = createPong({
  keys: {},
  playNote: (i) => {
    /* feed synth */
  },
  setScore: (s) => {
    /* update HUD */
  },
  getScore: () => 0,
  getBpm: () => 120,
  width: 480,
  height: 400,
});

game.init();
game.update(); // once per frame
game.draw(ctx); // 2D canvas surface
```

Sub-path imports are available for tree-shaking:

```ts
import { ScaleMapper } from '@quarter-tone/core/scale-mapper';
import { GAME_FACTORIES } from '@quarter-tone/core/games';
```

## Scripts

| Command                 | Description                      |
| ----------------------- | -------------------------------- |
| `npm run build`         | Emit ESM + `.d.ts` into `dist/`. |
| `npm test`              | Run the Vitest suite.            |
| `npm run test:coverage` | Run tests with v8 coverage.      |
| `npm run typecheck`     | `tsc --noEmit`.                  |

## Coverage

The suite enforces **≥90% statements/lines/functions** and **≥85% branches**
on the core via the `vitest.config.ts` thresholds.
