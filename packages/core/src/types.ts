/**
 * Minimal 2D drawing context surface used by games.
 * Intentionally narrowed so tests can pass a stub without the full
 * CanvasRenderingContext2D surface area.
 */
export interface DrawingContext {
  fillStyle: string | CanvasGradient | CanvasPattern;
  strokeStyle: string | CanvasGradient | CanvasPattern;
  lineWidth: number;
  font: string;
  fillRect(x: number, y: number, w: number, h: number): void;
  strokeRect(x: number, y: number, w: number, h: number): void;
  clearRect(x: number, y: number, w: number, h: number): void;
  fillText(text: string, x: number, y: number): void;
  beginPath(): void;
  closePath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  arc(x: number, y: number, r: number, a0: number, a1: number, ccw?: boolean): void;
  fill(): void;
  stroke(): void;
  setLineDash(segments: number[]): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  rotate(a: number): void;
}

export interface GameDeps {
  /** Shared key-state map (e.g. { 'ArrowLeft': true }). */
  keys: Record<string, boolean>;
  /** Fired by game logic to sound a scale note by index. */
  playNote: (i: number) => void;
  /** Setter for the HUD score display. */
  setScore: (s: number) => void;
  /** Reads the current HUD score. */
  getScore: () => number;
  /** Logical game viewport width in pixels. */
  width: number;
  /** Logical game viewport height in pixels. */
  height: number;
  /** Current transport BPM (used by the sequencer game). */
  getBpm: () => number;
  /** Random number generator in [0,1). Injectable for determinism in tests. */
  random?: () => number;
}

export interface Game {
  readonly id: string;
  readonly name: string;
  readonly emoji: string;
  readonly desc: string;
  init(): void;
  update(): void;
  draw(ctx: DrawingContext): void;
  onKey?(key: string, down: boolean): void;
}

export type GameFactory = (deps: GameDeps) => Game;
