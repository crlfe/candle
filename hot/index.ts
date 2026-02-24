import { type ModuleNamespace } from "../util/types.ts";
import { ensureHotHooksRegistered } from "./hooks.ts";
import { ensureModuleInfo } from "./state.ts";

export interface Hot {
  accept(
    specifier: string,
    callback: (mod: ModuleNamespace | undefined) => void | Promise<void>,
  ): void;

  import(specifier: string): AsyncIterable<ModuleNamespace | undefined>;
}

class HotImpl implements Hot {
  readonly #meta: ImportMeta;

  constructor(meta: ImportMeta) {
    this.#meta = meta;
  }

  accept(
    specifier: string,
    callback: (mod: ModuleNamespace | undefined) => void | Promise<void>,
  ): void {
    ensureModuleInfo(this.#meta.url).acceptors.push([
      new URL(specifier, this.#meta.url).href,
      callback,
    ]);
  }

  import(specifier: string): AsyncIterable<ModuleNamespace | undefined> {
    type ImportIteratorResult = IteratorResult<ModuleNamespace | undefined>;

    const resolved = this.#meta.resolve(specifier);

    // The initial import or most recent update. This is the first item
    // returned by a newly-created iterator, so callers will have a valid
    // module as quickly as possible.
    let lastUpdate: Promise<ImportIteratorResult> = import(resolved).then(
      (mod) => ({ done: false, value: mod }),
      (err) => {
        // TODO: Better error reporting.
        console.error(err.message);
        return { done: false, value: undefined };
      },
    );

    // Will be resolved by the next module update.
    let future = Promise.withResolvers<ImportIteratorResult>();

    this.accept(resolved, (mod) => {
      future.resolve({ done: false, value: mod });
      lastUpdate = future.promise;
      future = Promise.withResolvers();
    });

    return {
      [Symbol.asyncIterator]() {
        let promise = lastUpdate;
        return {
          async next() {
            let result = await promise;
            promise = future.promise;
            return result;
          },
        };
      },
    };
  }
}

export function createHot(meta: ImportMeta): Hot {
  ensureHotHooksRegistered();
  return new HotImpl(meta);
}
