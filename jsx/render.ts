import { type Children, isVNode, VNODE_TAG } from "./jsx-runtime.ts";

export const NS_HTML = "http://www.w3.org/1999/xhtml";
export const NS_SVG = "http://www.w3.org/2000/svg";
export const NS_MATHML = "http://www.w3.org/1998/Math/MathML";

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
  "wbr",
]);

const ENTITIES = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
]);

export interface JsxToStringsOptions {
  htmlVoidElements?: boolean;
  selfClosing?: boolean;
}

export function* jsxToStrings(src: Children, options?: JsxToStringsOptions): Generator<string> {
  if (src == null || typeof src === "boolean") {
    // Nothing to do.
  } else if (typeof src === "string") {
    yield src.replaceAll(/[&<>]/g, (m) => ENTITIES.get(m) ?? m);
  } else if (isVNode(src)) {
    const { [VNODE_TAG]: tag, children, ...attrs } = src;
    if (typeof tag === "function") {
      yield* jsxToStrings(tag({ children, ...attrs }), options);
      return;
    }
    yield `<${tag}`;
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) {
        // Nothing to do.
      } else if (value === true) {
        yield ` ${key}`;
      } else {
        const escaped = String(value).replaceAll(/[&<>"]/g, (m) => ENTITIES.get(m) ?? m);
        yield ` ${key}="${escaped}"`;
      }
    }

    const noChildren = children == null || (Array.isArray(children) && !children.length);
    if (options?.htmlVoidElements && VOID_ELEMENTS.has(tag)) {
      if (!noChildren) {
        throw new TypeError("HTML void elements must not have children");
      }
      yield `>`;
    } else if (options?.selfClosing && noChildren) {
      yield ` />`;
    } else {
      yield `>`;
      yield* jsxToStrings(children, options);
      yield `</${tag}>`;
    }
  } else if (Array.isArray(src)) {
    for (const item of src) {
      yield* jsxToStrings(item, options);
    }
  } else {
    throw new TypeError();
  }
}

export function jsxToHtml(src: Children): string {
  return Array.from(jsxToStrings(src, { htmlVoidElements: true })).join("");
}

export function jsxToXml(src: Children): string {
  return Array.from(jsxToStrings(src, { selfClosing: true })).join("");
}
