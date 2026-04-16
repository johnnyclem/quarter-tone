/**
 * Lightweight fake Tone.js that records every interaction SynthMapper makes.
 *
 * Only the surface declared in `src/tone-types.ts` is implemented. Each ctor
 * stamps the instance with its args, each mutating method pushes onto a
 * shared event log so tests can assert exact sequencing.
 */

import type {
  ToneFeedbackDelay,
  ToneLib,
  TonePolySynth,
  ToneReverb,
  ToneSignal,
  ToneVolume,
} from '../src/tone-types.js';

export type FakeEvent =
  | { kind: 'startCalled' }
  | { kind: 'gainToDb'; gain: number; db: number }
  | { kind: 'connect'; from: string; to: string }
  | { kind: 'toDestination'; from: string }
  | { kind: 'dispose'; node: string }
  | {
      kind: 'triggerAttackRelease';
      note: string | string[];
      duration: string;
      time: number | undefined;
      velocity: number | undefined;
    }
  | { kind: 'set'; partial: Record<string, unknown> }
  | { kind: 'releaseAll' }
  | { kind: 'transportBpm'; value: number }
  | { kind: 'wetSet'; node: string; value: number }
  | { kind: 'volumeSet'; node: string; value: number };

/** Minimal record of a constructed fake Tone node. */
export interface FakeNode {
  readonly id: number;
  readonly type: string;
  readonly ctorArgs: Record<string, unknown>;
  connectedTo: FakeNode | 'destination' | null;
  disposed: boolean;
  connect(destination: FakeNode): FakeNode;
  toDestination(): FakeNode;
  dispose(): FakeNode;
}

export class FakeTone implements ToneLib {
  readonly events: FakeEvent[] = [];
  readonly nodes: FakeNode[] = [];

  readonly Synth: unknown = { __tag: 'Tone.Synth' };

  readonly Transport: { bpm: ToneSignal };

  /** Class-field constructor references, bound via the closure below. */
  readonly PolySynth: ToneLib['PolySynth'];
  readonly Reverb: ToneLib['Reverb'];
  readonly FeedbackDelay: ToneLib['FeedbackDelay'];
  readonly Volume: ToneLib['Volume'];

  constructor() {
    const self = this;

    this.Transport = {
      bpm: this.makeSignal(null, 'Transport.bpm', 120, (v) => {
        self.events.push({ kind: 'transportBpm', value: v as number });
      }),
    };

    this.PolySynth = class FakePolySynth extends FakeNodeImpl implements TonePolySynth {
      volume: ToneSignal;
      setPartials: Record<string, unknown>[] = [];
      constructor(voice: unknown, options?: Record<string, unknown>) {
        super(self, 'PolySynth', { voice, options });
        this.volume = self.makeSignal(this, 'PolySynth.volume');
      }
      triggerAttackRelease(
        note: string | string[],
        duration: string,
        time?: number,
        velocity?: number,
      ): void {
        self.events.push({
          kind: 'triggerAttackRelease',
          note,
          duration,
          time,
          velocity,
        });
      }
      set(partial: Record<string, unknown>): void {
        self.events.push({ kind: 'set', partial });
        this.setPartials.push(partial);
      }
      releaseAll(): void {
        self.events.push({ kind: 'releaseAll' });
      }
    } as unknown as ToneLib['PolySynth'];

    this.Reverb = class FakeReverb extends FakeNodeImpl implements ToneReverb {
      wet: ToneSignal;
      constructor(options?: Record<string, unknown>) {
        super(self, 'Reverb', { options });
        this.wet = self.makeSignal(this, 'Reverb.wet');
      }
    } as unknown as ToneLib['Reverb'];

    this.FeedbackDelay = class FakeFeedbackDelay extends FakeNodeImpl implements ToneFeedbackDelay {
      wet: ToneSignal;
      feedback: ToneSignal;
      delayTime: ToneSignal<string | number>;
      constructor(options?: Record<string, unknown>) {
        super(self, 'FeedbackDelay', { options });
        this.wet = self.makeSignal(this, 'FeedbackDelay.wet');
        this.feedback = self.makeSignal(this, 'FeedbackDelay.feedback');
        this.delayTime = self.makeSignal<string | number>(this, 'FeedbackDelay.delayTime', '8n');
      }
    } as unknown as ToneLib['FeedbackDelay'];

    this.Volume = class FakeVolume extends FakeNodeImpl implements ToneVolume {
      volume: ToneSignal;
      mute = false;
      constructor(db?: number) {
        super(self, 'Volume', { db });
        this.volume = self.makeSignal(this, 'Volume.volume', db ?? 0);
      }
    } as unknown as ToneLib['Volume'];
  }

  async start(): Promise<void> {
    this.events.push({ kind: 'startCalled' });
  }

  gainToDb(gain: number): number {
    const db = gain <= 0 ? -Infinity : 20 * Math.log10(gain);
    this.events.push({ kind: 'gainToDb', gain, db });
    return db;
  }

  /** Build a Signal-like object that records value writes into `events`. */
  makeSignal<T = number>(
    owner: FakeNode | null,
    name: string,
    initial?: T,
    onWrite?: (next: T) => void,
  ): ToneSignal<T> {
    const self = this;
    let v: T = (initial as T) ?? (0 as unknown as T);
    return {
      get value(): T {
        return v;
      },
      set value(next: T) {
        v = next;
        if (onWrite) onWrite(next);
        if (typeof next === 'number' && owner) {
          if (name.endsWith('.wet')) {
            self.events.push({ kind: 'wetSet', node: owner.type, value: next });
          } else if (name.endsWith('.volume')) {
            self.events.push({ kind: 'volumeSet', node: owner.type, value: next });
          }
        }
      },
    };
  }

  /** All `connect()` + `toDestination()` events, as readable arrows. */
  describeChain(): string[] {
    return this.events
      .filter(
        (e): e is Extract<FakeEvent, { kind: 'connect' | 'toDestination' }> =>
          e.kind === 'connect' || e.kind === 'toDestination',
      )
      .map((e) => (e.kind === 'connect' ? `${e.from} -> ${e.to}` : `${e.from} -> destination`));
  }

  /** Find the first node of `type` (throws if absent). */
  firstNode(type: string): FakeNode {
    const n = this.nodes.find((x) => x.type === type);
    if (!n) throw new Error(`No fake node of type ${type}`);
    return n;
  }
}

/** Concrete base class for every fake node; registers itself with the owner. */
class FakeNodeImpl implements FakeNode {
  readonly id: number;
  readonly type: string;
  readonly ctorArgs: Record<string, unknown>;
  connectedTo: FakeNode | 'destination' | null = null;
  disposed = false;
  private owner: FakeTone;

  constructor(owner: FakeTone, type: string, ctorArgs: Record<string, unknown>) {
    this.owner = owner;
    this.type = type;
    this.ctorArgs = ctorArgs;
    this.id = owner.nodes.length;
    owner.nodes.push(this);
  }

  connect(destination: FakeNode): FakeNode {
    this.connectedTo = destination;
    this.owner.events.push({
      kind: 'connect',
      from: this.type,
      to: destination.type,
    });
    return this;
  }

  toDestination(): FakeNode {
    this.connectedTo = 'destination';
    this.owner.events.push({ kind: 'toDestination', from: this.type });
    return this;
  }

  dispose(): FakeNode {
    this.disposed = true;
    this.owner.events.push({ kind: 'dispose', node: this.type });
    return this;
  }
}

/** Build a ready-to-inject fake Tone namespace. */
export function makeFakeTone(): FakeTone {
  return new FakeTone();
}
