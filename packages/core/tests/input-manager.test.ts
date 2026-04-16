import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BINDINGS,
  INPUT_ACTIONS,
  InputManager,
  RESERVED_KEYS,
  type InputAction,
} from '../src/input-manager.js';

describe('INPUT_ACTIONS / DEFAULT_BINDINGS', () => {
  it('exports every action in a stable list', () => {
    expect(INPUT_ACTIONS).toEqual([
      'up', 'down', 'left', 'right',
      'fire', 'menu', 'cycleScale',
      'saveA', 'saveS',
    ]);
    expect(new Set(INPUT_ACTIONS).size).toBe(INPUT_ACTIONS.length);
  });

  it('defaults cover arrow keys, WASD, Space, Tab, Q, A and S', () => {
    expect(DEFAULT_BINDINGS.up).toContain('ArrowUp');
    expect(DEFAULT_BINDINGS.up).toContain('w');
    expect(DEFAULT_BINDINGS.down).toContain('ArrowDown');
    expect(DEFAULT_BINDINGS.down).toContain('s');
    expect(DEFAULT_BINDINGS.left).toContain('ArrowLeft');
    expect(DEFAULT_BINDINGS.left).toContain('a');
    expect(DEFAULT_BINDINGS.right).toContain('ArrowRight');
    expect(DEFAULT_BINDINGS.right).toContain('d');
    expect(DEFAULT_BINDINGS.fire).toContain(' ');
    expect(DEFAULT_BINDINGS.menu).toContain('Tab');
    expect(DEFAULT_BINDINGS.cycleScale).toContain('q');
    expect(DEFAULT_BINDINGS.saveA).toContain('a');
    expect(DEFAULT_BINDINGS.saveS).toContain('s');
  });

  it('reserves keys that need preventDefault', () => {
    for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab']) {
      expect(RESERVED_KEYS).toContain(k);
    }
  });
});

describe('InputManager — construction', () => {
  it('starts with DEFAULT_BINDINGS as an independent copy', () => {
    const mgr = new InputManager();
    expect(mgr.getBinding('up')).toEqual(DEFAULT_BINDINGS.up);
    // Mutating the returned copy should not leak into the manager.
    const snap = mgr.getBinding('up') as string[];
    snap.push('X');
    expect(mgr.getBinding('up')).toEqual(DEFAULT_BINDINGS.up);
  });

  it('merges partial overrides with defaults', () => {
    const mgr = new InputManager({ bindings: { fire: ['Enter'] } });
    expect(mgr.getBinding('fire')).toEqual(['Enter']);
    expect(mgr.getBinding('up')).toEqual(DEFAULT_BINDINGS.up);
  });

  it('shares an external keys record when provided', () => {
    const shared: Record<string, boolean> = {};
    const mgr = new InputManager({ keys: shared });
    mgr.keyDown('ArrowUp');
    expect(shared['ArrowUp']).toBe(true);
    expect(mgr.keys).toBe(shared);
  });

  it('exposes a keys record by default', () => {
    const mgr = new InputManager();
    expect(mgr.keys).toEqual({});
    mgr.keyDown('w');
    expect(mgr.keys['w']).toBe(true);
  });
});

