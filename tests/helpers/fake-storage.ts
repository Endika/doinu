import type { KeyValueStorage } from '../../src/progress/metrics-store'

export class FakeStorage implements KeyValueStorage {
  private map = new Map<string, string>()
  getItem(k: string): string | null {
    return this.map.has(k) ? this.map.get(k)! : null
  }
  setItem(k: string, v: string): void {
    this.map.set(k, v)
  }
}
