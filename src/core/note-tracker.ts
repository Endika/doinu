import { InputEventType, type InputEvent } from './events'

/**
 * Turns a stream of per-frame pitch readings (a MIDI note or null for silence)
 * into discrete note-on / note-off events. A reading must hold steady for
 * `stableFrames` consecutive frames before it commits — this debounces the
 * flicker and brief octave glitches inherent to real-time pitch detection.
 *
 * Pure and synchronous: the mic adapter calls `feed(midi, time)` once per audio
 * frame and emits whatever events come back.
 */
export class NoteTracker {
  private current: number | null = null
  private candidate: number | null = null
  private count = 0

  constructor(private readonly stableFrames = 3) {}

  feed(midi: number | null, time: number): InputEvent[] {
    // Same as what is already sounding → nothing to do; reset any pending change.
    if (midi === this.current) {
      this.candidate = null
      this.count = 0
      return []
    }

    if (midi === this.candidate) this.count++
    else {
      this.candidate = midi
      this.count = 1
    }
    if (this.count < this.stableFrames) return []

    // The change is stable: stop the old note, start the new one (if any).
    const events: InputEvent[] = []
    if (this.current !== null) events.push({ note: this.current, type: InputEventType.Off, time })
    if (midi !== null) events.push({ note: midi, type: InputEventType.On, time })
    this.current = midi
    this.candidate = null
    this.count = 0
    return events
  }

  /** The note currently considered sounding (for a held-note cleanup on stop). */
  get sounding(): number | null {
    return this.current
  }
}