describe('InputManager — keyDown / keyUp / isPressed', () => {
  it('tracks raw key state', () => {
    const mgr = new InputManager();
    expect(mgr.isKeyDown('ArrowLeft')).toBe(false);
    mgr.keyDown('ArrowLeft');
    expect(mgr.isKeyDown('ArrowLeft')).toBe(true);
    mgr.keyUp('ArrowLeft');
    expect(mgr.isKeyDown('ArrowLeft')).toBe(false);
  });

  it('ignores empty / repeat key events', () => {
    const mgr = new InputManager();
    mgr.keyDown('');
    mgr.keyUp('');
    expect(mgr.keys).toEqual({});

    const listener = vi.fn();
    mgr.on('up', listener);
    mgr.keyDown('ArrowUp');
    mgr.keyDown('ArrowUp'); // repeat should not re-emit
    expect(listener).toHaveBeenCalledTimes(1);

    mgr.keyUp('ArrowUp');
    mgr.keyUp('ArrowUp'); // double release is also ignored
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('maps every default action to its keys', () => {
    const mgr = new InputManager();
    const cases: Array<[InputAction, string]> = [
      ['up', 'ArrowUp'], ['up', 'w'],
      ['down', 'ArrowDown'], ['down', 's'],
      ['left', 'ArrowLeft'], ['left', 'a'],
      ['right', 'ArrowRight'], ['right', 'd'],
      ['fire', ' '],
      ['menu', 'Tab'],
      ['cycleScale', 'q'],
      ['saveA', 'a'],
      ['saveS', 's'],
    ];
    for (const [action, key] of cases) {
      mgr.clear();
      mgr.keyDown(key);
      expect(mgr.isPressed(action), `${action}←${key}`).toBe(true);
    }
  });

  it('isPressed stays true while any bound key is held', () => {
    const mgr = new InputManager();
    mgr.keyDown('ArrowUp');
    mgr.keyDown('w');
    expect(mgr.isPressed('up')).toBe(true);
    mgr.keyUp('ArrowUp');
    expect(mgr.isPressed('up')).toBe(true);
    mgr.keyUp('w');
    expect(mgr.isPressed('up')).toBe(false);
  });
});

describe('InputManager — just-pressed / just-released edges', () => {
  it('reports just-pressed once until update() clears it', () => {
    const mgr = new InputManager();
    mgr.keyDown('ArrowLeft');
    expect(mgr.wasJustPressed('left')).toBe(true);
    // Still true on the same frame.
    expect(mgr.wasJustPressed('left')).toBe(true);
    mgr.update();
    expect(mgr.wasJustPressed('left')).toBe(false);
    // Holding without a new transition does not re-arm the flag.
    expect(mgr.isPressed('left')).toBe(true);
  });

  it('reports just-released after a full press/release cycle', () => {
    const mgr = new InputManager();
    mgr.keyDown('Tab');
    mgr.update();
    mgr.keyUp('Tab');
    expect(mgr.wasJustReleased('menu')).toBe(true);
    mgr.update();
    expect(mgr.wasJustReleased('menu')).toBe(false);
  });

  it('does not re-fire just-pressed when a second bound key joins', () => {
    const mgr = new InputManager();
    mgr.keyDown('ArrowUp');
    expect(mgr.wasJustPressed('up')).toBe(true);
    mgr.update();
    mgr.keyDown('w');
    // 'up' is still held, so joining a second key does not re-fire.
    expect(mgr.wasJustPressed('up')).toBe(false);
  });

  it('only fires just-released when the last bound key lifts', () => {
    const mgr = new InputManager();
    mgr.keyDown('ArrowUp');
    mgr.keyDown('w');
    mgr.update();
    mgr.keyUp('ArrowUp');
    expect(mgr.wasJustReleased('up')).toBe(false); // 'w' still holds it
    mgr.keyUp('w');
    expect(mgr.wasJustReleased('up')).toBe(true);
  });
});

describe('InputManager — listeners', () => {
  it('fires listeners with down / up transitions', () => {
    const mgr = new InputManager();
    const calls: Array<[boolean, string]> = [];
    mgr.on('fire', (down, key) => { calls.push([down, key]); });
    mgr.keyDown(' ');
    mgr.keyUp(' ');
    expect(calls).toEqual([[true, ' '], [false, ' ']]);
  });

  it('returns an unsubscribe function', () => {
    const mgr = new InputManager();
    const listener = vi.fn();
    const off = mgr.on('cycleScale', listener);
    mgr.keyDown('q');
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    mgr.keyUp('q');
    mgr.keyDown('q');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports multiple listeners on the same action', () => {
    const mgr = new InputManager();
    const a = vi.fn();
    const b = vi.fn();
    mgr.on('menu', a);
    mgr.on('menu', b);
    mgr.keyDown('Tab');
    expect(a).toHaveBeenCalledOnce();
    expect(b).toHaveBeenCalledOnce();
  });
});

describe('InputManager — binding mutation', () => {
  it('setBinding replaces the list and deduplicates', () => {
    const mgr = new InputManager();
    mgr.setBinding('fire', ['Enter', 'Enter', ' ']);
    expect(mgr.getBinding('fire')).toEqual(['Enter', ' ']);
  });

  it('addBinding appends without duplicates', () => {
    const mgr = new InputManager();
    mgr.addBinding('fire', 'Enter');
    mgr.addBinding('fire', 'Enter');
    expect(mgr.getBinding('fire')).toEqual([' ', 'Space', 'Enter']);
  });

  it('addBinding throws on empty key', () => {
    const mgr = new InputManager();
    expect(() => mgr.addBinding('fire', '')).toThrow();
  });

  it('removeBinding removes and reports success', () => {
    const mgr = new InputManager();
    expect(mgr.removeBinding('up', 'w')).toBe(true);
    expect(mgr.getBinding('up')).not.toContain('w');
    expect(mgr.removeBinding('up', 'w')).toBe(false);
  });

  it('resetBindings restores the defaults', () => {
    const mgr = new InputManager();
    mgr.setBinding('fire', ['Enter']);
    mgr.resetBindings();
    expect(mgr.getBinding('fire')).toEqual(DEFAULT_BINDINGS.fire);
  });

  it('getBindings returns a snapshot of every action', () => {
    const mgr = new InputManager();
    mgr.setBinding('fire', ['Enter']);
    const snap = mgr.getBindings();
    expect(snap.fire).toEqual(['Enter']);
    expect(snap.up).toEqual(DEFAULT_BINDINGS.up);
    // Mutation of the snapshot does not leak back.
    snap.fire = ['Nope'];
    expect(mgr.getBinding('fire')).toEqual(['Enter']);
  });

  it('rebinding activates new keys and deactivates old ones', () => {
    const mgr = new InputManager();
    mgr.setBinding('fire', ['Enter']);
    mgr.keyDown(' ');
    expect(mgr.isPressed('fire')).toBe(false);
    mgr.keyDown('Enter');
    expect(mgr.isPressed('fire')).toBe(true);
  });

  it('throws on unknown action names', () => {
    const mgr = new InputManager();
    expect(() => mgr.setBinding('nope' as InputAction, ['x'])).toThrow();
    expect(() => mgr.addBinding('nope' as InputAction, 'x')).toThrow();
    expect(() => mgr.removeBinding('nope' as InputAction, 'x')).toThrow();
    expect(() => mgr.on('nope' as InputAction, () => {})).toThrow();
  });
});

describe('InputManager — clear()', () => {
  it('releases every held key and fires listeners', () => {
    const mgr = new InputManager();
    const listener = vi.fn();
    mgr.on('up', listener);
    mgr.keyDown('ArrowUp');
    mgr.keyDown('w');
    mgr.keyDown(' ');
    listener.mockClear();
    mgr.clear();
    expect(mgr.isPressed('up')).toBe(false);
    expect(mgr.isPressed('fire')).toBe(false);
    // 'up' fires exactly once because only the last held key triggers
    // the action-level release.
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(false, expect.any(String));
  });

  it('is a no-op when no keys are held', () => {
    const mgr = new InputManager();
    expect(() => mgr.clear()).not.toThrow();
    expect(mgr.keys).toEqual({});
  });
});

describe('InputManager — interop with GameDeps-style keys record', () => {
  it('drives the shared record for legacy games that read keys[] directly', () => {
    const keys: Record<string, boolean> = {};
    const mgr = new InputManager({ keys });
    mgr.keyDown('ArrowLeft');
    mgr.keyDown('d');
    // Matches the existing `deps.keys['ArrowLeft'] || deps.keys['a']` pattern.
    expect(keys['ArrowLeft']).toBe(true);
    expect(keys['d']).toBe(true);
    mgr.keyUp('ArrowLeft');
    expect(keys['ArrowLeft']).toBe(false);
  });
});
