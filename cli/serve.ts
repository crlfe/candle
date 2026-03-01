import * as NodeFS from "node:fs";
import * as NodeHttp from "node:http";
import { fileURLToPath } from "node:url";
import * as NodeUtil from "node:util";

import { createHot } from "candle/hot";
import { isObjectWith, type ModuleNamespace } from "candle/util";
import { WebSocketServer } from "ws";

import { findInputFile } from "./files.ts";
import { fileContentToBytes, fileContentToString, getContent } from "./tree.ts";
import { CANDLE_HELP_FOOTER, CANDLE_SERVE_USAGE, CANDLE_VERSION } from "./usage.ts";

const CANDLE_SCRIPT_URL = `/.candle/client.js`;
const CANDLE_SCRIPT_TAG = `<script type="module" src="${CANDLE_SCRIPT_URL}"></script>`;
const CANDLE_SCRIPT_PATH = fileURLToPath(import.meta.resolve("./serve-browser.js"));

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

    new Main({ host: values.host, port: values.port, verbose: values.verbose, input }).run();
  }
}

class Main {
  readonly options: { host: string; port: string; verbose: boolean; input: string };

  root: ModuleNamespace | undefined;

  constructor(options: { host: string; port: string; verbose: boolean; input: string }) {
    this.options = options;
  }

  async run() {
    const server = NodeHttp.createServer(async (req, res) => {
      if (req.method !== "GET" || !req.url) {
        httpWriteError(res, 400);
      } else if (req.url.startsWith("/.candle/")) {
        if (req.url === CANDLE_SCRIPT_URL) {
          const content = await NodeFS.promises.readFile(CANDLE_SCRIPT_PATH);
          res.setHeader("Content-Length", content.byteLength);
          res.setHeader("Content-Type", "text/javascript");
          res.end(content);
        } else {
          httpWriteError(res, 404);
        }
      } else if (req.url.startsWith("/.well-known/")) {
        httpWriteError(res, 404);
      } else {
        try {
          await this.serveContent(req.url, res);
        } catch (err) {
          const content = fileContentToBytes(
            "".concat(
              `<!DOCTYPE html>`,
              `<html>`,
              `<head>`,
              `<meta charset="utf-8">`,
              `<title>Internal Server Error</title>`,
              CANDLE_SCRIPT_TAG,
              `</head>`,
              `<body>`,
              `<h1>Internal Server Error</h1>`,
              `<pre>Unable to load ${JSON.stringify(req.url)}:\n`,
              htmlEscape(`${isObjectWith(err, "stack") ? err.stack : err}`),
              `</pre>`,
              `</body>`,
              `</html>`,
            ),
          );
          res.statusCode = 500;
          res.setHeader("Content-Length", content.byteLength);
          res.setHeader("Content-Type", "text/html");
          res.end(content);
        }
      }
    });

    const wss = new WebSocketServer({ server });

    server.listen({ host: this.options.host, port: this.options.port }, () => {
      let info = server.address();
      if (info != null) {
        let address: string;
        if (typeof info === "string") {
          address = info;
        } else {
          address = `${info.address}:${info.port}`;
        }
        console.info(`Listening at http://${address}/`);
      }
    });

    const hot = createHot(import.meta);
    for await (const mod of hot.import(this.options.input)) {
      this.root = mod;
      for (const client of wss.clients) {
        client.close();
      }
    }
  }

  async serveContent(url: string, res: NodeHttp.ServerResponse): Promise<void> {
    const content = await getContent(this.root, url);
    if (content == null) {
      this.verboseLog("404", url);
      return httpWriteError(res, 404);
    }

    let { type, data } = content;

    if (type === "text/html") {
      let html = fileContentToString(data);

      // TODO: Should really grab an actual HTML parser for this.
      const htmlStartTag = html.indexOf("<html>");
      const headEndTag = html.indexOf("</head>");
      const bodyStartTag = html.indexOf("<body>");
      if (headEndTag >= 0) {
        // If we have a head at all, minimize the changes.
        html = "".concat(html.slice(0, headEndTag), CANDLE_SCRIPT_TAG, html.slice(headEndTag));
      } else if (bodyStartTag >= 0) {
        // Try to fix a missing head and possibly missing html.
        html = "".concat(
          htmlStartTag < 0 ? "<html>" : "",
          html.slice(0, bodyStartTag),
          `<head>`,
          `<meta charset="utf-8">`,
          CANDLE_SCRIPT_TAG,
          `</head>`,
          html.slice(bodyStartTag),
          htmlStartTag < 0 ? "</html>" : "",
        );
      } else {
        // Have nothing that looks like document structure.
        html = "".concat(
          `<!DOCTYPE html>`,
          `<html>`,
          `<head>`,
          `<meta charset="utf-8">`,
          CANDLE_SCRIPT_TAG,
          `</head>`,
          `<body>${html}</body>`,
          `</html>`,
        );
      }

      data = html;
    }

    data = fileContentToBytes(data);
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", data.byteLength);
    res.end(data);

    this.verboseLogResponse(url, data.byteLength);
  }

  verboseLog(...msg: unknown[]) {
    if (this.options.verbose) {
      console.log(...msg);
    }
  }

  verboseLogResponse(url: string, length: number) {
    const COLS = 60;

    if (this.options.verbose) {
      let left = `200 ${url}`;

      let right;
      let unit;
      if (length < 5e3) {
        right = length.toFixed(0);
        unit = " B";
      } else if (length < 5e6) {
        right = (length / 1e3).toFixed(0);
        unit = " KB";
      } else {
        right = (length / 1e6).toFixed(0);
        unit = " MB";
      }

      // Leave at least two spaces between URL and length.
      if (left.length + 2 + right.length + unit.length > COLS) {
        left = left.slice(0, COLS - (left.length + right.length + unit.length) - 5) + "...";
      }
      left = left.padEnd(COLS - (right.length + unit.length));

      console.log(`${left}${right}${unit}`);
    }
  }
}

function httpWriteError(res: NodeHttp.ServerResponse, code: number): void {
  const message = htmlEscape(NodeHttp.STATUS_CODES[code] ?? "Internal Server Error");
  const content = fileContentToBytes(
    "".concat(
      `<!DOCTYPE html>`,
      `<html>`,
      `<head>`,
      `<meta charset="utf-8">`,
      `<title>${message}</title>`,
      CANDLE_SCRIPT_TAG,
      `</head>`,
      `<body><h1>${message}</h1></body>`,
      `</html>`,
    ),
  );
  res.statusCode = code;
  res.setHeader("Content-Type", "text/html");
  res.setHeader("Content-Length", content.byteLength);
  res.end(content);
}

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

function htmlEscape(value: string): string {
  return value.replaceAll(/[&<>"]/g, (m) => HTML_ENTITIES[m] ?? m);
}
export function printUsageError(...message: string[]): void {
  process.stderr.write(
    "".concat(...message, `\nTry 'candle serve --help' for more information.\n`),
  );
  process.exitCode = 1;
}
