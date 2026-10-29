import { describe, it, expect } from 'vitest'
import { Renderer } from '../src/render/renderer'
import { Hand, type Target } from '../src/engine/chart'

interface Stub {
  ctx: CanvasRenderingContext2D
  texts: { text: string; x: number; y: number }[]
}

/**
 * Minimal 2D context: enough for `Renderer.draw` to run, plus a record of every
 * `fillText` call so we can assert on the finger numbers.
 */
function stubContext(width = 800, height = 600): Stub {
  const texts: { text: string; x: number; y: number }[] = []
  const ctx = {
    canvas: { width, height },
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineJoin: 'round',
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    clearRect: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    arcTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
    fillRect: () => {},
    fillText: (text: string, x: number, y: number) => texts.push({ text, x, y }),
    strokeText: () => {},
  } as unknown as CanvasRenderingContext2D
  return { ctx, texts }
}

function target(over: Partial<Target>): Target {
  return {
    id: 't',
    midi: 60,
    startMs: 0,
    durMs: 500,
    hand: Hand.Right,
    ...over,
  }
}

describe('renderer: finger labels', () => {
  it('draws the finger number on the bar', () => {
    const { ctx, texts } = stubContext()
    const renderer = new Renderer(ctx, { hitLineY: 600, pxPerMs: 0.2 })
    renderer.draw({ nowMs: 0, targets: [target({ finger: 3 })], activeNotes: new Set() })
    expect(texts.map((t) => t.text)).toEqual(['3'])
  })

  it('draws nothing when a note has no finger', () => {
    const { ctx, texts } = stubContext()
    const renderer = new Renderer(ctx, { hitLineY: 600, pxPerMs: 0.2 })
    renderer.draw({ nowMs: 0, targets: [target({})], activeNotes: new Set() })
    expect(texts).toEqual([])
  })

  it('labels every visible note, left hand included', () => {
    const { ctx, texts } = stubContext()
    const renderer = new Renderer(ctx, { hitLineY: 600, pxPerMs: 0.2 })
    renderer.draw({
      nowMs: 0,
      targets: [
        target({ id: 'a', midi: 48, finger: 5, hand: Hand.Left }),
        target({ id: 'b', midi: 60, finger: 1, startMs: 500 }),
      ],
      activeNotes: new Set(),
    })
    expect(texts.map((t) => t.text).sort()).toEqual(['1', '5'])
  })
})
