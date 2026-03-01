import * as NodePath from "node:path";

import { SortedMap } from "./sorted-map.ts";
import { asArray, isNullish } from "./types.ts";

type RecursiveRecord<K extends PropertyKey, V> = { [key in K]: V | RecursiveRecord<K, V> };
type ResolveResult<T> = { tree: PathTree<T>; name: string };

export class PathTree<T> implements Map<string, T | PathTree<T>> {
  readonly [Symbol.toStringTag] = "PathTree";

  readonly #entries = new SortedMap<string, T | PathTree<T>>();

  constructor(iterable?: Iterable<readonly [string, T | PathTree<T>]>) {
    if (iterable) {
      for (const [k, v] of iterable) {
        this.set(k, v);
      }
    }
  }

  get size(): number {
    return this.#entries.size;
  }

  clear(): void {
    this.#entries.clear();
  }

  has(key: string | string[]): boolean {
    const resolved = this.#resolve(key, false);
    return resolved != null && resolved.tree.#entries.has(resolved.name);
  }

  get(key: string | string[]): T | PathTree<T> | undefined {
    const resolved = this.#resolve(key, false);
    if (!resolved) {
      return undefined;
    } else if (resolved.name === ".") {
      return resolved.tree;
    } else {
      return resolved.tree.#entries.get(resolved.name);
    }
  }

  set(key: string | string[], value: T | PathTree<T>): this {
    const resolved = this.#resolve(key, true);
    resolved.tree.#entries.set(resolved.name, value);
    return this;
  }

  delete(key: string | string[]): boolean {
    const resolved = this.#resolve(key, true);
    return resolved != null && resolved.tree.#entries.delete(resolved.name);
  }

  move(src: string, dst: string): boolean {
    const srcRes = this.#resolve(src, false);
    if (!srcRes) return false;

    const srcValue = srcRes.tree.#entries.get(srcRes.name);
    if (srcValue === undefined) return false;

    const dstRes = this.#resolve(dst, true);

    if (srcRes.name === "." || dstRes.name === ".") {
      throw new Error("TODO");
    }

    if (srcRes.tree !== dstRes.tree || srcRes.name !== dstRes.name) {
      dstRes.tree.#entries.set(dstRes.name, srcValue);
      srcRes.tree.#entries.delete(srcRes.name);
    }
    return true;
  }

  entries(): MapIterator<[string, T | PathTree<T>]> {
    return this.#entries.entries();
  }

  keys(): MapIterator<string> {
    return this.#entries.keys();
  }

  values(): MapIterator<T | PathTree<T>> {
    return this.#entries.values();
  }

  forEach(
    callback: (value: T | PathTree<T>, key: string, map: PathTree<T>) => void,
    thisArg?: any,
  ): void {
    for (const entry of this.#entries) {
      callback.call(thisArg, entry[1], entry[0], this);
    }
  }

  toDeepObject(options?: {
    dst?: RecursiveRecord<string, T>;
    visited?: Map<PathTree<T>, RecursiveRecord<string, T>>;
  }): RecursiveRecord<string, T> {
    const dst = options?.dst ?? Object.create(null);
    const visited = options?.visited ?? new Map();
    visited.set(this, dst);

    for (const [k, v] of this.#entries) {
      if (v instanceof PathTree) {
        let child = visited.get(v);
        if (isNullish(child)) {
          child = v.toDeepObject({ visited });
        }
        dst[k] = child;
      } else {
        dst[k] = v;
      }
    }
    return dst;
  }

  toFlatEntries(options?: {
    prefix?: string;
    dst?: [string, T][];
    visited?: Set<PathTree<T>>;
  }): [string, T][] {
    // TODO: Error on aliased/looping trees?
    const prefix = options?.prefix ?? "";
    const dst = options?.dst ?? [];
    const visited = options?.visited ?? new Set();

    if (visited.has(this)) {
      throw new Error("Cyclic tree detected");
    }
    visited.add(this);

    for (const [k, v] of this.#entries) {
      const path = prefix ? prefix + "/" + k : k;
      if (v instanceof PathTree) {
        v.toFlatEntries({ prefix: path, dst, visited });
      } else {
        dst.push([path, v]);
      }
    }
    return dst;
  }

  toFlatObject(options?: {
    prefix?: string;
    dst?: Record<string, T>;
    visited?: Set<PathTree<T>>;
  }): Record<string, T> {
    const prefix = options?.prefix ?? "";
    const dst = options?.dst ?? Object.create(null);
    const visited = options?.visited ?? new Set();

    if (visited.has(this)) {
      throw new Error("Cyclic tree detected");
    }
    visited.add(this);

    for (const [k, v] of this.#entries) {
      const path = prefix ? prefix + "/" + k : k;
      if (v instanceof PathTree) {
        v.toFlatObject({ prefix: path, dst, visited });
      } else {
        dst[path] = v;
      }
    }
    return dst;
  }

  [Symbol.iterator](): MapIterator<[string, T | PathTree<T>]> {
    return this.entries();
  }

  #resolve(key: string | string[], mkdirs: false): ResolveResult<T> | null;
  #resolve(key: string | string[], mkdirs: true): ResolveResult<T>;
  #resolve(key: string | string[], mkdirs: boolean): ResolveResult<T> | null {
    // Explicit "/" to avoid using process.cwd.
    key = NodePath.posix.resolve("/", ...asArray(key));

    // oxlint-disable-next-line no-this-alias
    let tree: PathTree<T> = this;

    const segments = key.split("/").filter((s) => s && s !== "." && s !== "..");
    const name = segments.pop() ?? ".";

    for (const segment of segments) {
      let value = tree.#entries.get(segment);
      if (value instanceof PathTree) {
        tree = value;
      } else if (mkdirs) {
        const next = new PathTree<T>();
        tree.#entries.set(segment, next);
        tree = next;
      } else {
        return null;
      }
    }

    return { tree, name };
  }
}
