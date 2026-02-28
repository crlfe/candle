import { type ModuleNamespace } from "candle/util";

import { ensureHotHooksRegistered } from "./hooks.ts";
import { ensureModuleInfo } from "./state.ts";

export { hotAllowShutdown } from "./state.ts";

declare global {
  interface ImportMeta {
    hot?: ImportMetaHot;
  }

  interface ImportMetaHot {
    accept(
      specifier: string,
      callback: (mod: ModuleNamespace | undefined) => void | Promise<void>,
    ): void;

    import(specifier: string): AsyncIterableIterator<ModuleNamespace | undefined> & Disposable;
  }
}

class HotImpl implements ImportMetaHot {
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

  import(specifier: string): AsyncIterableIterator<ModuleNamespace | undefined> & Disposable {
    type ImportIteratorResult = IteratorResult<ModuleNamespace | undefined>;

    const resolved = this.#meta.resolve(specifier);

    // The initial import or most recent update. This is the first item
    // returned by a newly-created iterator, so callers will have a valid
    // module as quickly as possible.
    let promise: Promise<ImportIteratorResult> = import(resolved).then(
      (mod) => ({ done: false, value: mod }),
      (err) => {
        // TODO: Better error reporting.
        console.error(err.message);
        return { done: false, value: undefined };
      },
    );

    // Will be resolved by the next module update.
    let nextUpdate = Promise.withResolvers<ImportIteratorResult>();

    this.accept(resolved, (mod) => {
      nextUpdate.resolve({ done: false, value: mod });
      promise = nextUpdate.promise;
      nextUpdate = Promise.withResolvers();
    });

    return {
      [Symbol.asyncIterator]() {
        return this;
      },
      async next() {
        const result = await promise;
        promise = nextUpdate.promise;
        return result;
      },
      async return(value?: any) {
        nextUpdate.resolve({ done: true, value });
        promise = nextUpdate.promise;
        return await promise;
      },
      async [Symbol.dispose]() {
        nextUpdate.resolve({ done: true, value: undefined });
        promise = nextUpdate.promise;
      },
    };
  }
}

export function createHot(meta: ImportMeta): ImportMetaHot {
  ensureHotHooksRegistered();
  return new HotImpl(meta);
}
