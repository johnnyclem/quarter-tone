import { createPong } from './pong.js';
import { createBreakout } from './breakout.js';
import { createSnake } from './snake.js';
import { createInvaders } from './invaders.js';
import { createTetris } from './tetris.js';
import { createSequencer } from './sequencer.js';
import { createKong } from './kong.js';
import { createKongJr } from './kongjr.js';
import { createGhost } from './ghost.js';
import { createGalaga } from './galaga.js';
import { createFrogger } from './frogger.js';
import { createAsteroids } from './asteroids.js';
import type { GameFactory } from '../types.js';

export {
  createPong,
  createBreakout,
  createSnake,
  createInvaders,
  createTetris,
  createSequencer,
  createKong,
  createKongJr,
  createGhost,
  createGalaga,
  createFrogger,
  createAsteroids,
};

/** Ordered catalogue of every built-in game factory. */
export const GAME_FACTORIES: ReadonlyArray<{ id: string; factory: GameFactory }> = [
  { id: 'pong',      factory: createPong },
  { id: 'breakout',  factory: createBreakout },
  { id: 'snake',     factory: createSnake },
  { id: 'invaders',  factory: createInvaders },
  { id: 'tetris',    factory: createTetris },
  { id: 'sequencer', factory: createSequencer },
  { id: 'kong',      factory: createKong },
  { id: 'kongjr',    factory: createKongJr },
  { id: 'ghost',     factory: createGhost },
  { id: 'galaga',    factory: createGalaga },
  { id: 'frogger',   factory: createFrogger },
  { id: 'asteroids', factory: createAsteroids },
];
