import * as NodeModule from "node:module";
import * as NodePath from "node:path";
import { fileURLToPath } from "node:url";

import { type TransformOptions, transformSync } from "oxc-transform";

import { assertNotNullish, urlSplit } from "#util";

function sourceAsString(source: NodeModule.ModuleSource): string {
  if (typeof source !== "string") {
    source = new TextDecoder().decode(source);
  }
  return source;
}

export interface JsxOptions {
  jsxImportSource: string;
}

function createJsxHooks(options: JsxOptions): NodeModule.RegisterHooksOptions {
  return {
    resolve(specifier, context, next) {
      if (specifier.startsWith("candle/")) {
        if (urlSplit(import.meta.url)[0].endsWith(".ts")) {
          specifier = `#${specifier.slice(7)}`;
        } else {
          specifier = NodePath.join(
            assertNotNullish(NodeModule.findPackageJSON(import.meta.url)),
            "../dist/",
            specifier.slice(7).replaceAll("/", "-") + ".js",
          );
        }
      }

      return next(specifier, context);
    },
    load(url, context, next) {
      // Ignore anything that does not look like a local file url or that does
      // not have a JSX-like extension.
      if (!/^file:\/\/[^?]+\.[cm]?[jt]sx(?:\?|$)/.test(url)) {
        return next(url, context);
      }

      const loaded = next(url, { ...context, format: "buffer" });
      if (!loaded.source) {
        throw new Error(`Module loader did not return usable source for ${JSON.stringify(url)}`);
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
    NodeModule.registerHooks(createJsxHooks(options));
  }
}
