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

/** Lowest and highest midi note on the drawn keyboard (C2..C7). */
export const KEYBOARD_LOW = 36
export const KEYBOARD_HIGH = 96

/** Black keys are drawn at this fraction of a white key's width and height. */
const BLACK_KEY_WIDTH = 0.6
const BLACK_KEY_HEIGHT = 0.6

const DEFAULT_CONFIG: KeyboardConfig = { midiLow: KEYBOARD_LOW, midiHigh: KEYBOARD_HIGH }

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

export interface KeyRect {
  x: number
  width: number
  isBlack: boolean
}

/**
 * On-screen rectangle of a piano key, using the EXACT layout `Keyboard.draw`
 * paints: white keys laid edge-to-edge, black keys overlaid at 60% width between
 * their neighbours. Shared with the falling-notes renderer so every note lines up
 * over the real key it belongs to (not an even chromatic slot). Null if out of range.
 */
export function keyRect(
  midi: number,
  canvasWidth: number,
  low = DEFAULT_CONFIG.midiLow,
  high = DEFAULT_CONFIG.midiHigh,
): KeyRect | null {
  if (midi < low || midi > high) return null
  const whites = whiteKeys(low, high)
  if (whites.length === 0) return null
  const whiteWidth = canvasWidth / whites.length

  if (!isBlackKey(midi)) {
    const w = whites.find((k) => k.midi === midi)
    if (!w) return null
    return { x: w.index * whiteWidth, width: whiteWidth, isBlack: false }
  }
  // A black key sits between the white key below it (midi-1) and the next.
  const leftWhite = whites.find((k) => k.midi === midi - 1)
  if (!leftWhite) return null
  const blackWidth = whiteWidth * BLACK_KEY_WIDTH
  return {
    x: (leftWhite.index + 1) * whiteWidth - blackWidth / 2,
    width: blackWidth,
    isBlack: true,
  }
}

/**
 * The midi note under a 2D point on the drawn keyboard, or null if the point
 * misses every key. Uses `keyRect` and the same black-key height `Keyboard.draw`
 * paints, so tap targets always match the drawn keys.
 *
 * Black keys only cover the top part of the keyboard; a point in the bottom band
 * of a black-key column sits on the white key that continues underneath. Where
 * keys overlap, the smaller (black) key wins.
 */
export function noteForKeyPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  low = DEFAULT_CONFIG.midiLow,
  high = DEFAULT_CONFIG.midiHigh,
): number | null {
  let best: { midi: number; area: number } | null = null
  for (let midi = low; midi <= high; midi++) {
    const rect = keyRect(midi, width, low, high)
    if (!rect) continue
    if (x < rect.x || x >= rect.x + rect.width) continue
    const keyHeight = rect.isBlack ? height * BLACK_KEY_HEIGHT : height
    if (y < 0 || y >= keyHeight) continue
    const area = rect.width * keyHeight
    if (!best || area < best.area) best = { midi, area }
  }
  return best ? best.midi : null
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
    const blackWidth = whiteWidth * BLACK_KEY_WIDTH
    const blackHeight = h * BLACK_KEY_HEIGHT

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
