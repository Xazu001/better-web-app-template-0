/**
 * Minimal Web Audio stand-in for unit tests.
 *
 * It records every automation event and can evaluate an `AudioParam` at an arbitrary time,
 * which is what makes the de-click assertions possible: a click is a *gain step*, so the tests
 * sample the rendered envelope and look for discontinuities instead of trusting the call order.
 *
 * Only the subset the audio controller actually uses is implemented.
 */

type ParamEvent =
  | { type: "setValue"; time: number; value: number }
  | { type: "linearRamp"; time: number; value: number }
  | { type: "exponentialRamp"; time: number; value: number }
  | { type: "setTarget"; time: number; value: number; timeConstant: number }
  | { type: "curve"; time: number; duration: number; values: Float32Array };

export class FakeAudioParam {
  readonly events: ParamEvent[] = [];
  private initialValue: number;

  constructor(
    initialValue: number,
    private readonly ctx: FakeAudioContext
  ) {
    this.initialValue = initialValue;
  }

  get value(): number {
    return this.valueAt(this.ctx.currentTime);
  }

  set value(v: number) {
    if (this.events.length === 0) {
      this.initialValue = v;
      return;
    }
    this.push({ type: "setValue", time: this.ctx.currentTime, value: v });
  }

  setValueAtTime(value: number, time: number): FakeAudioParam {
    return this.push({ type: "setValue", time, value });
  }

  linearRampToValueAtTime(value: number, time: number): FakeAudioParam {
    return this.push({ type: "linearRamp", time, value });
  }

  exponentialRampToValueAtTime(value: number, time: number): FakeAudioParam {
    return this.push({ type: "exponentialRamp", time, value });
  }

  setTargetAtTime(value: number, time: number, timeConstant: number): FakeAudioParam {
    return this.push({ type: "setTarget", time, value, timeConstant });
  }

  setValueCurveAtTime(values: Float32Array, time: number, duration: number): FakeAudioParam {
    return this.push({ type: "curve", time, duration, values: Float32Array.from(values) });
  }

  cancelScheduledValues(time: number): FakeAudioParam {
    for (let i = this.events.length - 1; i >= 0; i--) {
      if (this.events[i]!.time >= time) this.events.splice(i, 1);
    }
    return this;
  }

  /**
   * Models **observed Chrome behaviour, not the specification**: the implicit hold event is not
   * left behind in a way that anchors a following ramp when the last event is a finished
   * `setValueCurveAtTime`. Rendered offline in Chrome, `curve(0→1) @22ms/9ms` +
   * `cancelAndHoldAtTime(172ms)` + `linearRampToValueAtTime(0, 202ms)` reads 0.18 at 171 ms —
   * the ramp is interpolated from the curve's end (32 ms), as if the hold never happened.
   *
   * The mock deliberately reproduces that, because a spec-faithful mock reports a working fade
   * on code that clicks in every real browser.
   */
  cancelAndHoldAtTime(time: number): FakeAudioParam {
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i]!;
      const end = e.type === "curve" ? e.time + e.duration : e.time;
      if (e.time > time || end > time) this.events.splice(i, 1);
    }
    return this;
  }

  /** Envelope value at `time`, following the Web Audio automation rules for the events used here. */
  valueAt(time: number): number {
    let current = { time: Number.NEGATIVE_INFINITY, value: this.initialValue };

    for (let i = 0; i < this.events.length; i++) {
      const e = this.events[i]!;

      if (time < e.time) {
        if (e.type === "linearRamp") {
          const span = e.time - current.time;
          if (!Number.isFinite(span) || span <= 0) return e.value;
          const k = (time - current.time) / span;
          return current.value + (e.value - current.value) * k;
        }
        if (e.type === "exponentialRamp") {
          const span = e.time - current.time;
          if (!Number.isFinite(span) || span <= 0) return e.value;
          const from = Math.max(current.value, 1e-6);
          const to = Math.max(e.value, 1e-6);
          return from * Math.pow(to / from, (time - current.time) / span);
        }
        return current.value;
      }

      if (e.type === "curve") {
        if (time < e.time + e.duration) {
          const k = ((time - e.time) / e.duration) * (e.values.length - 1);
          const lo = Math.floor(k);
          const hi = Math.min(lo + 1, e.values.length - 1);
          return e.values[lo]! + (e.values[hi]! - e.values[lo]!) * (k - lo);
        }
        current = { time: e.time + e.duration, value: e.values[e.values.length - 1]! };
        continue;
      }

      if (e.type === "setTarget") {
        const next = this.events[i + 1];
        const until = next && next.time <= time ? next.time : time;
        const settled =
          e.value + (current.value - e.value) * Math.exp(-(until - e.time) / e.timeConstant);
        current = { time: until, value: settled };
        if (!next || next.time > time) return settled;
        continue;
      }

      current = { time: e.time, value: e.value };
    }

    return current.value;
  }

  /** Largest single-step change between consecutive audio frames over [from, to]. */
  maxStep(from: number, to: number, sampleRate = 48000): number {
    const dt = 1 / sampleRate;
    let previous = this.valueAt(from);
    let max = 0;
    for (let t = from + dt; t <= to; t += dt) {
      const v = this.valueAt(t);
      max = Math.max(max, Math.abs(v - previous));
      previous = v;
    }
    return max;
  }

  private push(event: ParamEvent): FakeAudioParam {
    this.events.push(event);
    this.events.sort((a, b) => a.time - b.time);
    return this;
  }
}

