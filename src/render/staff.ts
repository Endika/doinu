/**
 * Minimal treble-staff renderer for the reading lessons: five lines, a clef hint,
 * and ONE note head at the position for a given pitch (with a ledger line for
 * middle C). The note head is a NEUTRAL colour on purpose — the child must read
 * the position, not match the pitch colour to a glowing key.
 *
 * `staffStep` is pure (testable without a canvas): diatonic steps above the
 * bottom staff line (E4 = 0). Naturals only — reading lessons use white keys.
 */

// Pitch class -> diatonic letter index (C=0..B=6); sharps map to their natural.
const LETTER_STEP = [0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 5, 6]

/** Diatonic steps above the bottom treble line (E4). C4 = -2 (middle C, ledger). */
export function staffStep(midi: number): number {
  const pc = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const diatonic = octave * 7 + LETTER_STEP[pc]
  return diatonic - (4 * 7 + 2) // relative to E4 = octave 4, letter E (index 2)
}

export class Staff {
  constructor(private readonly ctx: CanvasRenderingContext2D | null) {}

  /** Clear and draw the staff with one note head at `targetMidi`. */
  draw(targetMidi: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const W = ctx.canvas.width
    const H = ctx.canvas.height
    ctx.clearRect(0, 0, W, H)

    const gap = Math.min(H * 0.07, 46) // distance between adjacent staff lines
    const midY = H * 0.5
    const bottomLineY = midY + gap * 2 // five lines span midY-2gap .. midY+2gap
    const x0 = W * 0.18
    const x1 = W * 0.82
    const line = Math.max(2, gap * 0.06)

    ctx.strokeStyle = '#5b4b8a'
    ctx.lineWidth = line
    for (let i = 0; i < 5; i++) {
      const y = bottomLineY - i * gap
      ctx.beginPath()
      ctx.moveTo(x0, y)
      ctx.lineTo(x1, y)
      ctx.stroke()
    }

    // Treble-clef hint (decorative; font support varies but it is non-essential).
    ctx.fillStyle = '#5b4b8a'
    ctx.font = `${gap * 4}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('𝄞', x0 - gap * 0.2, midY)

    const step = staffStep(targetMidi)
    const noteX = (x0 + x1) / 2
    const noteY = bottomLineY - step * (gap / 2)

    // Ledger lines below the staff (middle C sits two steps below the bottom line).
    for (let s = -2; s >= step; s -= 2) {
      const y = bottomLineY - s * (gap / 2)
      ctx.beginPath()
      ctx.moveTo(noteX - gap * 0.95, y)
      ctx.lineTo(noteX + gap * 0.95, y)
      ctx.stroke()
    }

    // Neutral note head (no pitch colour — reading, not colour-matching).
    ctx.fillStyle = '#2a1f55'
    ctx.beginPath()
    ctx.ellipse(noteX, noteY, gap * 0.62, gap * 0.5, -0.35, 0, Math.PI * 2)
    ctx.fill()
  }
}
