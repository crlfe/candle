import { registerHooks, type RegisterHooksOptions } from "node:module";
import { ensureModuleInfo, getModuleInfo } from "./state.ts";
import { urlSplitSearch } from "../util/urls.ts";

// Ignore everything in the candle/hot directory.
const IGNORE_URL_PREFIX = import.meta.url.replace(/\/[^/]*$/, "/");

const TS_PARAM = "ts";

const hotHooks: RegisterHooksOptions = {
  resolve(specifier, context, next) {
    const resolved = next(specifier, context);
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
