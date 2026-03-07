import { isFunction, isModuleNamespace, isObjectWith, isPromiseLike, urlSplit } from "../util.js";
import { isVNode } from "../jsx-jsx-runtime.js";
import { jsxToHtml, jsxToXml } from "../jsx.js";
import { fileURLToPath } from "node:url";
import NodeFS from "node:fs";
import * as NodePath$1 from "node:path";
import NodePath from "node:path";
import { lookup } from "mime-types";
//#region cli/files.ts
const INPUT_SUFFIXES = [
	".js",
	".jsx",
	".ts",
	".tsx",
	".json"
];
function normalizePath(path) {
	if (path.startsWith("file://")) path = fileURLToPath(path);
	return NodePath.normalize(path);
}
async function findInputFile(path) {
	path = normalizePath(path);
	let resolved = NodePath.resolve(path);
	let stats = await tryStat(resolved);
	if (stats?.isFile()) return resolved;
	if (stats?.isDirectory()) resolved = NodePath.join(resolved, "index");
	for (const suffix of INPUT_SUFFIXES) {
		const curr = `${resolved}${suffix}`;
		stats = await tryStat(curr);
		if (stats?.isFile()) return curr;
	}
	return null;
}
async function tryStat(path) {
	return NodeFS.promises.stat(path).catch((err) => {
		if (isObjectWith(err, "code")) {
			if (err.code === "ENOENT" || err.code === "ENOTDIR") return null;
		}
		throw err;
	});
}
async function listFiles(path) {
	const dst = [];
	const dir = await NodeFS.promises.opendir(path, { recursive: true }).catch((err) => {
		if (isObjectWith(err, "code") && err.code === "ENOENT") return [];
		throw err;
	});
	for await (const entry of dir) if (entry.isFile()) dst.push(NodePath.relative(path, NodePath.join(entry.parentPath, entry.name)));
	dst.sort();
	return dst;
}
async function listEmptyDirectories(path) {
	const dst = [];
	async function visit(curr) {
		let empty = true;
		const entries = await NodeFS.promises.readdir(curr, { withFileTypes: true });
		entries.sort((a, b) => cmp(a.name, b.name));
		for (const entry of entries) if (!entry.isDirectory() || !await visit(NodePath.join(entry.parentPath, entry.name))) empty = false;
		if (curr !== path && empty) dst.push(NodePath.relative(path, curr));
		return empty;
	}
	await visit(path);
	return dst;
}
function cmp(a, b) {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}
//#endregion
//#region cli/tree.ts
function isFileContent(value) {
	return typeof value === "string" || value instanceof Uint8Array;
}
function fileContentToString(value) {
	if (typeof value !== "string") value = new TextDecoder().decode(value);
	return value;
}
function fileContentToBytes(value) {
	if (typeof value === "string") value = new TextEncoder().encode(value);
	return value;
}
function guessContentType(filename) {
	if (filename && /\.[cm]?[jt]sx?$/.test(filename)) return "text/javascript";
	return filename && lookup(filename) || "application/octet-stream";
}
async function follow(value) {
	while (true) if (isFunction(value)) value = await value();
	else if (isModuleNamespace(value)) value = value.default;
	else if (isPromiseLike(value)) value = await value;
	else break;
	return value;
}
async function getContent(root, url) {
	const [pathname] = urlSplit(url);
	const segments = pathname.split("/").filter((s) => s);
	if (pathname.endsWith("/")) segments.push("index.html");
	let curr = await follow(root);
	for (const segment of segments) while (curr != null) {
		if (isObjectWith(curr, segment)) {
			curr = await follow(curr[segment]);
			break;
		}
		if (isObjectWith(curr, "...")) {
			curr = await follow(curr["..."]);
			continue;
		}
		curr = void 0;
		break;
	}
	if (isVNode(curr)) if (pathname.endsWith(".html")) curr = jsxToHtml(curr);
	else curr = jsxToXml(curr);
	if (segments.at(-1) !== "index.html" && isObjectWith(curr, "index.html")) {
		segments.push("index.html");
		curr = await follow(curr["index.html"]);
	}
	if (!isFileContent(curr)) return;
	return {
		type: guessContentType(segments.at(-1)),
		data: fileContentToBytes(curr)
	};
}
async function* iterContent(root, prefix = "/") {
	let curr = await follow(root);
	if (curr == null) return;
	if (isVNode(curr)) if (prefix.endsWith(".html")) curr = jsxToHtml(curr);
	else curr = jsxToXml(curr);
	if (isFileContent(curr)) {
		yield {
			name: prefix,
			type: guessContentType(prefix),
			data: fileContentToBytes(curr)
		};
		return;
	}
	if (typeof curr === "object" && curr != null) {
		do {
			let next = void 0;
			for (const [name, value] of Object.entries(curr)) if (name === "...") next = value;
			else yield* iterContent(value, NodePath$1.posix.join(prefix, name));
			curr = await follow(next);
		} while (typeof curr === "object" && curr != null);
		return;
	}
	throw new TypeError();
}
//#endregion
export { findInputFile as a, tryStat as c, iterContent as i, fileContentToString as n, listEmptyDirectories as o, getContent as r, listFiles as s, fileContentToBytes as t };
