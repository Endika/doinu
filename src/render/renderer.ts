import type { FrameState } from '../engine/engine'
import type { Target } from '../engine/chart'
import { noteFromMidi } from '../core/note'
import { colorForPitchClass } from './colors'

export interface GeometryConfig {
  hitLineY: number
  pxPerMs: number
}

/** Lowest/highest MIDI notes laid out across the canvas width. */
export const MIDI_LOW = 36
export const MIDI_HIGH = 96

/**
 * Vertical pixel position of a falling note's leading edge.
 * At startMs === nowMs the note sits exactly on the hit line; future notes
 * (startMs > nowMs) are above it (smaller y), past notes below (larger y).
 */
export function noteY(
  target: { startMs: number },
  nowMs: number,
  cfg: GeometryConfig,
): number {
  return cfg.hitLineY - (target.startMs - nowMs) * cfg.pxPerMs
}

/**
 * Lead-in time: how long a note takes to fall from the top of the stage to the
 * hit line. Tying the lead-in to the speed makes the first note enter exactly at
 * the top of the screen at song start, giving full reaction time.
 */
export function leadInMs(hitLineY: number, pxPerMs: number): number {
  return pxPerMs > 0 ? hitLineY / pxPerMs : 0
}

/**
 * The midi notes whose hit window is open at `nowMs` (i.e. the notes the learner
 * is expected to be playing right now). Drives the on-screen "press this" guide
 * and correct/wrong feedback.
 */
export function expectedNotesAt(
  targets: { midi: number; startMs: number }[],
  nowMs: number,
  windowMs: number,
): Set<number> {
  const out = new Set<number>()
  for (const t of targets) {
    if (Math.abs(nowMs - t.startMs) <= windowMs) out.add(t.midi)
  }
  return out
}

/** Horizontal position (0..1) of a midi across the configured piano range. */
export function midiToFraction(midi: number, low = MIDI_LOW, high = MIDI_HIGH): number {
  if (high <= low) return 0
  const clamped = Math.min(Math.max(midi, low), high)
  return (clamped - low) / (high - low)
}

/** Bar pixel height for a note duration. */
export function barHeight(durMs: number, pxPerMs: number): number {
  return Math.max(2, durMs * pxPerMs)
}

interface BarRect {
  x: number
  width: number
}

/** Pure x/width layout for a note bar given the canvas width. */
export function barRect(midi: number, canvasWidth: number, low = MIDI_LOW, high = MIDI_HIGH): BarRect {
  const span = high - low
  const slot = span > 0 ? canvasWidth / (span + 1) : canvasWidth
  const width = Math.max(2, slot * 0.8)
  const x = midiToFraction(midi, low, high) * (canvasWidth - slot) + (slot - width) / 2
  return { x, width }
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D | null
  private readonly cfg: GeometryConfig
  private rafId: number | null = null

  constructor(ctx: CanvasRenderingContext2D | null, cfg: GeometryConfig) {
    this.ctx = ctx
    this.cfg = cfg
  }

  start(getFrame: () => FrameState): void {
    if (this.rafId !== null) return
    const loop = (): void => {
      this.draw(getFrame())
      this.rafId = requestAnimationFrame(loop)
    }
    this.rafId = requestAnimationFrame(loop)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  draw(frame: FrameState): void {
    const ctx = this.ctx
    if (!ctx) return

    const canvas = ctx.canvas
    const w = canvas.width
    const h = canvas.height

    ctx.clearRect(0, 0, w, h)

    for (const t of frame.targets) {
      this.drawBar(ctx, t, frame.nowMs, w, h)
    }

    this.drawHitLine(ctx, w)
  }

  private drawBar(
    ctx: CanvasRenderingContext2D,
    t: Target,
    nowMs: number,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    const height = barHeight(t.durMs, this.cfg.pxPerMs)
    const bottomY = noteY(t, nowMs, this.cfg)
    const topY = bottomY - height

    // Skip targets entirely outside the visible viewport.
    if (bottomY < 0 || topY > canvasHeight) return

    const { x, width } = barRect(t.midi, canvasWidth)
    const color = colorForPitchClass(noteFromMidi(t.midi).pitchClass)

    ctx.save()
    // Hand differentiation: right hand full opacity, left hand dimmed.
    ctx.globalAlpha = t.hand === 'R' ? 0.95 : 0.6
    ctx.fillStyle = color
    this.roundedRect(ctx, x, topY, width, height, Math.min(6, width / 2))
    ctx.fill()
    // Left hand gets a thin outline to further distinguish it.
    if (t.hand === 'L') {
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 2
      ctx.strokeStyle = color
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawHitLine(ctx: CanvasRenderingContext2D, canvasWidth: number): void {
    ctx.save()
    ctx.strokeStyle = '#ffffff'
    ctx.globalAlpha = 0.8
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, this.cfg.hitLineY)
    ctx.lineTo(canvasWidth, this.cfg.hitLineY)
    ctx.stroke()
    ctx.restore()
  }

  private roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
  ): void {
    const r = Math.max(0, Math.min(radius, width / 2, height / 2))
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + width, y, x + width, y + height, r)
    ctx.arcTo(x + width, y + height, x, y + height, r)
    ctx.arcTo(x, y + height, x, y, r)
    ctx.arcTo(x, y, x + width, y, r)
    ctx.closePath()
  }
}
