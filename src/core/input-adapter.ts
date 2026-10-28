import type { InputEvent } from './events'
export enum InputSource {
  Midi = 'midi',
  Mic = 'mic',
  /** The tappable on-screen keyboard: no physical instrument needed. */
  Virtual = 'virtual',
  Fake = 'fake',
}
export interface Capabilities {
  polyphonic: boolean
  source: InputSource
}
export interface InputAdapter {
  capabilities: Capabilities
  onEvent(cb: (e: InputEvent) => void): void
  start(): Promise<void>
  stop(): void
}
