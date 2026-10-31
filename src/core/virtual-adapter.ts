import { InputSource, type Capabilities, type InputAdapter } from './input-adapter'
import { InputEventType, type InputEvent } from './events'

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
 * bounding rect, so the hit-test gets the rect's CSS size, not the bitmap size
 * (`canvas.width` / `canvas.height`), which can differ after a resize. Which
 * key sits under a point is up to the `KeyHitTest` passed in.
 */

/**
 * Maps a point on the keys canvas (CSS pixels, relative to its top-left corner)
 * to the midi note drawn there, or null if no key is under it. The keyboard
 * renderer provides it, so the adapter never has to know the key layout.
 */
export type KeyHitTest = (x: number, y: number, width: number, height: number) => number | null

export class VirtualInputAdapter implements InputAdapter {
  capabilities: Capabilities = { polyphonic: true, source: InputSource.Virtual }
  private readonly hitTest: KeyHitTest
  private readonly canvasId: string
  private listeners: ((e: InputEvent) => void)[] = []
  private canvas: HTMLCanvasElement | null = null
  /** Map pointerId -> the midi it currently holds (multi-touch => chords). */
  private readonly held = new Map<number, number>()
  private attached = false
  private readonly onDown: (e: PointerEvent) => void
  private readonly onMove: (e: PointerEvent) => void
  private readonly onUp: (e: PointerEvent) => void

  constructor(hitTest: KeyHitTest, canvasId = 'keys') {
    this.hitTest = hitTest
    this.canvasId = canvasId
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
    return this.hitTest(x, y, rect.width, rect.height)
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
