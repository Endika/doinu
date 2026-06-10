/**
 * "Find the note" mode: the app lights ONE target note and the child finds and
 * presses it. Each correct press advances to a fresh target until `total` are
 * found; wrong presses count against accuracy but leave the target unchanged.
 *
 * Pure logic only — no DOM, no audio, no randomness at module level. The target
 * picker is injected (random in the app, deterministic in tests). Find-time (ms)
 * is measured by the controller, not here.
 */

/** White keys of one octave around middle C — the note bank for find-the-note. */
export const NOTE_FIND_NOTES = [60, 62, 64, 65, 67, 69, 71, 72]

export class NoteFindGame {
  private readonly pickTarget: () => number
  private readonly total: number
  private cur: number
  private hitCount = 0
  private wrongCount = 0

  constructor(pickTarget: () => number, total?: number) {
    this.pickTarget = pickTarget
    this.total = total ?? 8
    this.cur = pickTarget()
  }

  /** The note the child must currently find. */
  get target(): number {
    return this.cur
  }

  /** True once `total` targets have been found. */
  get done(): boolean {
    return this.hitCount >= this.total
  }

  /** Number of targets found so far. */
  get hits(): number {
    return this.hitCount
  }

  /** Number of wrong presses so far. */
  get wrongs(): number {
    return this.wrongCount
  }

  /**
   * Match one note-ON pitch against the current target.
   * 'correct' — hit the target (advances to the next target unless done).
   * 'wrong'   — any other key (counts against accuracy, target unchanged).
   */
  press(midi: number): 'correct' | 'wrong' {
    if (midi === this.cur) {
      this.hitCount++
      if (!this.done) this.cur = this.pickTarget()
      return 'correct'
    }
    this.wrongCount++
    return 'wrong'
  }

  /** Share of presses that hit the target; 1 before any press. */
  accuracy(): number {
    const presses = this.hitCount + this.wrongCount
    return presses === 0 ? 1 : this.hitCount / presses
  }
}
