import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import * as NodeUtil from "node:util";

import { createHot, type CandleHot } from "candle/hot";
import { isObjectWithValue, type MaybeAsync, type ModuleNamespace } from "candle/util";

import { findInputFile, listEmptyDirectories, listFiles, tryStat } from "./files.ts";
import { iterContent } from "./tree.ts";
import { CANDLE_BUILD_USAGE, CANDLE_HELP_FOOTER, CANDLE_VERSION } from "./usage.ts";

if (import.meta.main) {
  main(process.argv.slice(2));
}

export async function main(args: string[]) {
  const { values, positionals } = NodeUtil.parseArgs({
    args,
    options: {
      help: { short: "?", type: "boolean" },
      version: { type: "boolean" },

      output: { short: "o", type: "string", default: "./dist" },
      delete: { short: "d", type: "boolean", default: false },
      verbose: { short: "v", type: "boolean", default: false },
      watch: { short: "w", type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stderr.write([CANDLE_BUILD_USAGE, CANDLE_HELP_FOOTER].join("\n"));
    process.exitCode = 2;
  } else if (values.version) {
    process.stderr.write(CANDLE_VERSION);
    process.exitCode = 2;
  } else {
    const inputArg = positionals[0] ?? "src";
    const input = await findInputFile(inputArg);
    if (!input) {
      return printUsageError(`Failed to find input file from ${JSON.stringify(inputArg)}.`);
    }

    await run({
      input,
      output: values.output,
      deleteFiles: values.delete,
      verbose: values.verbose,
      watch: values.watch,
    });
  }
}

async function run(options: {
  input: string;
  output: string;
  deleteFiles: boolean;
  verbose: boolean;
  watch: boolean;
}) {
  const { input, output, deleteFiles, verbose, watch } = options;

  let hot: CandleHot | undefined;
  if (watch) {
    hot = createHot(import.meta);
  }

  await writeTree(import(input));

  if (hot) {
    hot.accept(input, async (mod) => writeTree(mod));
  }

  async function writeTree(root: MaybeAsync<ModuleNamespace | undefined>): Promise<void> {
    const oldFiles = new Set(await listFiles(output));
    if (oldFiles.size > 100) {
      throw new Error(`Safety check: found too many files in the output directory`);
    }
    // TODO: Cache list of names that have been confirmed as directories.

    for await (const file of iterContent(root, "")) {
      oldFiles.delete(file.name);

      // Create parent directories, moving any conflicting files out of the way.
      const segments = file.name.split(NodePath.sep).filter((s) => s);
      for (let i = 0; i < segments.length; i++) {
        const curr = segments.slice(0, i).join(NodePath.sep);
        let info = await tryStat(NodePath.join(output, curr));
        if (info?.isFile()) {
          oldFiles.add(await renameToDeleted(curr));
          info = null;
        }
        if (!info) {
          if (verbose) {
            console.log("+d", curr);
          }
          await NodeFS.promises.mkdir(NodePath.join(output, curr));
        } else if (!info?.isDirectory()) {
          throw new Error(
            `Unsupported file type in output directory: ${JSON.stringify(file.name)}`,
          );
        }
      }

      // Write the file, moving any conflicting directory out of the way.
      const path = NodePath.join(output, file.name);
      let info = await tryStat(path);
      if (info?.isDirectory()) {
        oldFiles.add(await renameToDeleted(file.name));
        info = null;
      }
      if (info && !info.isFile()) {
        throw new Error(`Unsupported file type in output directory: ${JSON.stringify(file.name)}`);
      }

      let changed = true;
      if (info?.size === file.data.byteLength) {
        // TODO: This should really use mtime and cached hashes.
        const oldData = await NodeFS.promises.readFile(path);
        if (oldData.equals(file.data)) {
          changed = false;
        }
      }

      if (verbose) {
        if (!changed) {
          console.log(" f", file.name);
        } else if (info) {
          console.log("=f", file.name);
        } else {
          console.log("+f", file.name);
        }
      }
      if (changed) {
        await NodeFS.promises.writeFile(path, file.data);
      }
    }

    if (deleteFiles) {
      if (oldFiles.size > 100) {
        throw new Error(`Safety check: found too many files in the output directory`);
      }

      for (const file of oldFiles) {
        if (verbose) {
          console.log("-f", file);
        }
        await NodeFS.promises.unlink(NodePath.join(output, file));
      }

      for (const dir of await listEmptyDirectories(output)) {
        if (verbose) {
          console.log("-d", dir);
        }
        await NodeFS.promises.rmdir(NodePath.join(output, dir));
      }
    }
  }

  async function renameToDeleted(name: string): Promise<string> {
    for (let i = 0; i < 100; i++) {
      const curr = `${name}.del${i || ""}`;
      try {
        await NodeFS.promises.rename(NodePath.join(output, name), NodePath.join(output, curr));
        return curr;
      } catch (err) {
        if (isObjectWithValue(err, "code", "EEXIST")) {
          // Try the next counter.
        } else {
          throw err;
        }
      }
    }
    throw new Error(`Too many conflicts trying to delete ${JSON.stringify(name)}`);
  }
}
export function printUsageError(...message: string[]): void {
  process.stderr.write(
    "".concat(...message, `\nTry 'candle build --help' for more information.\n`),
  );
  process.exitCode = 1;
}
