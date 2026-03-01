import { assertNotNull } from "./types.ts";

export class SortedMap<K, V> implements Map<K, V> {
  readonly [Symbol.toStringTag] = "SortedMap";

  readonly #entries: [K, V][];

  constructor(iterable?: Iterable<readonly [K, V]>) {
    const entries = iterable ? Array.from(iterable, (e) => [e[0], e[1]] as [K, V]) : [];
    entries.sort((a, b) => cmp(a[0], b[0]));
    this.#entries = entries;
  }

  get size(): number {
    return this.#entries.length;
  }

  clear(): void {
    this.#entries.length = 0;
  }

  has(key: K): boolean {
    const entry = this.#entries[this.#indexOf(key)];
    return entry != null && entry[0] === key;
  }

  get(key: K): V | undefined {
    const entry = this.#entries[this.#indexOf(key)];
    return entry != null && entry[0] === key ? entry[1] : undefined;
  }

  set(key: K, value: V): this {
    const i = this.#indexOf(key);
    const entry = this.#entries[i];
    if (entry != null && entry[0] === key) {
      entry[1] = value;
    } else {
      this.#entries.splice(i, 0, [key, value]);
    }
    return this;
  }

  delete(key: K): boolean {
    const i = this.#indexOf(key);
    const entry = this.#entries[i];
    if (entry != null && entry[0] === key) {
      this.#entries.splice(i, 1);
      return true;
    } else {
      return false;
    }
  }

  entries(): MapIterator<[K, V]> {
    return this.#entries.values();
  }

  keys(): MapIterator<K> {
    return this.#entries.values().map((e) => e[0]);
  }

  values(): MapIterator<V> {
    return this.#entries.values().map((e) => e[1]);
  }

  forEach(callback: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    for (const entry of this.#entries) {
      callback.call(thisArg, entry[1], entry[0], this);
    }
  }

  [Symbol.iterator](): MapIterator<[K, V]> {
    return this.entries();
  }

  /**
   * Finds the index of the entry that would contain the requested key.
   */
  #indexOf(key: K): number {
    // Range is from lo (inclusive) to hi (exclusive).
    let lo = 0;
    let hi = this.#entries.length;
    while (lo < hi) {
      // The right shift truncates, so lo <= i && i < hi.
      const i = (hi + lo) >> 1;
      const curr = assertNotNull(assertNotNull(this.#entries[i])[0]);
      if (curr < key) {
        // lo <= i, so this reduces the range.
        lo = i + 1;
      } else if (curr > key) {
        // i < hi, so this reduces the range.
        hi = i;
      } else {
        return i;
      }
    }
    return lo;
  }
}

function cmp<T>(a: T, b: T) {
  if (a < b) return -1;
  if (a > b) return +1;
  return 0;
}
