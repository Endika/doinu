import { describe, it, expect, afterEach, vi } from 'vitest'
import { VirtualInputAdapter } from '../src/core/virtual-adapter'
import { noteForKeyPoint } from '../src/render/keyboard'

// Same white-key count as the renderer layout for 36..96: five octaves + C7.
const W = 1080
const H = 200
const WW = W / 36

type Handler = (e: PointerEvent) => void

/** A minimal keys canvas: CSS box `cssW` x `cssH`, bitmap `bitmapW` x `bitmapH`. */
function fakeCanvas(cssW: number, cssH: number, bitmapW: number, bitmapH: number) {
  const handlers = new Map<string, Handler>()
  return {
    width: bitmapW,
    height: bitmapH,
    style: {} as Record<string, string>,
    addEventListener: (type: string, h: Handler) => handlers.set(type, h),
    removeEventListener: (type: string) => handlers.delete(type),
    getBoundingClientRect: () => ({ left: 10, top: 20, width: cssW, height: cssH }),
    setPointerCapture: () => {},
    fire(type: string, pointerId: number, x: number, y: number) {
      const e = { pointerId, clientX: 10 + x, clientY: 20 + y, preventDefault: () => {} }
      handlers.get(type)?.(e as unknown as PointerEvent)
    },
  }
}

async function startAdapter(
  canvas: ReturnType<typeof fakeCanvas>,
  hitTest: ConstructorParameters<typeof VirtualInputAdapter>[0] = noteForKeyPoint,
) {
  vi.stubGlobal('document', { getElementById: () => canvas })
  const adapter = new VirtualInputAdapter(hitTest)
  const got: string[] = []
  adapter.onEvent((e) => got.push(`${e.type}:${e.note}`))
  await adapter.start()
  return { adapter, got }
}

describe('virtual keyboard adapter', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('hit-tests in CSS pixels even when the bitmap size differs', async () => {
    // Bitmap at 2x the CSS box (e.g. sized before layout settled or after a resize).
    const canvas = fakeCanvas(W, H, W * 2, H * 2)
    const { got } = await startAdapter(canvas)
    // Centre of the third white key (E, 40) in CSS pixels, low on the key.
    canvas.fire('pointerdown', 1, WW * 2.5, H * 0.9)
    canvas.fire('pointerup', 1, WW * 2.5, H * 0.9)
    expect(got).toEqual(['on:40', 'off:40'])
  })

  it('asks the injected hit-test which key is under the pointer', async () => {
    const canvas = fakeCanvas(W, H, W * 2, H * 2)
    const calls: number[][] = []
    const { got } = await startAdapter(canvas, (x, y, width, height) => {
      calls.push([x, y, width, height])
      return 61
    })
    canvas.fire('pointerdown', 1, 5, 7)
    expect(calls).toEqual([[5, 7, W, H]])
    expect(got).toEqual(['on:61'])
  })

  it('ignores a press that misses every key', async () => {
    const canvas = fakeCanvas(W, H, W, H)
    const { got } = await startAdapter(canvas, () => null)
    canvas.fire('pointerdown', 1, 5, 7)
    canvas.fire('pointerup', 1, 5, 7)
    expect(got).toEqual([])
  })

  it('stop() sends a note-off for every note still held', async () => {
    const canvas = fakeCanvas(W, H, W, H)
    const { adapter, got } = await startAdapter(canvas)
    canvas.fire('pointerdown', 1, WW / 2, H * 0.9) // C (36)
    canvas.fire('pointerdown', 2, WW * 2.5, H * 0.9) // E (40)
    adapter.stop()
    expect(got).toEqual(['on:36', 'on:40', 'off:36', 'off:40'])
    // Nothing is left held, and the listeners are gone.
    canvas.fire('pointerup', 1, WW / 2, H * 0.9)
    adapter.stop()
    expect(got).toHaveLength(4)
  })
})
