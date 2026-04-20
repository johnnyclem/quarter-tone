/**
 * Plugin bridge contract — the message schema exchanged between the
 * Quarter-Tone React cabinet (running inside a JUCE WebBrowserComponent)
 * and the native C++ audio engine / MIDI router.
 *
 * Defined once, shared by:
 *   - packages/app/src/plugin/NativeBridgeMapper.ts  (JS side)
 *   - native/Source/bridge/WebBridge.cpp             (C++ side; kept in sync
 *     manually — update both when fields change)
 *
 * Keep this file dependency-free so it can be imported by the app bundle
 * without pulling in Tone.js or any runtime audio code.
 */

import type { SynthConfig, Waveform, ArpMode } from '../types.js';

/** Stable IDs for every DAW-automatable parameter. */
export type ParamId =
  | 'key'
  | 'scale'
  | 'wave'
  | 'arp'
  | 'octave'
  | 'attack'
  | 'release'
  | 'delayWet'
  | 'reverbWet'
  | 'volume'
  | 'bpm'
  | 'audioInSend'
  | 'midiOutEnabled';

export const PARAM_IDS: readonly ParamId[] = [
  'key',
  'scale',
  'wave',
  'arp',
  'octave',
  'attack',
  'release',
  'delayWet',
  'reverbWet',
  'volume',
  'bpm',
  'audioInSend',
  'midiOutEnabled',
] as const;

/* -------------------------------------------------------------------------- */
/*  JS → Native                                                               */
/* -------------------------------------------------------------------------- */

export interface JsNoteMessage {
  kind: 'note';
  index: number;
  duration?: string;
  velocity?: number;
}

export interface JsChordMessage {
  kind: 'chord';
  indices: number[];
  duration?: string;
  velocity?: number;
}

export interface JsParamMessage {
  kind: 'param';
  id: ParamId;
  value: number;
}

export interface JsReadyMessage {
  kind: 'ready';
}

export type JsToNativeMessage =
  | JsNoteMessage
  | JsChordMessage
  | JsParamMessage
  | JsReadyMessage;

/* -------------------------------------------------------------------------- */
/*  Native → JS                                                               */
/* -------------------------------------------------------------------------- */

export interface NativeParamChangedMessage {
  kind: 'paramChanged';
  id: ParamId;
  value: number;
}

export interface NativeMidiInMessage {
  kind: 'midiIn';
  note: number;
  velocity: number;
  on: boolean;
}

export interface NativeTransportMessage {
  kind: 'transport';
  bpm: number;
  playing: boolean;
}

export type NativeToJsMessage =
  | NativeParamChangedMessage
  | NativeMidiInMessage
  | NativeTransportMessage;

/* -------------------------------------------------------------------------- */
/*  Parameter encoding                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Numeric parameter ranges used on both sides of the bridge. Enumerated
 * params (scale, wave, arp) travel as integer indices into the arrays below
 * so the native side can store them as `juce::AudioParameterChoice`.
 */
export const SCALE_VALUES: readonly SynthConfig['scale'][] = [
  'Major',
  'Minor',
  'Penta',
  'Blues',
  'Dorian',
  'Mixo',
  'Phrygian',
];

export const WAVE_VALUES: readonly Waveform[] = [
  'triangle',
  'sine',
  'square',
  'sawtooth',
];

export const ARP_VALUES: readonly ArpMode[] = ['Up', 'Down', 'Bounce', 'Random'];

/** Encode a `SynthConfig` value as the numeric wire form. */
export function encodeParam(id: ParamId, cfg: SynthConfig): number {
  switch (id) {
    case 'key':
      return cfg.key;
    case 'scale':
      return SCALE_VALUES.indexOf(cfg.scale);
    case 'wave':
      return WAVE_VALUES.indexOf(cfg.wave);
    case 'arp':
      return ARP_VALUES.indexOf(cfg.arp);
    case 'octave':
      return cfg.octave;
    case 'attack':
      return cfg.attack;
    case 'release':
      return cfg.release;
    case 'delayWet':
      return cfg.delayWet;
    case 'reverbWet':
      return cfg.reverbWet;
    case 'volume':
      return cfg.volume;
    case 'bpm':
      return cfg.bpm;
    case 'audioInSend':
      return 0;
    case 'midiOutEnabled':
      return 1;
  }
}

/** Detect whether the current window is running inside the JUCE plugin host. */
export function isPluginHost(): boolean {
  if (typeof globalThis === 'undefined') return false;
  const anyGlobal = globalThis as unknown as { __QT_NATIVE__?: unknown };
  return anyGlobal.__QT_NATIVE__ != null;
}
