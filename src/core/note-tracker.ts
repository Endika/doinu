import { InputEventType, type InputEvent } from './events'

/**
 * Turns a stream of per-frame pitch readings (a MIDI note or null for silence)
 * into discrete note-on / note-off events. A reading must hold steady for
 * `stableFrames` consecutive frames before it commits — this debounces the
 * flicker and brief octave glitches inherent to real-time pitch detection.
 *
 * Pure and synchronous: the mic adapter calls `feed(midi, time, onset)` once per
 * audio frame and emits whatever events come back. `onset` (an amplitude attack)
 * re-triggers the SAME note, so a re-struck note counts again even with no clean
 * silence between strikes.
 */
export class NoteTracker {
  private current: number | null = null
  private candidate: number | null = null
  private count = 0

  constructor(private readonly stableFrames = 3) {}

  feed(midi: number | null, time: number, onset = false): InputEvent[] {
    // Same pitch already sounding: normally nothing to do — but a fresh attack on
    // that same pitch is a repeated note, so re-trigger it (off then on).
    if (midi === this.current) {
      this.candidate = null
      this.count = 0
      if (onset && midi !== null) {
        return [
          { note: midi, type: InputEventType.Off, time },
          { note: midi, type: InputEventType.On, time },
        ]
      }
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
