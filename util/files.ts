import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { PathTree } from "./path-tree.ts";
import { isObjectWithValue } from "./types.ts";

export async function treeStat(path: string): Promise<NodeFS.Stats | PathTree<NodeFS.Stats>> {
  const dir = await NodeFS.promises.opendir(path).catch((err) => {
    if (isObjectWithValue(err, "code", "ENOTDIR")) {
      return null;
    }
    throw err;
  });
  if (!dir) {
    return await NodeFS.promises.stat(path);
  }

  const dst = new PathTree<NodeFS.Stats>();
  for await (const entry of dir) {
    const entryPath = NodePath.join(entry.parentPath, entry.name);
    if (entry.isDirectory()) {
      dst.set(entry.name, await treeStat(entryPath));
    } else {
      dst.set(entry.name, await NodeFS.promises.stat(entryPath));
    }
  }
  return dst;
}
