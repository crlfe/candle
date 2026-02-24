import {
  registerHooks,
  type RegisterHooksOptions,
  type ResolveFnOutput,
} from "node:module";
import { isObjectWith } from "../util/types.ts";
import { urlSplitSearch } from "../util/urls.ts";
import { ensureModuleInfo, getModuleInfo } from "./state.ts";

// Ignore everything in the candle/hot directory.
const IGNORE_URL_PREFIX = import.meta.url.replace(/\/[^/]*$/, "/");

const TS_PARAM = "ts";

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
        // Vite (and therefore Vitest) hooks unfortunately raise an error when
        // the requested module is missing. To support easy unit testing, and
        // in case anything else has the same somewhat-bug, do our own local
        // resolution if later hooks throw ERR_MODULE_NOT_FOUND.
        resolved = {
          url: new URL(specifier, context.parentURL).href,
          importAttributes: context.importAttributes,
        };
      } else {
        throw err;
      }
    }

    const [id, search] = urlSplitSearch(resolved.url);

    if (context.parentURL && !context.parentURL.startsWith(IGNORE_URL_PREFIX)) {
      ensureModuleInfo(id).dependents.add(urlSplitSearch(context.parentURL)[0]);
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
};

let hotHooksRegistered = false;

export function ensureHotHooksRegistered() {
  if (!hotHooksRegistered) {
    hotHooksRegistered = true;
    registerHooks(hotHooks);
  }
}
