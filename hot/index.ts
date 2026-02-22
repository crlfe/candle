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
    const resolved = this.#meta.resolve(specifier);
    let latest: Promise<ModuleNamespace | undefined> = import(resolved).catch(
      (err) => {
        // TODO: Better error reporting.
        console.error(err);
        return undefined;
      },
    );
    let future = Promise.withResolvers<ModuleNamespace | undefined>();
    this.accept(resolved, (mod) => {
      future.resolve(mod);
      future = Promise.withResolvers<ModuleNamespace | undefined>();
    });

    return {
      [Symbol.asyncIterator]() {
        let promise: Promise<ModuleNamespace | undefined> = latest;
        return {
          async next() {
            let value = await promise;
            promise = future.promise;
            return { done: false, value };
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
