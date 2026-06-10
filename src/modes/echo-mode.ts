/**
 * Echo (call-and-response) mode: the app plays a short phrase, then the child
 * repeats it on the keyboard. Timing does NOT matter — only the sequence of
 * notes — so matching is sequence-based, not the time-windowed falling-notes
 * matcher.
 */

export interface Phrase {
  id: string
  title: string
  notes: number[]
  noteDurMs: number
}

/** A few short phrases around middle C, simple enough for young learners. */
export const ECHO_PHRASES: Phrase[] = [
  { id: 'echo-1', title: 'Up Three', notes: [60, 62, 64], noteDurMs: 450 },
  { id: 'echo-2', title: 'Down Three', notes: [64, 62, 60], noteDurMs: 450 },
  { id: 'echo-3', title: 'Little Tune', notes: [60, 64, 62, 60], noteDurMs: 450 },
]

/**
 * Sequence matcher for echo: feed the learner's note-ON pitches in order.
 * Advances a pointer on a correct next-note; a wrong press counts against the
 * score but does NOT advance. Done when every expected note has been matched in
 * order.
 */
export class SequenceMatcher {
  private readonly expected: number[]
  private idx = 0
  private wrongCount = 0

  constructor(expected: number[]) {
    this.expected = expected.slice()
  }

  /**
   * Feed one note-ON pitch. If not done and it matches the next expected note,
   * advance and return 'correct'. Otherwise (wrong pitch, or already done)
   * count a wrong and return 'wrong'.
   */
  press(midi: number): 'correct' | 'wrong' {
    if (!this.done && midi === this.expected[this.idx]) {
      this.idx++
      return 'correct'
    }
    this.wrongCount++
    return 'wrong'
  }

  /** How many notes matched so far. */
  get index(): number {
    return this.idx
  }

  /** True once every expected note has been matched in order. */
  get done(): boolean {
    return this.idx >= this.expected.length
  }

  /** Number of wrong presses. */
  get wrongs(): number {
    return this.wrongCount
  }

  /**
   * Cleanliness of the echo: 1.0 when flawless. If there is nothing to echo,
   * defined as 1. Otherwise expected.length / (expected.length + wrongs).
   */
  accuracy(): number {
    if (this.expected.length === 0) return 1
    return this.expected.length / (this.expected.length + this.wrongCount)
  }
}
