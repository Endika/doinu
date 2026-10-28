import { describe, it, expect, afterEach, vi } from 'vitest'
import { noteForKeyPoint, VirtualInputAdapter } from '../src/core/virtual-adapter'

// Same white-key count as the renderer layout for 36..96: five octaves + C7.
const W = 1080
const H = 200
const WW = W / 36

describe('virtual keyboard hit-test (2D, matches what is drawn)', () => {
  const blackCentre = WW - 0.3 * WW // inside the C# black key column

  it('hits the black key inside its drawn region (top 60%)', () => {
    expect(noteForKeyPoint(blackCentre, H * 0.2, W, H)).toBe(37)
  })

  it('hits the white key below the black key (bottom band)', () => {
    // The black key only spans the top 60%; below it the white key continues.
    expect(noteForKeyPoint(blackCentre, H * 0.9, W, H)).toBe(36)
  })

  it('hits the white key top area away from black columns', () => {
    expect(noteForKeyPoint(WW * 1.6, H * 0.2, W, H)).toBe(38)
  })

  it('returns null outside the keyboard', () => {
    expect(noteForKeyPoint(-1, H * 0.2, W, H)).toBeNull()
    expect(noteForKeyPoint(W, H * 0.2, W, H)).toBeNull()
    expect(noteForKeyPoint(WW / 2, H + 1, W, H)).toBeNull()
  })
})

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

async function startAdapter(canvas: ReturnType<typeof fakeCanvas>) {
  vi.stubGlobal('document', { getElementById: () => canvas })
  const adapter = new VirtualInputAdapter()
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
