import packageJson from "../package.json" with { type: "json" };

export const CANDLE_VERSION = `candle ${packageJson.version}\n`;
export const CANDLE_HELP_HEADER = `Usage: candle [--help] [--version] COMMAND [ARGS...]\n`;
export const CANDLE_HELP_FOOTER = `For more information, visit <https://github.com/crlfe/candle>.\n`;

export const CANDLE_BUILD_USAGE = `\
candle build [--output=OUT] [--delete] [--watch] [IN]
  Write a file tree exported by IN (default "src"). Will search common
  code suffixes and "index" if given a directory. With '--watch', the
  build will update upon changes to the input or its dependencies.

  -o, --output=OUT    The destination directory (default "./dist")
  -d, --delete        Delete old files in the destination directory
  -v, --verbose       Print extra information about the build
  -w, --watch         Keep running and update when the input changes
`;

export const CANDLE_SERVE_USAGE = `\
candle serve [--host=HOST] [--port=PORT] [IN]
  Serve a file tree exported by IN (default "src"). Will search common
  code suffixes and "index" if given a directory. The server and browser
  will update upon changes to the input or its dependencies.

  -h, --host=HOST     Local server address (default "localhost")
  -p, --port=8000     Local server port (default 8000)
  -v, --verbose       Print information about requests
`;

export const CANDLE_RUN_USAGE = `\
candle run MODULE [ARGS...]
  Run a user MODULE with the specified arguments. This enhances Node
  with support for automatic reloading via 'import.meta.hot'.
`;
