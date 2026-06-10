// In-memory fake of the parts of the Web MIDI API the MidiInputAdapter uses.
// The adapter subscribes via the `onmidimessage` handler convention.

type MidiMessageLike = { data: Uint8Array }

class FakeMidiInput {
  onmidimessage: ((e: MidiMessageLike) => void) | null = null
}

export class FakeMidiAccess {
  private input = new FakeMidiInput()
  inputs = new Map<string, FakeMidiInput>([['fake-input', this.input]])

  fire(data: number[]) {
    this.input.onmidimessage?.({ data: Uint8Array.from(data) })
  }
}
