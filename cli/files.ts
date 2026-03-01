import NodeFS from "node:fs";
import NodePath from "node:path";
import { fileURLToPath } from "node:url";

import { isObjectWith } from "../util/types.ts";

const INPUT_SUFFIXES = [".js", ".jsx", ".ts", ".tsx", ".json"];

export function normalizePath(path: string): string {
  if (path.startsWith("file://")) {
    path = fileURLToPath(path);
  }
  return NodePath.normalize(path);
}

export async function findInputFile(path: string): Promise<string | null> {
  path = normalizePath(path);
  let resolved = NodePath.resolve(path);

  let stats = await tryStat(resolved);
  if (stats?.isFile()) {
    return resolved;
  }
  if (stats?.isDirectory()) {
    resolved = NodePath.join(resolved, "index");
  }

  for (const suffix of INPUT_SUFFIXES) {
    const curr = `${resolved}${suffix}`;
    stats = await tryStat(curr);
    if (stats?.isFile()) {
      return curr;
    }
  }
  return null;
}

export async function tryStat(path: string): Promise<NodeFS.Stats | null> {
  return NodeFS.promises.stat(path).catch((err) => {
    if (isObjectWith(err, "code")) {
      if (err.code === "ENOENT" || err.code === "ENOTDIR") {
        return null;
      }
    }
    throw err;
  });
}

export async function listFiles(path: string): Promise<string[]> {
  const dst: string[] = [];
  const dir = await NodeFS.promises
    .opendir(path, {
      recursive: true,
    })
    .catch((err) => {
      if (isObjectWith(err, "code") && err.code === "ENOENT") {
        return [];
      }
      throw err;
    });

  for await (const entry of dir) {
    if (entry.isFile()) {
      dst.push(NodePath.relative(path, NodePath.join(entry.parentPath, entry.name)));
    }
  }
  dst.sort();
  return dst;
}

export async function listEmptyDirectories(path: string): Promise<string[]> {
  const dst: string[] = [];
  async function visit(curr: string): Promise<boolean> {
    let empty = true;
    const entries = await NodeFS.promises.readdir(curr, {
      withFileTypes: true,
    });
    entries.sort((a, b) => cmp(a.name, b.name));
    for (const entry of entries) {
      if (!entry.isDirectory() || !(await visit(NodePath.join(entry.parentPath, entry.name)))) {
        empty = false;
      }
    }
    if (curr !== path && empty) {
      dst.push(NodePath.relative(path, curr));
    }
    return empty;
  }
  await visit(path);
  return dst;
}
