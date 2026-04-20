/**
 * NativeBridgeMapper — drop-in replacement for
 * `@quarter-tone/audio`'s `SynthMapper` that runs inside the JUCE plugin
 * host. Rather than driving a Tone.js graph it serialises the same call
 * surface (`playNote`, `playChord`, parameter setters) as JSON messages to
 * the native C++ audio engine via `PluginHost`.
 *
 * The shape intentionally mirrors `SynthMapper` so the rest of the app
 * (cabinet, games) does not need to branch on runtime.
 */

import type {
  ArpMode,
  ParamId,
  SynthConfig,
  Waveform,
} from '@quarter-tone/core';
import { ARP_VALUES, SCALE_VALUES, WAVE_VALUES } from '@quarter-tone/core';

import { PluginHost } from './PluginHost.js';

export interface NativeBridgeSnapshot {
  wave: Waveform;
  attack: number;
  release: number;
  delayWet: number;
  reverbWet: number;
  volume: number;
  bpm: number;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export class NativeBridgeMapper {
  private state: NativeBridgeSnapshot;

  constructor(initial: Partial<SynthConfig> = {}) {
    this.state = {
      wave: initial.wave ?? 'triangle',
      attack: initial.attack ?? 0.02,
      release: initial.release ?? 0.3,
      delayWet: clamp01(initial.delayWet ?? 0.3),
      reverbWet: clamp01(initial.reverbWet ?? 0.4),
      volume: clamp01(initial.volume ?? 0.7),
      bpm: initial.bpm ?? 120,
    };
    PluginHost.send({ kind: 'ready' });
  }

  /** No-op — AudioContext resume lives on the native side. */
  // eslint-disable-next-line @typescript-eslint/require-await
  async start(): Promise<void> {}

  playNote(index: number, duration?: string, velocity?: number): void {
    PluginHost.send({ kind: 'note', index, duration, velocity });
  }

  playChord(indices: number[], duration?: string, velocity?: number): void {
    if (indices.length === 0) return;
    PluginHost.send({ kind: 'chord', indices, duration, velocity });
  }

  setWave(wave: Waveform): void {
    this.state.wave = wave;
    this.sendParam('wave', WAVE_VALUES.indexOf(wave));
  }

  setArp(arp: ArpMode): void {
    this.sendParam('arp', ARP_VALUES.indexOf(arp));
  }

  setScale(scale: SynthConfig['scale']): void {
    this.sendParam('scale', SCALE_VALUES.indexOf(scale));
  }

  setKey(key: number): void {
    this.sendParam('key', key);
  }

  setOctave(octave: number): void {
    this.sendParam('octave', octave);
  }

  setAttack(attack: number): void {
    this.state.attack = attack;
    this.sendParam('attack', attack);
  }

  setRelease(release: number): void {
    this.state.release = release;
    this.sendParam('release', release);
  }

  setDelayWet(wet: number): void {
    const v = clamp01(wet);
    this.state.delayWet = v;
    this.sendParam('delayWet', v);
  }

  setReverbWet(wet: number): void {
    const v = clamp01(wet);
    this.state.reverbWet = v;
    this.sendParam('reverbWet', v);
  }

  setVolume(volume: number): void {
    const v = clamp01(volume);
    this.state.volume = v;
    this.sendParam('volume', v);
  }

  setBpm(bpm: number): void {
    this.state.bpm = bpm;
    this.sendParam('bpm', bpm);
  }

  dispose(): void {
    /* Native side owns the audio graph lifetime. */
  }

  snapshot(): NativeBridgeSnapshot {
    return { ...this.state };
  }

  private sendParam(id: ParamId, value: number): void {
    PluginHost.send({ kind: 'param', id, value });
  }
}
