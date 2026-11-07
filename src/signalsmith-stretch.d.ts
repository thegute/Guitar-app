// Types for signalsmith-stretch 1.3.2 (the parts KGuitar uses; see its README).
declare module 'signalsmith-stretch' {
  export interface StretchSchedule {
    output?: number
    active?: boolean
    input?: number
    rate?: number
    semitones?: number
    tonalityHz?: number
    formantSemitones?: number
    formantCompensation?: boolean
    formantBaseHz?: number
    loopStart?: number
    loopEnd?: number
  }
  export interface StretchNode extends AudioWorkletNode {
    inputTime: number
    schedule(s: StretchSchedule): Promise<void>
    start(when?: number): Promise<void>
    stop(when?: number): Promise<void>
    addBuffers(buffers: Float32Array[]): Promise<number>
    dropBuffers(toSeconds?: number): Promise<{ start: number; end: number }>
    latency(): number
    configure(c: { blockMs?: number; intervalMs?: number; splitComputation?: boolean; preset?: 'default' | 'cheaper' }): Promise<void>
  }
  export default function SignalsmithStretch(ctx: BaseAudioContext, options?: AudioWorkletNodeOptions): Promise<StretchNode>
}
