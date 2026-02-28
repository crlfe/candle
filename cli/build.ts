import * as NodeUtil from "node:util";
import { findInputFile } from "./files.ts";
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

    printUsageError("candle build is not implemented yet");
  }
}

export function printUsageError(...message: string[]): void {
  process.stderr.write(
    "".concat(...message, `\nTry 'candle build --help' for more information.\n`),
  );
  process.exitCode = 2;
}
