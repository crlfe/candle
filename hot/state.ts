import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { isObjectWith, type ModuleNamespace } from "candle/util";

export type ModuleAcceptor = [string, (mod: ModuleNamespace | undefined) => void | Promise<void>];

export interface ModuleInfo {
  ts: number | undefined;
  dependents: Set<string>;
  acceptors: ModuleAcceptor[];
}

const modules = new Map<string, ModuleInfo>();
const watchers = new Map<string, NodeFS.FSWatcher>();

let unrefWatchers = false;
let watchChangedModules = new Set<string>();
const watchChangedModulesTimer = setTimeout(onWatchSettled, 50);

export function hotAllowShutdown() {
  for (const watcher of watchers.values()) {
    watcher.unref();
  }
  unrefWatchers = true;
}

export function ensureModuleInfo(url: string): ModuleInfo {
  let info = modules.get(url);
  if (!info) {
    info = { ts: undefined, dependents: new Set(), acceptors: [] };
    modules.set(url, info);

    if (url.startsWith("file://") && !url.includes("/node_modules/")) {
      const dir = NodePath.dirname(fileURLToPath(url));
      if (!watchers.has(dir)) {
        const watcher = NodeFS.watch(dir, (type, name) => onWatchChanged(dir, type, name));
        if (unrefWatchers) {
          watcher.unref();
        }
        watchers.set(dir, watcher);
      }
    }
  }
  return info;
}

export function getModuleInfo(url: string): ModuleInfo | undefined {
  return modules.get(url);
}

function onWatchChanged(dir: string, type: string, name: string | null): void {
  if (name) {
    const url = pathToFileURL(NodePath.resolve(dir, name)).href;
    if (modules.has(url)) {
      watchChangedModules.add(url);
      watchChangedModulesTimer.refresh();
    }
  }
}

async function onWatchSettled() {
  // TODO: This function must complete before being started again.

  const urls = watchChangedModules;
  watchChangedModules = new Set();

  const now = Date.now();
  let unhandledUpdate = false;

  for (const url of urls) {
    const info = getModuleInfo(url);
    if (info) {
      info.ts = now;
      if (!info.dependents.size) {
        unhandledUpdate = true;
      }

      let updated = await import(url).catch((err) => {
        // TODO: Better error reporting.
        console.error(err.message);
        return undefined;
      });
      for (const parentURL of info.dependents) {
        const parentInfo = getModuleInfo(parentURL);
        let accepted = false;
        if (parentInfo) {
          for (const acceptor of parentInfo.acceptors) {
            if (acceptor[0] === url) {
              try {
                await acceptor[1](updated);
                accepted = true;
              } catch (err) {
                // TODO: Better error reporting.
                console.error(isObjectWith(err, "message") ? err.message : err);
              }
            }
          }
        }
        if (!accepted) {
          urls.add(parentURL);
        }
      }
    }
  }

  if (unhandledUpdate) {
    // TODO: Can we shut this down more delicately to flush files/other logs?
    function doShutdown() {
      process.exit(0);
    }

    if (!process.send) {
      process.stderr.write("[Candle] Restart required by code changes\n", doShutdown);
    } else {
      process.send("hot:reload", doShutdown);
    }
  }
}
