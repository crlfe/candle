import packageJson from "../package.json" with { type: "json" };

export const CANDLE_VERSION = `candle ${packageJson.version}\n`;
export const CANDLE_USAGE_HEADER = `Usage: candle [--help] [--version] COMMAND [ARGS...]\n`;
export const CANDLE_USAGE_FOOTER = `For more information, visit <https://github.com/crlfe/candle>.\n`;

export const CANDLE_RUN_HELP = `\
candle run MODULE [ARGS...]
  Run a user MODULE with the specified arguments. This enhances Node
  with support for JSX and automatic reloading via 'import.meta.hot'.
`;

export const CANDLE_HELP = `\
${CANDLE_USAGE_HEADER}
${CANDLE_RUN_HELP}
${CANDLE_USAGE_FOOTER}
`;

export function printUsageError(...message: string[]): void {
  process.stderr.write("".concat(...message));
  process.stderr.write(`\nTry 'candle --help' for more information.\n`);
  process.exitCode = 2;
}