class FakeAudioNode {
  readonly outputs: FakeAudioNode[] = [];
  connect(destination: FakeAudioNode): FakeAudioNode {
    this.outputs.push(destination);
    return destination;
  }
  disconnect(): void {
    this.outputs.length = 0;
  }
}

export class FakeGainNode extends FakeAudioNode {
  readonly gain: FakeAudioParam;
  constructor(ctx: FakeAudioContext) {
    super();
    this.gain = new FakeAudioParam(1, ctx);
  }
}

export class FakeBufferSourceNode extends FakeAudioNode {
  buffer: unknown = null;
  loop = false;
  readonly playbackRate: FakeAudioParam;
  onended: (() => void) | null = null;
  /** Recorded `start(when)` calls — `undefined` means "no argument given". */
  readonly startCalls: (number | undefined)[] = [];
  /** Recorded `stop(when)` calls — `undefined` means an *immediate* (clicking) stop. */
  readonly stopCalls: (number | undefined)[] = [];

  constructor(ctx: FakeAudioContext) {
    super();
    this.playbackRate = new FakeAudioParam(1, ctx);
  }

  get startedAt(): number | undefined {
    return this.startCalls[0];
  }

  get stoppedAt(): number | undefined {
    return this.stopCalls[0];
  }

  start(when?: number): void {
    this.startCalls.push(when);
  }

  stop(when?: number): void {
    this.stopCalls.push(when);
  }
}

export class FakeAnalyserNode extends FakeAudioNode {
  fftSize = 2048;
  smoothingTimeConstant = 0.8;
  get frequencyBinCount(): number {
    return this.fftSize / 2;
  }
  getByteFrequencyData(array: Uint8Array): void {
    array.fill(0);
  }
}

class FakeBiquadFilterNode extends FakeAudioNode {
  type = "lowpass";
  readonly frequency: FakeAudioParam;
  readonly Q: FakeAudioParam;
  constructor(ctx: FakeAudioContext) {
    super();
    this.frequency = new FakeAudioParam(350, ctx);
    this.Q = new FakeAudioParam(1, ctx);
  }
}

export class FakeAudioBuffer {
  constructor(
    readonly duration: number,
    readonly sampleRate = 48000
  ) {}
  get length(): number {
    return Math.round(this.duration * this.sampleRate);
  }
  readonly numberOfChannels = 1;
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: "running" | "suspended" | "closed" = "running";
  currentTime = 0;
  readonly sampleRate = 48000;
  readonly destination = new FakeAudioNode();
  readonly sources: FakeBufferSourceNode[] = [];
  readonly gains: FakeGainNode[] = [];

  constructor(_options?: unknown) {
    FakeAudioContext.instances.push(this);
  }

  /** Move the clock forward, as the audio thread would between two user gestures. */
  advance(seconds: number): void {
    this.currentTime = Number((this.currentTime + seconds).toFixed(9));
  }

  createGain(): FakeGainNode {
    const node = new FakeGainNode(this);
    this.gains.push(node);
    return node;
  }

  createBufferSource(): FakeBufferSourceNode {
    const node = new FakeBufferSourceNode(this);
    this.sources.push(node);
    return node;
  }

  createAnalyser(): FakeAnalyserNode {
    return new FakeAnalyserNode();
  }

  createBiquadFilter(): FakeBiquadFilterNode {
    return new FakeBiquadFilterNode(this);
  }

  decodeAudioData(
    _data: ArrayBuffer,
    onSuccess?: (buffer: FakeAudioBuffer) => void
  ): Promise<FakeAudioBuffer> {
    const buffer = new FakeAudioBuffer(0.4);
    onSuccess?.(buffer);
    return Promise.resolve(buffer);
  }

  resume(): Promise<void> {
    this.state = "running";
    return Promise.resolve();
  }

  close(): Promise<void> {
    this.state = "closed";
    return Promise.resolve();
  }
}
