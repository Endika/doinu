/**
 * Memory (Simón) mode: the app plays a growing sequence of notes and the child
 * repeats it. Each successful round APPENDS one new note and replays the longer
 * sequence; the score is the longest sequence correctly echoed. A wrong press
 * ends the round (then the app restarts from length 1, keeping the best).
 *
 * Pure logic only — no DOM, no audio, no randomness at module level. The note
 * picker is injected (random in the app, deterministic in tests).
 */

/** White keys of one octave around middle C — the note bank for memory. */
export const MEMORY_NOTES = [60, 62, 64, 65, 67, 69, 71, 72]

export class MemoryGame {
  private readonly pickNote: () => number
  private seq: number[] = []
  private ptr = 0
  private best = 0

  constructor(pickNote: () => number) {
    this.pickNote = pickNote
  }

  /** The current target sequence (read-only view). */
  get sequence(): readonly number[] {
    return this.seq
  }

  /** Best completed sequence length so far. */
  get longest(): number {
    return this.best
  }

  /** Append one freshly picked note and reset the player's pointer. */
  startRound(): void {
    this.seq.push(this.pickNote())
    this.ptr = 0
  }

  /**
   * Match one note-ON pitch against the sequence in order.
   * 'wrong'    — wrong note (round lost).
   * 'complete' — right note that finishes the sequence (round won; updates longest).
   * 'correct'  — right note, more to go.
   */
  press(midi: number): 'correct' | 'wrong' | 'complete' {
    if (midi !== this.seq[this.ptr]) return 'wrong'
    this.ptr++
    if (this.ptr >= this.seq.length) {
      this.best = Math.max(this.best, this.seq.length)
      return 'complete'
    }
    return 'correct'
  }

  /** Clear the sequence and pointer, KEEPING the best length. */
  reset(): void {
    this.seq = []
    this.ptr = 0
  }
}
