/** Minimal storage seam (matches the Web Storage API subset we use). */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Read a JSON array from storage. This is a read path: missing data, corrupt data
 * (parse error or not an array) and a throwing storage all resolve to an empty
 * array, and none of those cases ever writes anything back — only a real save
 * overwrites what was there.
 */
export function readArray<T>(storage: KeyValueStorage, key: string): T[] {
  let raw: string | null
  try {
    raw = storage.getItem(key)
  } catch {
    return []
  }
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

/** Write JSON to storage, reporting failure instead of throwing or pretending it saved. */
export function writeArray<T>(storage: KeyValueStorage, key: string, items: T[]): boolean {
  try {
    storage.setItem(key, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}
