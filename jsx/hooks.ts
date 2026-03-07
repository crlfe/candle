import { type ModuleSource, registerHooks, type RegisterHooksOptions } from "node:module";
import { fileURLToPath } from "node:url";

import { type TransformOptions, transformSync } from "oxc-transform";

function sourceAsString(source: ModuleSource): string {
  if (typeof source !== "string") {
    source = new TextDecoder().decode(source);
  }
  return source;
}

export interface JsxOptions {
  jsxImportSource: string;
}

function createJsxHooks(options: JsxOptions): RegisterHooksOptions {
  return {
    load(url, context, next) {
      // Ignore anything that does not look like a local file url or that does
      // not have a JSX-like extension.
      if (!/^file:\/\/[^?]+\.[cm]?[jt]sx(?:\?|$)|/.test(url)) {
        return next(url, context);
      }

      const loaded = next(url, { ...context, format: "buffer" });
      if (!loaded.source) {
        throw new Error("Module loader did not return usable source");
      }

      const transformOptions: TransformOptions = {};
      if (options.jsxImportSource) {
        transformOptions.jsx = {
          importSource: options.jsxImportSource,
        };
      }
      const transformed = transformSync(
        fileURLToPath(url),
        sourceAsString(loaded.source),
        transformOptions,
      );
      if (transformed.errors.length) {
        throw new Error("Failed to transform JSX source", { cause: transformed.errors });
      }

      // TODO: Embed the source map
      loaded.format = "module";
      loaded.source = transformed.code;
      return loaded;
    },
  };
}

let jsxHooksRegistered = false;

export function ensureJsxHooksRegistered(options: JsxOptions) {
  if (!jsxHooksRegistered) {
    jsxHooksRegistered = true;
    registerHooks(createJsxHooks(options));
  }
}
