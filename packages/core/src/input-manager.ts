/**
 * InputManager — configurable keyboard input layer for Quarter Tone.
 *
 * Pure, DOM-free logic: callers push raw key events via `keyDown` /
 * `keyUp`, and read logical game actions (`up`, `fire`, `menu`, …) which
 * games and UI query instead of hard-coded key strings. Bindings are
 * configurable at runtime so players can rebind everything.
 *
 * The manager also exposes a `keys` record compatible with the existing
 * `GameDeps.keys` surface so games that still read raw key state
 * (`keys['ArrowLeft']`) keep working unchanged.
 */

/**
 * Logical input actions emitted by the arcade cabinet.
 *
 * The default bindings cover the cabinet's physical controls:
 *   - Arrow keys + WASD: four-way movement
 *   - Space:             primary fire / jump / confirm
 *   - Tab:               toggle the game menu
 *   - Q:                 cycle the musical scale
 *   - A / S:             save slot A and save slot S
 */
export type InputAction =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'fire'
  | 'menu'
  | 'cycleScale'
  | 'saveA'
  | 'saveS';

/** All known action ids, in a stable iteration order. */
export const INPUT_ACTIONS: readonly InputAction[] = [
  'up',
  'down',
  'left',
  'right',
  'fire',
  'menu',
  'cycleScale',
  'saveA',
  'saveS',
] as const;

/** Map from action -> list of physical key strings that trigger it. */
export type KeyBindings = Record<InputAction, readonly string[]>;

/**
 * Default key bindings used by the arcade cabinet. Every action accepts
 * both lower- and upper-case variants of the letter keys so that a stuck
 * Shift or CapsLock doesn't block play.
 */
export const DEFAULT_BINDINGS: KeyBindings = {
  up: ['ArrowUp', 'w', 'W'],
  down: ['ArrowDown', 's', 'S'],
  left: ['ArrowLeft', 'a', 'A'],
  right: ['ArrowRight', 'd', 'D'],
  fire: [' ', 'Space'],
  menu: ['Tab'],
  cycleScale: ['q', 'Q'],
  saveA: ['a', 'A'],
  saveS: ['s', 'S'],
};

/**
 * Keys whose browser default behaviour (scrolling, tab focus change)
 * should be cancelled when the arcade is focused. Consumers wiring the
 * DOM can iterate this set to decide whether to call `preventDefault()`.
 */
export const RESERVED_KEYS: readonly string[] = [
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  ' ',
  'Space',
  'Tab',
];

/** Listener fired once per key transition for the action it subscribes to. */
export type ActionListener = (down: boolean, key: string) => void;

export interface InputManagerOptions {
  /** Partial overrides merged on top of `DEFAULT_BINDINGS`. */
  bindings?: Partial<KeyBindings>;
  /**
   * Shared key-state record (for interop with `GameDeps.keys`). When
   * supplied, `keyDown` / `keyUp` write into it directly so existing
   * games see the same map.
   */
  keys?: Record<string, boolean>;
}

type MutableBindings = { [K in InputAction]: string[] };

function cloneBindings(src: KeyBindings): MutableBindings {
  const out = {} as MutableBindings;
  for (const action of INPUT_ACTIONS) {
    out[action] = [...src[action]];
  }
  return out;
}

export class InputManager {
  /** Shared raw key-state map. Truthy while the key is held. */
  readonly keys: Record<string, boolean>;

  private bindings: { [K in InputAction]: string[] };
  private readonly justPressed = new Set<InputAction>();
  private readonly justReleased = new Set<InputAction>();
  private readonly listeners = new Map<InputAction, Set<ActionListener>>();

