import { InputSource, type Capabilities, type InputAdapter } from './input-adapter'
import { InputEventType, type InputEvent } from './events'
import { keyRect } from '../render/keyboard'

/**
 * The tappable on-screen keyboard.
 *
 * The piano keyboard below the stage is drawn by `Keyboard` but has no input
 * handler; this adapter gives it one. A tap/drag on the keys canvas turns into
 * the same note on/off stream a MIDI keyboard or mic would produce, so every
 * mode (lessons, echoes, free play, chords — multi-touch is polyphonic) works
 * with no physical instrument at all.
 *
 * Layout note: pointer coordinates are CSS pixels relative to the canvas's
 * bounding rect, so hit-testing uses the rect's CSS size, not the bitmap size
 * (`canvas.width` / `canvas.height`), which can differ after a resize.
 */

export const VIRTUAL_KEY_LOW = 36
export const VIRTUAL_KEY_HIGH = 96

/**
 * The midi note under a 2D pointer position on the drawn keyboard.
 *
 * Black keys are drawn only across the TOP 60% of the keyboard height (`Keyboard`
 * paints them at `h * 0.6`); a tap in the bottom band of a black-key column sits
 * on the white key that continues underneath. Area-based preference keeps black
 * keys winning inside their own visual region while never stealing taps below.
 */
export function noteForKeyPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  midiLow = VIRTUAL_KEY_LOW,
  midiHigh = VIRTUAL_KEY_HIGH,
): number | null {
  let best: { midi: number; area: number } | null = null
  for (let midi = midiLow; midi <= midiHigh; midi++) {
    const rect = keyRect(midi, width, midiLow, midiHigh)
    if (!rect) continue
    if (x < rect.x || x >= rect.x + rect.width) continue
    const keyHeight = rect.isBlack ? height * 0.6 : height
    if (y < 0 || y >= keyHeight) continue
    const area = rect.width * keyHeight
    if (!best || area < best.area) best = { midi, area }
  }
  return best ? best.midi : null
}

export class VirtualInputAdapter implements InputAdapter {
  capabilities: Capabilities = { polyphonic: true, source: InputSource.Virtual }
  private readonly low: number
  private readonly high: number
  private readonly canvasId: string
  private listeners: ((e: InputEvent) => void)[] = []
  private canvas: HTMLCanvasElement | null = null
  /** Map pointerId -> the midi it currently holds (multi-touch => chords). */
  private readonly held = new Map<number, number>()
  private attached = false
  private readonly onDown: (e: PointerEvent) => void
  private readonly onMove: (e: PointerEvent) => void
  private readonly onUp: (e: PointerEvent) => void

  constructor(canvasId = 'keys', midiLow = VIRTUAL_KEY_LOW, midiHigh = VIRTUAL_KEY_HIGH) {
    this.canvasId = canvasId
    this.low = midiLow
    this.high = midiHigh
    this.onDown = (e: PointerEvent) => this.pointerDown(e)
    this.onMove = (e: PointerEvent) => this.pointerMove(e)
    this.onUp = (e: PointerEvent) => this.pointerUp(e)
  }

  onEvent(cb: (e: InputEvent) => void): void {
    this.listeners.push(cb)
  }

  start(): Promise<void> {
    const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement | null
    if (!canvas) return Promise.resolve()
    this.canvas = canvas
    if (!this.attached) {
      this.attached = true
      // A tap must never scroll/zoom the page underneath.
      canvas.style.touchAction = 'none'
      canvas.addEventListener('pointerdown', this.onDown)
      canvas.addEventListener('pointermove', this.onMove)
      canvas.addEventListener('pointerup', this.onUp)
      canvas.addEventListener('pointercancel', this.onUp)
    }
    return Promise.resolve()
  }

  stop(): void {
    const canvas = this.canvas
    if (canvas && this.attached) {
      this.attached = false
      canvas.removeEventListener('pointerdown', this.onDown)
      canvas.removeEventListener('pointermove', this.onMove)
      canvas.removeEventListener('pointerup', this.onUp)
      canvas.removeEventListener('pointercancel', this.onUp)
    }
    // Release anything still held so no note keeps sounding after stop().
    for (const note of this.held.values()) this.emit(note, InputEventType.Off)
    this.held.clear()
  }

  private pointerDown(e: PointerEvent): void {
    e.preventDefault()
    const note = this.noteAt(e)
    if (note === null) return
    this.held.set(e.pointerId, note)
    if (this.canvas) {
      try {
        this.canvas.setPointerCapture(e.pointerId)
      } catch {
        /* capture is best-effort */
      }
    }
    this.emit(note, InputEventType.On)
  }

  private pointerMove(e: PointerEvent): void {
    // Glissando: sliding between keys stops the old note and starts the new one.
    const previous = this.held.get(e.pointerId)
    if (previous === undefined) return
    const note = this.noteAt(e)
    if (note === null || note === previous) return
    this.held.set(e.pointerId, note)
    this.emit(previous, InputEventType.Off)
    this.emit(note, InputEventType.On)
  }

  private pointerUp(e: PointerEvent): void {
    e.preventDefault()
    const note = this.held.get(e.pointerId)
    if (note === undefined) return
    this.held.delete(e.pointerId)
    this.emit(note, InputEventType.Off)
  }

  private noteAt(e: PointerEvent): number | null {
    const canvas = this.canvas
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    return noteForKeyPoint(x, y, rect.width, rect.height, this.low, this.high)
  }

  private emit(note: number, type: InputEvent['type']): void {
    const event: InputEvent = {
      note,
      type,
      time: performance.now(),
      velocity: type === InputEventType.On ? 100 : 0,
    }
    for (const cb of this.listeners) cb(event)
  }
}
