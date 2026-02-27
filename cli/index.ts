#!/usr/bin/env node

import { fork } from "node:child_process";
import { fileURLToPath } from "node:url";
import { CANDLE_HELP, CANDLE_VERSION, printUsageError } from "./usage.ts";

const HOT_PATH = fileURLToPath(import.meta.resolve("../hot/register.ts"));

export function main(args: string[]): void {
  if (args[0] === "--help") {
    process.stderr.write(CANDLE_HELP);
    process.exitCode = 2;
  } else if (args[0] === "--version") {
    process.stderr.write(CANDLE_VERSION);
    process.exitCode = 2;
  } else if (args[0] === "run") {
    if (args[1]) {
      forkWithReload(args[1], args.slice(2));
    } else {
      printUsageError(`candle run requires a MODULE argument`);
    }
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
  if (options?.registerHotHooks !== false) {
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

if (import.meta.main) {
  main(process.argv.slice(2));
}
