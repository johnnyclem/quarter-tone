/**
 * PluginHost — thin wrapper around the JUCE `WebBrowserComponent` ↔ JS
 * bridge exposed on `window.__QT_NATIVE__`. Only this file talks to the
 * raw bridge; the rest of the app uses the high-level `NativeBridgeMapper`.
 */

import {
  isPluginHost,
  type JsToNativeMessage,
  type NativeToJsMessage,
} from '@quarter-tone/core';

interface NativeBridge {
  /**
   * Implemented by the native side. JUCE exposes this via
   * `WebBrowserComponent::emitEventIfBrowserIsVisible` — we call it from JS
   * by invoking the global injected at startup.
   */
  postMessage(message: string): void;
}

type Listener = (msg: NativeToJsMessage) => void;

function getBridge(): NativeBridge | null {
  const anyGlobal = globalThis as unknown as { __QT_NATIVE__?: NativeBridge };
  return anyGlobal.__QT_NATIVE__ ?? null;
}

/**
 * Registers a single dispatcher on the global `__QT_NATIVE_RECEIVE__` hook
 * the C++ side calls when pushing messages to JS. Subsequent subscribers
 * are multiplexed; the dispatcher is only installed once.
 */
class BridgeDispatcher {
  private listeners = new Set<Listener>();
  private installed = false;

  subscribe(listener: Listener): () => void {
    this.ensureInstalled();
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private ensureInstalled(): void {
    if (this.installed) return;
    const g = globalThis as unknown as {
      __QT_NATIVE_RECEIVE__?: (raw: string) => void;
    };
    g.__QT_NATIVE_RECEIVE__ = (raw: string) => {
      let msg: NativeToJsMessage;
      try {
        msg = JSON.parse(raw) as NativeToJsMessage;
      } catch {
        return;
      }
      for (const l of this.listeners) l(msg);
    };
    this.installed = true;
  }
}

const dispatcher = new BridgeDispatcher();

export const PluginHost = {
  isActive: isPluginHost,

  send(message: JsToNativeMessage): void {
    const bridge = getBridge();
    if (!bridge) return;
    bridge.postMessage(JSON.stringify(message));
  },

  on(listener: Listener): () => void {
    return dispatcher.subscribe(listener);
  },
};

export type { NativeToJsMessage, JsToNativeMessage };
