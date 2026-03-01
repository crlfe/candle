import {
  type ModuleSource,
  registerHooks,
  type RegisterHooksOptions,
  type ResolveFnOutput,
} from "node:module";
import { fileURLToPath } from "node:url";

import { isObjectWith, urlSplit } from "candle/util";
import MagicString from "magic-string";
import { type Node as OxcNode, parseSync, visitorKeys, type VisitorObject } from "oxc-parser";

import { ensureModuleInfo, getModuleInfo } from "./state.ts";

// Ignore everything in the candle/hot directory.
const IGNORE_URL_PREFIX = import.meta.url.replace(/\/[^/]*$/, "/");

const TS_PARAM = "ts";

function sourceAsString(source: ModuleSource): string {
  if (typeof source !== "string") {
    source = new TextDecoder().decode(source);
  }
  return source;
}

function traverse(node: OxcNode, visitor: VisitorObject) {
  if (node != null) {
    Reflect.get(visitor, node.type)?.(node);
    for (const key of visitorKeys[node.type] ?? []) {
      let children = Reflect.get(node, key) ?? [];
      if (!Array.isArray(children)) {
        children = [children];
      }
      for (const child of children) {
        traverse(child, visitor);
      }
    }
    Reflect.get(visitor, `${node.type}:exit`)?.(node);
  }
}

const hotHooks: RegisterHooksOptions = {
  resolve(specifier, context, next) {
    if (!/^file:\/\/|^\.{0,2}(?:[/\\]|$)|/.test(specifier)) {
      // Ignore anything that does not look like a local file url/path.
      // TODO: Consider watching files in node_modules, especially if linked.
      return next(specifier, context);
    }

    let resolved: ResolveFnOutput;
    try {
      resolved = next(specifier, context);
    } catch (err) {
      if (isObjectWith(err, "code") && err.code === "ERR_MODULE_NOT_FOUND") {
        // TODO: Unfortunately later processing (sometimes?) raises an error
        // when the requested module is missing. It would be nice to get back
        // the URL that they actually tried to resolve, but for now fall back
        // to doing a basic URL resolution ourselves.
        resolved = {
          url: new URL(specifier, context.parentURL).href,
          importAttributes: context.importAttributes,
        };
      } else {
        throw err;
      }
    }

    const [id, search] = urlSplit(resolved.url);

    if (context.parentURL && !context.parentURL.startsWith(IGNORE_URL_PREFIX)) {
      ensureModuleInfo(id).dependents.add(urlSplit(context.parentURL)[0]);
    }

    const ts = getModuleInfo(id)?.ts;
    const searchParams = new URLSearchParams(search);
    if (ts != null) {
      searchParams.set(TS_PARAM, ts.toString());
    } else {
      searchParams.delete(TS_PARAM);
    }

    resolved.url = id;
    if (searchParams.size) {
      resolved.url += `?${searchParams}`;
    }

    return resolved;
  },
  load(url, context, next) {
    const loaded = next(url, context);

    if ((loaded.format === "module" || loaded.format === "module-typescript") && loaded.source) {
      const filename = fileURLToPath(url);
      const source = sourceAsString(loaded.source);

      const parsed = parseSync(filename, source);
      if (parsed.errors.length) {
        throw new Error(`Failed to parse ${filename}`, { cause: parsed.errors });
      }

      const createHotId = "__candle_createHot";
      const importFrom = JSON.stringify(import.meta.resolve("./index.ts"));

      let magic = new MagicString(source, { filename });
      let haveInit = false;
      for (const outer of parsed.program.body) {
        traverse(outer, {
          MetaProperty(node) {
            if (
              node.meta.type === "Identifier" &&
              node.meta.name === "import" &&
              node.property.type === "Identifier" &&
              node.property.name === "meta"
            ) {
              if (!haveInit) {
                haveInit = true;
                magic = magic.prependRight(
                  outer.start,
                  `import.meta.hot = ${createHotId}(import.meta);\n`,
                );
              }
            }
          },
        });
      }

      if (magic.hasChanged()) {
        magic = magic.prepend(`import { createHot as ${createHotId} } from ${importFrom};\n`);
        return {
          format: loaded.format,
          source: magic.toString() + `\n//# sourceMappingURL=` + magic.generateMap().toUrl(),
        };
      }
    }

    return loaded;
  },
};

let hotHooksRegistered = false;

export function ensureHotHooksRegistered() {
  if (!hotHooksRegistered) {
    hotHooksRegistered = true;
    registerHooks(hotHooks);
  }
}
