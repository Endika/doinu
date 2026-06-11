import { InputEventType, type InputEvent } from '../core/events'

/** A note captured while recording: pitch + real start/duration (ms, song-relative). */
export interface RecordedNote {
  midi: number
  startMs: number
  durMs: number
}

/**
 * Records what the learner plays, with REAL timing: each note-on starts a note,
 * the matching note-off ends it (note-on -> note-off = duration). Start times are
 * normalised so the FIRST note begins at 0. Notes still held when recording stops
 * are closed at the stop time; a note-off with no matching note-on is ignored.
 *
 * Pure (no DOM/clock) so it is fully testable: feed `InputEvent`s with explicit
 * `time`, then call `finish(stopMs)`.
 */
export class CompositionRecorder {
  private readonly notes: RecordedNote[] = []
  private readonly open = new Map<number, number>() // midi -> raw note-on time
  private firstOn: number | null = null

  feed(e: InputEvent): void {
    if (e.type === InputEventType.On) {
      if (this.firstOn === null) this.firstOn = e.time
      this.open.set(e.note, e.time)
    } else {
      const onTime = this.open.get(e.note)
      if (onTime === undefined) return // note-off without a matching note-on
      this.open.delete(e.note)
      this.push(e.note, onTime, e.time)
    }
  }

  /** Close any still-held notes at `stopMs` and return the recording, sorted by start. */
  finish(stopMs: number): RecordedNote[] {
    for (const [midi, onTime] of this.open) this.push(midi, onTime, stopMs)
    this.open.clear()
    return [...this.notes].sort((a, b) => a.startMs - b.startMs || a.midi - b.midi)
  }

  /** How many notes have been captured so far (closed + still held). */
  get count(): number {
    return this.notes.length + this.open.size
  }

  private push(midi: number, onTime: number, offTime: number): void {
    this.notes.push({
      midi,
      startMs: onTime - (this.firstOn ?? onTime),
      durMs: Math.max(0, offTime - onTime),
    })
  }
}
