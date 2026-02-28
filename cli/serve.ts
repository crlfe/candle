import * as NodeUtil from "node:util";
import { findInputFile } from "./files.ts";
import { CANDLE_HELP_FOOTER, CANDLE_SERVE_USAGE, CANDLE_VERSION } from "./usage.ts";

if (import.meta.main) {
  main(process.argv.slice(2));
}

export async function main(args: string[]) {
  const { values, positionals } = NodeUtil.parseArgs({
    args,
    options: {
      help: { short: "?", type: "boolean" },
      version: { type: "boolean" },

      host: { short: "h", type: "string", default: "localhost" },
      port: { short: "p", type: "string", default: "8000" },
      verbose: { short: "v", type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (values.help) {
    process.stderr.write([CANDLE_SERVE_USAGE, CANDLE_HELP_FOOTER].join("\n"));
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

    printUsageError("candle serve is not implemented yet");
  }
}

export function printUsageError(...message: string[]): void {
  process.stderr.write(
    "".concat(...message, `\nTry 'candle serve --help' for more information.\n`),
  );
  process.exitCode = 2;
}
