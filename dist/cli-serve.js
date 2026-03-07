import { isObjectWith } from "./util.js";
import { a as CANDLE_SERVE_USAGE, n as CANDLE_HELP_FOOTER, o as CANDLE_VERSION } from "./a/usage-D3mF7Sn9.js";
import "./a/hooks-DwcgAoO1.js";
import { createHot } from "./hot.js";
import { ensureJsxHooksRegistered } from "./jsx.js";
import { a as findInputFile, n as fileContentToString, r as getContent, t as fileContentToBytes } from "./a/tree-DT9xIPou.js";
import { fileURLToPath } from "node:url";
import * as NodeFS$1 from "node:fs";
import * as NodeUtil from "node:util";
import * as NodeHttp from "node:http";
import { WebSocketServer } from "ws";
//#region cli/serve.ts
const CANDLE_SCRIPT_URL = `/.candle/client.js`;
const CANDLE_SCRIPT_TAG = `<script type="module" src="${CANDLE_SCRIPT_URL}"><\/script>`;
const CANDLE_SCRIPT_PATH = fileURLToPath(import.meta.resolve("./serve-browser.js"));
if (import.meta.main) main(process.argv.slice(2));
async function main(args) {
	const { values, positionals } = NodeUtil.parseArgs({
		args,
		options: {
			help: {
				short: "?",
				type: "boolean"
			},
			version: { type: "boolean" },
			host: {
				short: "h",
				type: "string",
				default: "localhost"
			},
			port: {
				short: "p",
				type: "string",
				default: "8000"
			},
			jsx: {
				short: "j",
				type: "string",
				default: "candle/jsx"
			},
			verbose: {
				short: "v",
				type: "boolean",
				default: false
			}
		},
		allowPositionals: true
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
		if (!input) return printUsageError(`Failed to find input file from ${JSON.stringify(inputArg)}.`);
		new Main({
			...values,
			input
		}).run();
	}
}
var Main = class {
	options;
	root;
	constructor(options) {
		this.options = options;
	}
	async run() {
		if (this.options.jsx) ensureJsxHooksRegistered({ jsxImportSource: this.options.jsx });
		const server = NodeHttp.createServer(async (req, res) => {
			if (req.method !== "GET" || !req.url) httpWriteError(res, 400);
			else if (req.url.startsWith("/.candle/")) if (req.url === CANDLE_SCRIPT_URL) {
				const content = await NodeFS$1.promises.readFile(CANDLE_SCRIPT_PATH);
				res.setHeader("Content-Length", content.byteLength);
				res.setHeader("Content-Type", "text/javascript");
				res.end(content);
			} else httpWriteError(res, 404);
			else if (req.url.startsWith("/.well-known/")) httpWriteError(res, 404);
			else try {
				await this.serveContent(req.url, res);
			} catch (err) {
				const content = fileContentToBytes("".concat(`<!DOCTYPE html>`, `<html>`, `<head>`, `<meta charset="utf-8">`, `<title>Internal Server Error</title>`, CANDLE_SCRIPT_TAG, `</head>`, `<body>`, `<h1>Internal Server Error</h1>`, `<pre>Unable to load ${JSON.stringify(req.url)}:\n`, htmlEscape(`${isObjectWith(err, "stack") ? err.stack : err}`), `</pre>`, `</body>`, `</html>`));
				res.statusCode = 500;
				res.setHeader("Content-Length", content.byteLength);
				res.setHeader("Content-Type", "text/html");
				res.end(content);
			}
		});
		const wss = new WebSocketServer({ server });
		server.listen({
			host: this.options.host,
			port: this.options.port
		}, () => {
			let info = server.address();
			if (info != null) {
				let address;
				if (typeof info === "string") address = info;
				else address = `${info.address}:${info.port}`;
				console.info(`Listening at http://${address}/`);
			}
		});
		const hot = createHot(import.meta);
		for await (const mod of hot.import(this.options.input)) {
			this.root = mod;
			for (const client of wss.clients) client.close();
		}
	}
	async serveContent(url, res) {
		const content = await getContent(this.root, url);
		if (content == null) {
			this.verboseLog("404", url);
			return httpWriteError(res, 404);
		}
		let { type, data } = content;
		if (type === "text/html") {
			let html = fileContentToString(data);
			const htmlStartTag = html.indexOf("<html>");
			const headEndTag = html.indexOf("</head>");
			const bodyStartTag = html.indexOf("<body>");
			if (headEndTag >= 0) html = "".concat(html.slice(0, headEndTag), CANDLE_SCRIPT_TAG, html.slice(headEndTag));
			else if (bodyStartTag >= 0) html = "".concat(htmlStartTag < 0 ? "<html>" : "", html.slice(0, bodyStartTag), `<head>`, `<meta charset="utf-8">`, CANDLE_SCRIPT_TAG, `</head>`, html.slice(bodyStartTag), htmlStartTag < 0 ? "</html>" : "");
			else html = "".concat(`<!DOCTYPE html>`, `<html>`, `<head>`, `<meta charset="utf-8">`, CANDLE_SCRIPT_TAG, `</head>`, `<body>${html}</body>`, `</html>`);
			data = html;
		}
		data = fileContentToBytes(data);
		res.setHeader("Content-Type", type);
		res.setHeader("Content-Length", data.byteLength);
		res.end(data);
		this.verboseLogResponse(200, url, data.byteLength);
	}
	verboseLog(...msg) {
		if (this.options.verbose) console.log(...msg);
	}
	verboseLogResponse(code, url, contentLength) {
		const COLS = 60;
		if (this.options.verbose) {
			let left = `${code} ${url}`;
			const [value, unit] = formatContentLength(contentLength);
			const right = " " + unit.padEnd(3, " ");
			if (left.length + 2 + value.length + right.length > COLS) left = left.slice(0, COLS - (left.length + value.length + right.length) - 5) + "...";
			left = left.padEnd(COLS - (value.length + right.length));
			console.log(`${left}${value}${right}`);
			this.verboseLogResponseTimer.refresh();
			this.verboseLogResponseTotal += contentLength;
		}
	}
	verboseLogResponseTotal = 0;
	verboseLogResponseTimer = setTimeout(() => {
		if (this.verboseLogResponseTotal > 0) {
			this.verboseLogResponse("===", "group total", this.verboseLogResponseTotal);
			this.verboseLogResponseTotal = 0;
		}
	}, 250);
};
function httpWriteError(res, code) {
	const message = htmlEscape(NodeHttp.STATUS_CODES[code] ?? "Internal Server Error");
	const content = fileContentToBytes("".concat(`<!DOCTYPE html>`, `<html>`, `<head>`, `<meta charset="utf-8">`, `<title>${message}</title>`, CANDLE_SCRIPT_TAG, `</head>`, `<body><h1>${message}</h1></body>`, `</html>`));
	res.statusCode = code;
	res.setHeader("Content-Type", "text/html");
	res.setHeader("Content-Length", content.byteLength);
	res.end(content);
}
const HTML_ENTITIES = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	"\"": "&quot;"
};
function htmlEscape(value) {
	return value.replaceAll(/[&<>"]/g, (m) => HTML_ENTITIES[m] ?? m);
}
function printUsageError(...message) {
	process.stderr.write("".concat(...message, `\nTry 'candle serve --help' for more information.\n`));
	process.exitCode = 1;
}
function formatContentLength(length) {
	let value;
	let unit;
	if (length < 768) {
		value = length.toFixed(0);
		unit = "B";
	} else if (length < 768 * 1024) {
		value = (length / 1024).toFixed(2);
		unit = "KiB";
	} else {
		value = (length / (1024 * 1024)).toFixed(2);
		unit = "MiB";
	}
	return [value, unit];
}
//#endregion
export { main };
