import { assertNotNullish, urlSplit } from "./util.js";
import { Fragment, VNODE_TAG, isVNode, jsx } from "./jsx-jsx-runtime.js";
import * as NodeModule from "node:module";
import { fileURLToPath } from "node:url";
import * as NodePath$1 from "node:path";
import { transformSync } from "oxc-transform";
//#region jsx/hooks.ts
function sourceAsString(source) {
	if (typeof source !== "string") source = new TextDecoder().decode(source);
	return source;
}
function createJsxHooks(options) {
	return {
		resolve(specifier, context, next) {
			if (specifier.startsWith("candle/")) if (urlSplit(import.meta.url)[0].endsWith(".ts")) specifier = `#${specifier.slice(7)}`;
			else specifier = NodePath$1.join(assertNotNullish(NodeModule.findPackageJSON(import.meta.url)), "../dist/", specifier.slice(7).replaceAll("/", "-") + ".js");
			return next(specifier, context);
		},
		load(url, context, next) {
			if (!/^file:\/\/[^?]+\.[cm]?[jt]sx(?:\?|$)/.test(url)) return next(url, context);
			const loaded = next(url, {
				...context,
				format: "buffer"
			});
			if (!loaded.source) throw new Error(`Module loader did not return usable source for ${JSON.stringify(url)}`);
			const transformOptions = {};
			if (options.jsxImportSource) transformOptions.jsx = { importSource: options.jsxImportSource };
			const transformed = transformSync(fileURLToPath(url), sourceAsString(loaded.source), transformOptions);
			if (transformed.errors.length) throw new Error("Failed to transform JSX source", { cause: transformed.errors });
			loaded.format = "module";
			loaded.source = transformed.code;
			return loaded;
		}
	};
}
let jsxHooksRegistered = false;
function ensureJsxHooksRegistered(options) {
	if (!jsxHooksRegistered) {
		jsxHooksRegistered = true;
		NodeModule.registerHooks(createJsxHooks(options));
	}
}
//#endregion
//#region jsx/render.ts
const NS_HTML = "http://www.w3.org/1999/xhtml";
const NS_SVG = "http://www.w3.org/2000/svg";
const NS_MATHML = "http://www.w3.org/1998/Math/MathML";
const VOID_ELEMENTS = new Set([
	"area",
	"base",
	"br",
	"col",
	"embed",
	"hr",
	"img",
	"input",
	"link",
	"meta",
	"param",
	"source",
	"track",
	"wbr"
]);
const ENTITIES = new Map([
	["&", "&amp;"],
	["<", "&lt;"],
	[">", "&gt;"],
	["\"", "&quot;"]
]);
function* jsxToStrings(src, options) {
	if (src == null || typeof src === "boolean") {} else if (typeof src === "string") yield src.replaceAll(/[&<>]/g, (m) => ENTITIES.get(m) ?? m);
	else if (isVNode(src)) {
		const { [VNODE_TAG]: tag, children, ...attrs } = src;
		if (typeof tag === "function") {
			yield* jsxToStrings(tag({
				children,
				...attrs
			}), options);
			return;
		}
		yield `<${tag}`;
		for (const [key, value] of Object.entries(attrs)) if (value == null || value === false) {} else if (value === true) yield ` ${key}`;
		else yield ` ${key}="${String(value).replaceAll(/[&<>"]/g, (m) => ENTITIES.get(m) ?? m)}"`;
		const noChildren = children == null || Array.isArray(children) && !children.length;
		if (options?.htmlVoidElements && VOID_ELEMENTS.has(tag)) {
			if (!noChildren) throw new TypeError("HTML void elements must not have children");
			yield `>`;
		} else if (options?.selfClosing && noChildren) yield ` />`;
		else {
			yield `>`;
			yield* jsxToStrings(children, options);
			yield `</${tag}>`;
		}
	} else if (Array.isArray(src)) for (const item of src) yield* jsxToStrings(item, options);
	else throw new TypeError();
}
function jsxToHtml(src) {
	return Array.from(jsxToStrings(src, { htmlVoidElements: true })).join("");
}
function jsxToXml(src) {
	return Array.from(jsxToStrings(src, { selfClosing: true })).join("");
}
//#endregion
export { Fragment, NS_HTML, NS_MATHML, NS_SVG, VNODE_TAG, ensureJsxHooksRegistered, isVNode, jsx, jsx as jsxDEV, jsx as jsxs, jsxToHtml, jsxToStrings, jsxToXml };
