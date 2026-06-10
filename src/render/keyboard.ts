import { noteFromMidi } from '../core/note'
import { colorForPitchClass } from './colors'

/** Pitch classes that correspond to black keys. */
const BLACK_PITCH_CLASSES = new Set<number>([1, 3, 6, 8, 10])

/** True if the given midi note is a black key. */
export function isBlackKey(midi: number): boolean {
  return BLACK_PITCH_CLASSES.has(((midi % 12) + 12) % 12)
}

export interface KeyboardConfig {
  midiLow: number
  midiHigh: number
}

const DEFAULT_CONFIG: KeyboardConfig = { midiLow: 36, midiHigh: 96 }

/** Inclusive list of midi notes in the configured range. */
export function midiRange(low: number, high: number): number[] {
  const out: number[] = []
  for (let m = low; m <= high; m++) out.push(m)
  return out
}

/** Number of white keys in the inclusive midi range. */
export function whiteKeyCount(low: number, high: number): number {
  let n = 0
  for (let m = low; m <= high; m++) if (!isBlackKey(m)) n++
  return n
}

interface WhiteKeyLayout {
  midi: number
  index: number
}

/** Ordered white keys with their positional index. */
export function whiteKeys(low: number, high: number): WhiteKeyLayout[] {
  const out: WhiteKeyLayout[] = []
  let index = 0
  for (let m = low; m <= high; m++) {
    if (!isBlackKey(m)) {
      out.push({ midi: m, index })
      index++
    }
  }
  return out
}

export class Keyboard {
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly cfg: KeyboardConfig

  constructor(ctx: CanvasRenderingContext2D | null, cfg: KeyboardConfig = DEFAULT_CONFIG) {
    this.ctx = ctx
    this.cfg = cfg
  }

  /**
   * @param activeNotes   midi notes currently held down.
   * @param expectedNotes midi notes whose hit window is open right now (the keys
   *                      the learner should press). Drives correct/wrong/guide feedback.
   */
  draw(activeNotes: Set<number>, expectedNotes: Set<number> = new Set()): void {
    const ctx = this.ctx
    if (!ctx) return

    const canvas = ctx.canvas
    const w = canvas.width
    const h = canvas.height
    const { midiLow, midiHigh } = this.cfg

    ctx.clearRect(0, 0, w, h)

    const whites = whiteKeys(midiLow, midiHigh)
    const whiteCount = whites.length
    if (whiteCount === 0) return

    const whiteWidth = w / whiteCount
    const blackWidth = whiteWidth * 0.6
    const blackHeight = h * 0.6

    // White keys first so black keys overlay them.
    for (const { midi, index } of whites) {
      const x = index * whiteWidth
      this.drawKey(ctx, midi, x, 0, whiteWidth, h, activeNotes, expectedNotes, false)
    }

    // Black keys overlay between their neighbouring white keys.
    const whiteIndexByMidi = new Map<number, number>()
    for (const { midi, index } of whites) whiteIndexByMidi.set(midi, index)

    for (let m = midiLow; m <= midiHigh; m++) {
      if (!isBlackKey(m)) continue
      // A black key sits to the right of the white key below it (m - 1).
      const leftWhiteIndex = whiteIndexByMidi.get(m - 1)
      if (leftWhiteIndex === undefined) continue
      const x = (leftWhiteIndex + 1) * whiteWidth - blackWidth / 2
      this.drawKey(ctx, m, x, 0, blackWidth, blackHeight, activeNotes, expectedNotes, true)
    }
  }

  private drawKey(
    ctx: CanvasRenderingContext2D,
    midi: number,
    x: number,
    y: number,
    width: number,
    height: number,
    activeNotes: Set<number>,
    expectedNotes: Set<number>,
    black: boolean,
  ): void {
    const active = activeNotes.has(midi)
    const expected = expectedNotes.has(midi)
    const pitchColor = colorForPitchClass(noteFromMidi(midi).pitchClass)

    // Feedback resolution:
    //   correct  = pressed AND it was expected      → green
    //   wrong    = pressed while something else was expected → amber
    //   free     = pressed with nothing expected     → its pitch colour
    //   guide    = not pressed but expected ("press me") → its pitch colour
    let fill = black ? '#1a1a1a' : '#f5f5f5'
    let glow: string | null = null
    let alpha = 1
    if (active && expected) {
      fill = '#34d399'
      glow = '#34d399'
    } else if (active && expectedNotes.size > 0) {
      fill = '#f59e0b'
      glow = '#f59e0b'
    } else if (active) {
      fill = pitchColor
      glow = pitchColor
    } else if (expected) {
      fill = pitchColor
      glow = pitchColor
      alpha = 0.85
    }

    ctx.save()
    ctx.globalAlpha = alpha
    if (glow) {
      ctx.shadowColor = glow
      ctx.shadowBlur = 18
    }
    ctx.fillStyle = fill
    ctx.fillRect(x, y, width, height)

    ctx.shadowBlur = 0
    ctx.globalAlpha = 1
    ctx.lineWidth = 1
    ctx.strokeStyle = black ? '#000000' : '#999999'
    ctx.strokeRect(x, y, width, height)
    ctx.restore()
  }
}
