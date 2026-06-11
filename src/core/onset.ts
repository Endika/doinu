/**
 * Amplitude-onset detector: turns a per-frame loudness (RMS) stream into "attack"
 * pulses. It fires once on a rising edge (a frame whose level jumps clearly above
 * the previous one and clears an absolute floor) and won't fire again until the
 * sound has released (dropped well below its peak). This lets a re-struck SAME
 * note count as a new note even without a clean silence between the two — which a
 * pure pitch-change tracker would miss.
 *
 * Pure and synchronous: feed one level per audio frame.
 */
export class OnsetDetector {
  private armed = true
  private peak = 0
  private prev = 0

  constructor(
    private readonly floor = 0.02, // absolute minimum loudness to count as a note
    private readonly riseRatio = 1.5, // a frame must exceed prev * this to be an attack
    private readonly releaseRatio = 0.5, // must fall below peak * this to re-arm
  ) {}

  /** Feed one frame's RMS; returns true exactly on an attack. */
  feed(level: number): boolean {
    const prev = this.prev
    this.prev = level

    if (!this.armed && level < this.peak * this.releaseRatio) {
      this.armed = true
    }
    if (this.armed && level >= this.floor && level > prev * this.riseRatio) {
      this.armed = false
      this.peak = level
      return true
    }
    if (!this.armed) this.peak = Math.max(this.peak, level)
    return false
  }
}
