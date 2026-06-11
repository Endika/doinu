import { InputSource, type InputAdapter, type Capabilities } from './input-adapter'
import type { InputEvent } from './events'
export class FakeInputAdapter implements InputAdapter {
  capabilities: Capabilities = { polyphonic: true, source: InputSource.Fake }
  private cb: (e: InputEvent) => void = () => {}
  constructor(private script: InputEvent[]) {}
  onEvent(cb: (e: InputEvent) => void) { this.cb = cb }
  async start() {}
  stop() {}
  play() { for (const e of this.script) this.cb(e) }
}
