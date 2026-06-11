import { InputSource, type InputAdapter, type Capabilities } from './input-adapter'
import { InputEventType, type InputEvent } from './events'

// Real input path for Fase 1: a physical MIDI keyboard via the Web MIDI API.
// `requestAccess` is injected so the adapter is testable without a browser.
export class MidiInputAdapter implements InputAdapter {
  capabilities: Capabilities = { polyphonic: true, source: InputSource.Midi }
  private listeners: ((e: InputEvent) => void)[] = []
  private inputs: MIDIInput[] = []

  constructor(
    private requestAccess: () => Promise<MIDIAccess> = () => navigator.requestMIDIAccess(),
  ) {}

  onEvent(cb: (e: InputEvent) => void) {
    this.listeners.push(cb)
  }

  async start() {
    const access = await this.requestAccess()
    for (const input of access.inputs.values()) {
      input.onmidimessage = (e) => this.handle(e)
      this.inputs.push(input)
    }
  }

  stop() {
    for (const input of this.inputs) input.onmidimessage = null
    this.inputs = []
  }

  private handle(e: MIDIMessageEvent) {
    const data = e.data
    if (!data || data.length < 3) return
    const status = data[0] & 0xf0
    const note = data[1]
    const velocity = data[2]
    let type: InputEvent['type']
    if (status === 0x90) {
      type = velocity > 0 ? InputEventType.On : InputEventType.Off
    } else if (status === 0x80) {
      type = InputEventType.Off
    } else {
      return // ignore non-note messages (e.g. control change)
    }
    const event: InputEvent = { note, type, time: performance.now(), velocity }
    for (const cb of this.listeners) cb(event)
  }
}
