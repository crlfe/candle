import * as NodePath from "node:path";

import { isFunction, isModuleNamespace, isObjectWith, isPromiseLike, urlSplit } from "candle/util";
import { lookup } from "mime-types";

export type FileContent = string | Uint8Array;

export function isFileContent(value: unknown): value is FileContent {
  return typeof value === "string" || value instanceof Uint8Array;
}

export function fileContentToString(value: FileContent): string {
  if (typeof value !== "string") {
    value = new TextDecoder().decode(value);
  }
  return value;
}

export function fileContentToBytes(value: FileContent): Uint8Array {
  if (typeof value === "string") {
    value = new TextEncoder().encode(value);
  }
  return value;
}

function guessContentType(filename: string | undefined): string {
  if (filename && /\.[cm]?[jt]sx?$/.test(filename)) {
    return "text/javascript";
  }
  return (filename && lookup(filename)) || "application/octet-stream";
}
async function follow(value: unknown): Promise<unknown> {
  while (true) {
    if (isFunction(value)) {
      value = await value();
    } else if (isModuleNamespace(value)) {
      value = value.default;
    } else if (isPromiseLike(value)) {
      value = await value;
    } else {
      break;
    }
  }
  return value;
}

export async function getContent(
  root: unknown,
  url: string,
): Promise<{ type: string; data: FileContent } | undefined> {
  const [pathname] = urlSplit(url);
  const segments = pathname.split("/").filter((s) => s);
  if (pathname.endsWith("/")) {
    // Trailing slash implies "index.html".
    segments.push("index.html");
  }

  // Walk down from the root to find the requested file.
  let curr = await follow(root);
  for (const segment of segments) {
    while (curr != null) {
      if (isObjectWith(curr, segment)) {
        // Found a matching name.
        curr = await follow(curr[segment]);
        break;
      }
      if (isObjectWith(curr, "...")) {
        // Follow the "..." chain to a linked record of files.
        curr = await follow(curr["..."]);
        continue;
      }
      // Otherwise the file was not found.
      curr = undefined;
      break;
    }
  }

  // Ended on something that looks like a directory, so try "index.html".
  if (segments.at(-1) !== "index.html" && isObjectWith(curr, "index.html")) {
    segments.push("index.html");
    curr = await follow(curr["index.html"]);
  }

  if (!isFileContent(curr)) {
    return undefined;
  }

  return {
    type: guessContentType(segments.at(-1)),
    data: fileContentToBytes(curr),
  };
}

export async function* iterContent(
  root: unknown,
  prefix: string = "/",
): AsyncGenerator<{ name: string; type: string; data: Uint8Array }> {
  let curr = await follow(root);

  if (curr == null) {
    return;
  }

  if (isFileContent(curr)) {
    yield {
      name: prefix,
      type: guessContentType(prefix),
      data: fileContentToBytes(curr),
    };
    return;
  }

  if (typeof curr === "object" && curr != null) {
    do {
      let next = undefined;
      for (const [name, value] of Object.entries(curr)) {
        if (name === "...") {
          next = value;
        } else {
          yield* iterContent(value, NodePath.posix.join(prefix, name));
        }
      }
      curr = await follow(next);
    } while (typeof curr === "object" && curr != null);
    return;
  }

  throw new TypeError();
}
