import { assertNotNullish, isObjectWith, urlSplit } from "../util.js";
import { findPackageJSON, registerHooks } from "node:module";
import { URLSearchParams, fileURLToPath, pathToFileURL } from "node:url";
import * as NodeFS$1 from "node:fs";
import * as NodePath$1 from "node:path";
import MagicString from "magic-string";
import { parseSync, visitorKeys } from "oxc-parser";
//#region hot/state.ts
const modules = /* @__PURE__ */ new Map();
const watchers = /* @__PURE__ */ new Map();
let unrefWatchers = false;
let watchChangedModules = /* @__PURE__ */ new Set();
const watchChangedModulesTimer = setTimeout(onWatchSettled, 50);
function hotAllowShutdown() {
	for (const watcher of watchers.values()) watcher.unref();
	unrefWatchers = true;
}
function ensureModuleInfo(url) {
	let info = modules.get(url);
	if (!info) {
		info = {
			ts: void 0,
			dependents: /* @__PURE__ */ new Set(),
			acceptors: []
		};
		modules.set(url, info);
		if (url.startsWith("file://") && !url.includes("/node_modules/")) {
			const dir = NodePath$1.dirname(fileURLToPath(url));
			if (!watchers.has(dir)) {
				const watcher = NodeFS$1.watch(dir, (type, name) => onWatchChanged(dir, type, name));
				if (unrefWatchers) watcher.unref();
				watchers.set(dir, watcher);
			}
		}
	}
	return info;
}
function getModuleInfo(url) {
	return modules.get(url);
}
function onWatchChanged(dir, type, name) {
	if (name) {
		const url = pathToFileURL(NodePath$1.resolve(dir, name)).href;
		if (modules.has(url)) invalidateModule(url);
	}
}
function invalidateModule(url) {
	watchChangedModules.add(url);
	watchChangedModulesTimer.refresh();
}
async function onWatchSettled() {
	const urls = watchChangedModules;
	watchChangedModules = /* @__PURE__ */ new Set();
	const now = Date.now();
	let unhandledUpdate = false;
	for (const url of urls) {
		const info = getModuleInfo(url);
		if (info) {
			info.ts = now;
			if (!info.dependents.size) unhandledUpdate = true;
			let updated = await import(url).catch((err) => {
				console.error(err.message);
			});
			for (const parentURL of info.dependents) {
				const parentInfo = getModuleInfo(parentURL);
				let accepted = false;
				if (parentInfo) {
					for (const acceptor of parentInfo.acceptors) if (acceptor[0] === url) try {
						await acceptor[1](updated);
						accepted = true;
					} catch (err) {
						console.error(isObjectWith(err, "message") ? err.message : err);
					}
				}
				if (!accepted) urls.add(parentURL);
			}
		}
	}
	if (unhandledUpdate) {
		function doShutdown() {
			process.exit(0);
		}
		if (!process.send) process.stderr.write("[Candle] Restart required by code changes\n", doShutdown);
		else process.send("hot:reload", doShutdown);
	}
}
//#endregion
//#region hot/hooks.ts
const IGNORE_URL_PREFIX = import.meta.url.replace(/\/[^/]*$/, "/");
const TIMESTAMP_PARAM = "ts";
function sourceAsString(source) {
	if (typeof source !== "string") source = new TextDecoder().decode(source);
	return source;
}
function traverse(node, visitor) {
	if (node != null) {
		Reflect.get(visitor, node.type)?.(node);
		for (const key of visitorKeys[node.type] ?? []) {
			let children = Reflect.get(node, key) ?? [];
			if (!Array.isArray(children)) children = [children];
			for (const child of children) traverse(child, visitor);
		}
		Reflect.get(visitor, `${node.type}:exit`)?.(node);
	}
}
const hotHooks = {
	resolve(specifier, context, next) {
		let resolved;
		try {
			resolved = next(specifier, context);
		} catch (err) {
			if (isObjectWith(err, "code") && err.code === "ERR_MODULE_NOT_FOUND") resolved = {
				url: new URL(specifier, context.parentURL).href,
				importAttributes: context.importAttributes
			};
			else throw err;
		}
		if (!resolved.url.startsWith("file://")) return resolved;
		const [id, search] = urlSplit(resolved.url);
		if (context.parentURL && !context.parentURL.startsWith(IGNORE_URL_PREFIX)) ensureModuleInfo(id).dependents.add(urlSplit(context.parentURL)[0]);
		const timestamp = getModuleInfo(id)?.ts;
		const searchParams = new URLSearchParams(search);
		if (timestamp != null) searchParams.set(TIMESTAMP_PARAM, timestamp.toString());
		else searchParams.delete(TIMESTAMP_PARAM);
		resolved.url = id;
		if (searchParams.size) resolved.url += `?${searchParams}`;
		return resolved;
	},
	load(url, context, next) {
		const loaded = next(url, context);
		if ((loaded.format === "module" || loaded.format === "module-typescript") && loaded.source) {
			const filename = fileURLToPath(url);
			const source = sourceAsString(loaded.source);
			const parsed = parseSync(filename, source);
			if (parsed.errors.length) throw new Error(`Failed to parse ${filename}`, { cause: parsed.errors });
			const createHotId = "__candle_createHot";
			const importFrom = JSON.stringify(urlSplit(import.meta.url)[0].endsWith(".ts") ? import.meta.resolve("#hot") : NodePath$1.join(assertNotNullish(findPackageJSON(import.meta.url)), "../dist/hot.js"));
			let magic = new MagicString(source, { filename });
			let haveInit = false;
			for (const outer of parsed.program.body) traverse(outer, { MetaProperty(node) {
				if (node.meta.type === "Identifier" && node.meta.name === "import" && node.property.type === "Identifier" && node.property.name === "meta") {
					if (!haveInit) {
						haveInit = true;
						magic = magic.prependRight(outer.start, `import.meta.hot = ${createHotId}(import.meta);\n`);
					}
				}
			} });
			if (magic.hasChanged()) {
				magic = magic.prepend(`import { createHot as ${createHotId} } from ${importFrom};\n`);
				return {
					format: loaded.format,
					source: magic.toString() + `\n//# sourceMappingURL=` + magic.generateMap().toUrl()
				};
			}
		}
		return loaded;
	}
};
let hotHooksRegistered = false;
function ensureHotHooksRegistered() {
	if (!hotHooksRegistered) {
		hotHooksRegistered = true;
		registerHooks(hotHooks);
	}
}
//#endregion
export { invalidateModule as i, ensureModuleInfo as n, hotAllowShutdown as r, ensureHotHooksRegistered as t };
