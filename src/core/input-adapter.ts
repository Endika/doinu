import type { InputEvent } from './events'
export interface Capabilities { polyphonic: boolean; source: 'midi' | 'mic' | 'fake' }
export interface InputAdapter {
  capabilities: Capabilities
  onEvent(cb: (e: InputEvent) => void): void
  start(): Promise<void>
  stop(): void
}
