import { pong } from './pong.js';
import { breakout } from './breakout.js';
import { snake } from './snake.js';
import { invaders } from './invaders.js';
import { tetris } from './tetris.js';
import { sequencer } from './sequencer.js';
import { kong } from './kong.js';
import { kongjr } from './kongjr.js';
import { ghost } from './ghost.js';
import { galaga } from './galaga.js';
import { frogger } from './frogger.js';
import { asteroids } from './asteroids.js';
import type { GameDefinition } from '../types.js';

export {
  pong,
  breakout,
  snake,
  invaders,
  tetris,
  sequencer,
  kong,
  kongjr,
  ghost,
  galaga,
  frogger,
  asteroids,
};

/** Ordered catalogue of every built-in game. */
export const GAMES: ReadonlyArray<GameDefinition> = [
  pong,
  breakout,
  snake,
  invaders,
  tetris,
  sequencer,
  kong,
  kongjr,
  ghost,
  galaga,
  frogger,
  asteroids,
];
