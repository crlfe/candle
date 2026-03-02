import * as NodePath from "node:path";

import { SortedMap } from "./sorted-map.ts";
import { asArray, type RecursiveRecord } from "./types.ts";

export class PathMap<T> implements Map<string, T> {
  static fromObject<T>(
    obj: RecursiveRecord<string, T>,
    isValue?: (target: unknown) => target is T,
  ): PathMap<T> {
    isValue ??= (target: unknown): target is T => {
      if (typeof target !== "object") return true;

      const p = Object.getPrototypeOf(target);
      return p !== Object.prototype && p != null;
    };

    const root = new PathMap<T>();
    const stack: [PathMapNode<T>, Iterator<[string, T | RecursiveRecord<string, T>]>][] = [
      [root.#root, Object.entries(obj).values()],
    ];
    const visited = new Set([obj]);
    while (true) {
      const top = stack.at(-1);
      if (!top) {
        break;
      }

      const [dst, iter] = top;
      const result = iter.next();
      if (result.done) {
        stack.pop();
        continue;
      }

      const [k, v] = result.value;
      if (isValue(v)) {
        if (!k) {
          dst.value = v;
        } else {
          dst.map.set(k, v);
        }
      } else {
        if (visited.has(v)) {
          throw new TypeError("cyclic");
        }
        visited.add(v);

        if (!k) {
          stack.push([dst, Object.entries(v).values()]);
        } else {
          let child = dst.map.get(k);
          if (!(child instanceof PathMapNode)) {
            let childNode = new PathMapNode<T>();
            childNode.value = child;
            dst.map.set(k, childNode);
            child = childNode;
          }
          stack.push([child, Object.entries(v).values()]);
        }
      }
    }
    return root;
  }

  readonly [Symbol.toStringTag] = "PathMap";

  #root = new PathMapNode<T>();

  constructor(iterable?: Iterable<[string, T]>) {
    if (iterable) {
      for (const [k, v] of iterable) {
        this.set(k, v);
      }
    }
  }

  get size(): number {
    let count = 0;
    for (const _ of this.entries()) {
      count += 1;
    }
    return count;
  }

  clear(): void {
    this.#root.value = undefined;
    this.#root.map.clear();
  }

  has(key: string | string[]): boolean {
    return this.get(key) !== undefined;
  }

  get(key: string | string[]): T | undefined {
    return resolveNode(this.#root, key, false)?.value;
  }

  set(key: string | string[], value: T): this {
    const resolved = resolveNode(this.#root, key, true);
    if (!resolved.name) {
      resolved.node.value = value;
    } else {
      resolved.node.map.set(resolved.name, value);
    }
    return this;
  }

  delete(key: string | string[]): boolean {
    const resolved = resolveNode(this.#root, key, false);
    let changed = false;
    if (!resolved) {
      // Nothing to do.
    } else if (!resolved.name) {
      if (resolved.node.value !== undefined) {
        resolved.node.value = undefined;
        changed = true;
      }
    } else {
      changed = resolved.node.map.delete(resolved.name);
    }
    return changed;
  }

  subtree(key: string | string[]): PathMap<T> {
    const resolved = resolveNode(this.#root, key, true);
    const result = new PathMap<T>();
    if (!resolved.name) {
      result.#root = resolved.node;
    } else {
      result.#root.value = resolved.value;
      resolved.node.map.set(resolved.name, result.#root);
    }
    return result;
  }

  forEach(callback: (value: T, key: string, map: this) => void, thisArg?: any): void {
    for (const [k, v] of this.entries()) {
      callback.call(thisArg, v, k, this);
    }
  }

  *entries(): MapIterator<[string, T]> {
    if (this.#root.value !== undefined) {
      yield ["", this.#root.value];
    }

    const stack: [string, MapIterator<[string, T | PathMapNode<T>]>][] = [
      ["", this.#root.map.entries()],
    ];
    while (true) {
      const top = stack.at(-1);
      if (!top) {
        break;
      }

      const [prefix, iter] = top;
      const result = iter.next();
      if (result.done) {
        stack.pop();
        continue;
      }

      const [k, v] = result.value;
      if (v instanceof PathMapNode) {
        if (v.value !== undefined) {
          yield [prefix + k, v.value];
        }
        stack.push([prefix + k + "/", v.map.entries()]);
      } else {
        yield [prefix + k, v];
      }
    }
  }

  keys(): MapIterator<string> {
    return this.entries().map((e) => e[0]);
  }

  values(): MapIterator<T> {
    return this.entries().map((e) => e[1]);
  }

  [Symbol.iterator](): MapIterator<[string, T]> {
    return this.entries();
  }

  toObject(): RecursiveRecord<string, T> {
    const root = Object.create(null);
    const stack: [RecursiveRecord<string, T>, MapIterator<[string, T | PathMapNode<T>]>][] = [
      [root, this.#root.map.entries()],
    ];

    if (this.#root.value !== undefined) {
      root[""] = this.#root.value;
    }

    while (true) {
      const top = stack.at(-1);
      if (!top) {
        break;
      }

      const [dst, iter] = top;
      const result = iter.next();
      if (result.done) {
        stack.pop();
        continue;
      }

      const [k, v] = result.value;
      if (v instanceof PathMapNode) {
        if (v.map.size) {
          const child: RecursiveRecord<string, T> = Object.create(null);
          dst[k] = child;
          if (v.value !== undefined) {
            child[""] = v.value;
          }
          stack.push([child, v.map.entries()]);
        } else if (v.value !== undefined) {
          dst[k] = v.value;
        }
      } else {
        dst[k] = v;
      }
    }
    return root;
  }
}

class PathMapNode<T> {
  value: T | undefined;
  readonly map = new SortedMap<string, T | PathMapNode<T>>();
}

function resolveNode<T>(
  root: PathMapNode<T>,
  path: string | string[],
  write: false,
): { node: PathMapNode<T>; name: string; value: T | undefined } | undefined;

function resolveNode<T>(
  root: PathMapNode<T>,
  path: string | string[],
  write: true,
): { node: PathMapNode<T>; name: string; value: T | undefined };

function resolveNode<T>(
  root: PathMapNode<T>,
  path: string | string[],
  write: boolean,
): { node: PathMapNode<T>; name: string; value: T | undefined } | undefined {
  path = NodePath.posix.resolve("/", ...asArray(path));

  const segments = path.split("/").filter((s) => s !== "" && s !== "." && s !== "..");
  let name = segments.pop() ?? "";

  let node = root;
  for (const segment of segments) {
    const child = node.map.get(segment);
    if (child instanceof PathMapNode) {
      node = child;
    } else if (write) {
      let childNode = new PathMapNode<T>();
      childNode.value = child;
      node.map.set(segment, childNode);
      node = childNode;
    } else {
      return undefined;
    }
  }

  let value;
  if (!name || name === ".") {
    name = "";
    value = node.value;
  } else {
    value = node.map.get(name);
    if (value instanceof PathMapNode) {
      node = value;
      name = "";
      value = value.value;
    }
  }

  return { node, name, value };
}