  constructor(options: InputManagerOptions = {}) {
    this.keys = options.keys ?? {};
    this.bindings = cloneBindings(DEFAULT_BINDINGS);
    if (options.bindings) {
      for (const action of INPUT_ACTIONS) {
        const override = options.bindings[action];
        if (override !== undefined) {
          this.bindings[action] = [...override];
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Raw key events
  // ---------------------------------------------------------------------------

  /** Mark a key as pressed. Emits `justPressed` + listeners for new actions. */
  keyDown(key: string): void {
    if (!key) return;
    const wasDown = this.keys[key] === true;
    this.keys[key] = true;
    if (wasDown) return;
    for (const action of this.actionsFor(key)) {
      // Only fire "just pressed" if no other bound key was already holding it.
      if (!this.isOtherKeyHolding(action, key)) {
        this.justPressed.add(action);
        this.emit(action, true, key);
      }
    }
  }

  /** Mark a key as released. Emits `justReleased` + listeners when appropriate. */
  keyUp(key: string): void {
    if (!key) return;
    const wasDown = this.keys[key] === true;
    this.keys[key] = false;
    if (!wasDown) return;
    for (const action of this.actionsFor(key)) {
      if (!this.isOtherKeyHolding(action, key)) {
        this.justReleased.add(action);
        this.emit(action, false, key);
      }
    }
  }

  /** Is this specific physical key currently held? */
  isKeyDown(key: string): boolean {
    return this.keys[key] === true;
  }

  // ---------------------------------------------------------------------------
  // Action queries
  // ---------------------------------------------------------------------------

  /** True while *any* key bound to `action` is held. */
  isPressed(action: InputAction): boolean {
    const keys = this.bindings[action];
    for (const k of keys) if (this.keys[k] === true) return true;
    return false;
  }

  /**
   * True once per key-down transition for `action`. Cleared by `update()`
   * so that game logic can poll it each frame without edge-detection.
   */
  wasJustPressed(action: InputAction): boolean {
    return this.justPressed.has(action);
  }

  /** True once per key-up transition for `action`. Cleared by `update()`. */
  wasJustReleased(action: InputAction): boolean {
    return this.justReleased.has(action);
  }

  // ---------------------------------------------------------------------------
  // Bindings
  // ---------------------------------------------------------------------------

  /** Return a defensive copy of the binding list for `action`. */
  getBinding(action: InputAction): readonly string[] {
    return [...this.bindings[action]];
  }

  /** Return a defensive copy of every binding. */
  getBindings(): KeyBindings {
    return cloneBindings(this.bindings);
  }

  /** Replace every key bound to `action` with `keys` (de-duplicated). */
  setBinding(action: InputAction, keys: readonly string[]): void {
    this.assertAction(action);
    this.bindings[action] = Array.from(new Set(keys));
  }

  /** Bind an additional key to `action`. No-op if already bound. */
  addBinding(action: InputAction, key: string): void {
    this.assertAction(action);
    if (!key) throw new Error('Key must be a non-empty string');
    if (this.bindings[action].indexOf(key) === -1) {
      this.bindings[action].push(key);
    }
  }

  /** Unbind a key from `action`. Returns true when something was removed. */
  removeBinding(action: InputAction, key: string): boolean {
    this.assertAction(action);
    const list = this.bindings[action];
    const i = list.indexOf(key);
    if (i === -1) return false;
    list.splice(i, 1);
    return true;
  }

  /** Reset every binding to `DEFAULT_BINDINGS`. */
  resetBindings(): void {
    this.bindings = cloneBindings(DEFAULT_BINDINGS);
  }

  // ---------------------------------------------------------------------------
  // Event subscription
  // ---------------------------------------------------------------------------

  /**
   * Subscribe to transitions for `action`. The returned function
   * unsubscribes the listener.
   */
  on(action: InputAction, listener: ActionListener): () => void {
    this.assertAction(action);
    let set = this.listeners.get(action);
    if (!set) {
      set = new Set();
      this.listeners.set(action, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
    };
  }

  // ---------------------------------------------------------------------------
  // Frame / housekeeping
  // ---------------------------------------------------------------------------

  /** Clear `wasJustPressed` / `wasJustReleased` flags. Call once per frame. */
  update(): void {
    this.justPressed.clear();
    this.justReleased.clear();
  }

  /** Release every key (e.g. on window blur). Fires release listeners. */
  clear(): void {
    const held: string[] = [];
    for (const k of Object.keys(this.keys)) {
      if (this.keys[k]) held.push(k);
    }
    for (const k of held) this.keyUp(k);
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private actionsFor(key: string): InputAction[] {
    const matched: InputAction[] = [];
    for (const action of INPUT_ACTIONS) {
      if (this.bindings[action].indexOf(key) !== -1) matched.push(action);
    }
    return matched;
  }

  private isOtherKeyHolding(action: InputAction, exclude: string): boolean {
    for (const k of this.bindings[action]) {
      if (k === exclude) continue;
      if (this.keys[k] === true) return true;
    }
    return false;
  }

  private emit(action: InputAction, down: boolean, key: string): void {
    const set = this.listeners.get(action);
    if (!set) return;
    for (const cb of set) cb(down, key);
  }

  private assertAction(action: InputAction): void {
    if (!INPUT_ACTIONS.includes(action)) {
      throw new Error(`Unknown input action: ${String(action)}`);
    }
  }
}
