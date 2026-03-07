//#endregion
//#region cli/usage.ts
const CANDLE_VERSION = `candle 0.1.1\n`;
const CANDLE_HELP_HEADER = `Usage: candle [--help] [--version] COMMAND [ARGS...]\n`;
const CANDLE_HELP_FOOTER = `For more information, visit <https://github.com/crlfe/candle>.\n`;
const CANDLE_BUILD_USAGE = `\
candle build [--output=OUT] [--delete] [--watch] [IN]
  Write a file tree exported by IN (default "src"). Will search common
  code suffixes and "index" if given a directory. With '--watch', the
  build will update upon changes to the input or its dependencies.

  -o, --output=OUT    The destination directory (default "./dist")
  -d, --delete        Delete old files in the destination directory
  -j, --jsx=IMPORT    Module containing the jsx runtime used for static
                      pages (default "candle/jsx"), specify "" to disable
  -v, --verbose       Print extra information about the build
  -w, --watch         Keep running and update when the input changes
`;
const CANDLE_SERVE_USAGE = `\
candle serve [--host=HOST] [--port=PORT] [IN]
  Serve a file tree exported by IN (default "src"). Will search common
  code suffixes and "index" if given a directory. The server and browser
  will update upon changes to the input or its dependencies.

  -h, --host=HOST     Local server address (default "localhost")
  -p, --port=8000     Local server port (default 8000)
  -j, --jsx=IMPORT    Module containing the jsx runtime used for static
                      pages (default "candle/jsx"), specify "" to disable
  -v, --verbose       Print information about requests
`;
const CANDLE_RUN_USAGE = `\
candle run MODULE [ARGS...]
  Run a user MODULE with the specified arguments. This enhances Node
  with support for automatic reloading via 'import.meta.hot'.
`;
//#endregion
export { CANDLE_SERVE_USAGE as a, CANDLE_RUN_USAGE as i, CANDLE_HELP_FOOTER as n, CANDLE_VERSION as o, CANDLE_HELP_HEADER as r, CANDLE_BUILD_USAGE as t };
