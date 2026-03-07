#!/usr/bin/env node

import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";

import { urlSplit } from "#util";

import {
  CANDLE_BUILD_USAGE,
  CANDLE_HELP_FOOTER,
  CANDLE_HELP_HEADER,
  CANDLE_RUN_USAGE,
  CANDLE_SERVE_USAGE,
  CANDLE_VERSION,
} from "./usage.ts";

const IS_SOURCE = urlSplit(import.meta.url)[0].endsWith(".ts");
const BUILD_PATH = fileURLToPath(import.meta.resolve(IS_SOURCE ? "./build.ts" : "./cli-build.js"));
const SERVE_PATH = fileURLToPath(import.meta.resolve(IS_SOURCE ? "./serve.ts" : "./cli-serve.js"));
const HOT_PATH = fileURLToPath(
  import.meta.resolve(IS_SOURCE ? "../hot/register.ts" : "./hot-register.js"),
);

if (import.meta.main) {
  main(process.argv.slice(2));
}

export function main(args: string[]): void {
  if (args[0] === "--help") {
    process.stderr.write(
      [
        CANDLE_HELP_HEADER,
        CANDLE_SERVE_USAGE,
        CANDLE_BUILD_USAGE,
        CANDLE_RUN_USAGE,
        CANDLE_HELP_FOOTER,
      ].join("\n"),
    );
    process.exitCode = 2;
  } else if (args[0] === "--version") {
    process.stderr.write(CANDLE_VERSION);
    process.exitCode = 2;
  } else if (args[0] === "build") {
    // The build process will install hot hooks with '--watch'.
    forkWithReload(BUILD_PATH, args.slice(1));
  } else if (args[0] === "serve") {
    forkWithReload(SERVE_PATH, args.slice(1));
  } else if (args[0] === "run") {
    if (args[1]) {
      forkWithReload(args[1], args.slice(2), { registerHotHooks: true });
    } else {
      printUsageError(`candle run requires a MODULE argument`);
    }
  } else if (args[0]) {
    printUsageError(`Unknown command ${JSON.stringify(args[0])}`);
  } else {
    printUsageError(`candle requires a COMMAND argument`);
  }
}

function forkWithReload(
  module: string,
  args: string[],
  options?: { registerHotHooks?: boolean } | undefined,
): void {
  const execArgv = Array.from(process.execArgv);
  if (options?.registerHotHooks) {
    execArgv.push(`--import=${HOT_PATH}`);
  }
  const proc = fork(module, args, { execArgv });

  let reload = false;
  proc.on("message", (message) => {
    if (message === "hot:reload") {
      reload = true;
    }
  });
  proc.on("close", (code) => {
    if (reload && code === 0) {
      setTimeout(forkWithReload, 50, module, args, options);
    } else if (code != null) {
      process.exitCode = code;
    }
  });
}

function printUsageError(...message: string[]): void {
  process.stderr.write("".concat(...message, `\nTry 'candle --help' for more information.\n`));
  process.exitCode = 1;
}
