import * as NodeFS$1 from "node:fs";
import * as NodePath$1 from "node:path";
//#region util/types.ts
function asArray(value) {
	if (isNullish(value)) return [];
	else if (!Array.isArray(value)) return [value];
	else return value;
}
/**
* Assures the type checker that a value is not nullish.
*
* If the NODE_ENV environment variable is set to "development", this will
* throw an exception if the value is actually null or undefined.
*/
function assertNotNullish(value) {
	if (process.env.NODE_ENV === "development" && isNullish(value)) throw new TypeError();
	return value;
}
/**
* Determines whether a target value is a function.
*/
function isFunction(target) {
	return typeof target === "function";
}
/**
* Determines whether a target value is an imported module.
*/
function isModuleNamespace(value) {
	return isObjectWith(value, Symbol.toStringTag) && value[Symbol.toStringTag] === "Module";
}
/**
* Determines whether a target value is nullish (null or undefined).
*/
function isNullish(value) {
	return value == null;
}
/**
* Determines whether a target value is a non-null object with the
* specified property.
*/
function isObjectWith(target, key) {
	return typeof target === "object" && target != null && key in target;
}
/**
* Determines whether a target value is a non-null object with the
* specified property set to a specified value.
*/
function isObjectWithValue(target, key, value) {
	return isObjectWith(target, key) && target[key] === value;
}
/**
* Determines whether a target value is promise-like. This is often
*/
function isPromiseLike(target) {
	return isObjectWith(target, "then") && isFunction(target.then);
}
//#endregion
//#region util/sorted-map.ts
var SortedMap = class {
	[Symbol.toStringTag] = "SortedMap";
	#entries;
	constructor(iterable) {
		const entries = iterable ? Array.from(iterable, (e) => [e[0], e[1]]) : [];
		entries.sort((a, b) => cmp(a[0], b[0]));
		this.#entries = entries;
	}
	get size() {
		return this.#entries.length;
	}
	clear() {
		this.#entries.length = 0;
	}
	has(key) {
		const entry = this.#entries[this.#indexOf(key)];
		return entry != null && entry[0] === key;
	}
	get(key) {
		const entry = this.#entries[this.#indexOf(key)];
		return entry != null && entry[0] === key ? entry[1] : void 0;
	}
	set(key, value) {
		const i = this.#indexOf(key);
		const entry = this.#entries[i];
		if (entry != null && entry[0] === key) entry[1] = value;
		else this.#entries.splice(i, 0, [key, value]);
		return this;
	}
	delete(key) {
		const i = this.#indexOf(key);
		const entry = this.#entries[i];
		if (entry != null && entry[0] === key) {
			this.#entries.splice(i, 1);
			return true;
		} else return false;
	}
	entries() {
		return this.#entries.values();
	}
	keys() {
		return this.#entries.values().map((e) => e[0]);
	}
	values() {
		return this.#entries.values().map((e) => e[1]);
	}
	forEach(callback, thisArg) {
		for (const entry of this.#entries) callback.call(thisArg, entry[1], entry[0], this);
	}
	[Symbol.iterator]() {
		return this.entries();
	}
	/**
	* Finds the index of the entry that would contain the requested key.
	*/
	#indexOf(key) {
		let lo = 0;
		let hi = this.#entries.length;
		while (lo < hi) {
			const i = hi + lo >> 1;
			const curr = assertNotNullish(assertNotNullish(this.#entries[i])[0]);
			if (curr < key) lo = i + 1;
			else if (curr > key) hi = i;
			else return i;
		}
		return lo;
	}
};
function cmp(a, b) {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}
//#endregion
//#region util/path-tree.ts
var PathTree = class PathTree {
	[Symbol.toStringTag] = "PathTree";
	#entries = new SortedMap();
	constructor(iterable) {
		if (iterable) for (const [k, v] of iterable) this.set(k, v);
	}
	get size() {
		return this.#entries.size;
	}
	clear() {
		this.#entries.clear();
	}
	has(key) {
		const resolved = this.#resolve(key, false);
		return resolved != null && resolved.tree.#entries.has(resolved.name);
	}
	get(key) {
		const resolved = this.#resolve(key, false);
		if (!resolved) return;
		else if (resolved.name === ".") return resolved.tree;
		else return resolved.tree.#entries.get(resolved.name);
	}
	set(key, value) {
		const resolved = this.#resolve(key, true);
		resolved.tree.#entries.set(resolved.name, value);
		return this;
	}
	delete(key) {
		const resolved = this.#resolve(key, true);
		return resolved != null && resolved.tree.#entries.delete(resolved.name);
	}
	move(src, dst) {
		const srcRes = this.#resolve(src, false);
		if (!srcRes) return false;
		const srcValue = srcRes.tree.#entries.get(srcRes.name);
		if (srcValue === void 0) return false;
		const dstRes = this.#resolve(dst, true);
		if (srcRes.name === "." || dstRes.name === ".") throw new Error("TODO");
		if (srcRes.tree !== dstRes.tree || srcRes.name !== dstRes.name) {
			dstRes.tree.#entries.set(dstRes.name, srcValue);
			srcRes.tree.#entries.delete(srcRes.name);
		}
		return true;
	}
	entries() {
		return this.#entries.entries();
	}
	keys() {
		return this.#entries.keys();
	}
	values() {
		return this.#entries.values();
	}
	forEach(callback, thisArg) {
		for (const entry of this.#entries) callback.call(thisArg, entry[1], entry[0], this);
	}
	toDeepObject(options) {
		const dst = options?.dst ?? Object.create(null);
		const visited = options?.visited ?? /* @__PURE__ */ new Map();
		visited.set(this, dst);
		for (const [k, v] of this.#entries) if (v instanceof PathTree) {
			let child = visited.get(v);
			if (isNullish(child)) child = v.toDeepObject({ visited });
			dst[k] = child;
		} else dst[k] = v;
		return dst;
	}
	toFlatEntries(options) {
		const prefix = options?.prefix ?? "";
		const dst = options?.dst ?? [];
		const visited = options?.visited ?? /* @__PURE__ */ new Set();
		if (visited.has(this)) throw new Error("Cyclic tree detected");
		visited.add(this);
		for (const [k, v] of this.#entries) {
			const path = prefix ? prefix + "/" + k : k;
			if (v instanceof PathTree) v.toFlatEntries({
				prefix: path,
				dst,
				visited
			});
			else dst.push([path, v]);
		}
		return dst;
	}
	toFlatObject(options) {
		const prefix = options?.prefix ?? "";
		const dst = options?.dst ?? Object.create(null);
		const visited = options?.visited ?? /* @__PURE__ */ new Set();
		if (visited.has(this)) throw new Error("Cyclic tree detected");
		visited.add(this);
		for (const [k, v] of this.#entries) {
			const path = prefix ? prefix + "/" + k : k;
			if (v instanceof PathTree) v.toFlatObject({
				prefix: path,
				dst,
				visited
			});
			else dst[path] = v;
		}
		return dst;
	}
	[Symbol.iterator]() {
		return this.entries();
	}
	#resolve(key, mkdirs) {
		key = NodePath$1.posix.resolve("/", ...asArray(key));
		let tree = this;
		const segments = key.split("/").filter((s) => s && s !== "." && s !== "..");
		const name = segments.pop() ?? ".";
		for (const segment of segments) {
			let value = tree.#entries.get(segment);
			if (value instanceof PathTree) tree = value;
			else if (mkdirs) {
				const next = new PathTree();
				tree.#entries.set(segment, next);
				tree = next;
			} else return null;
		}
		return {
			tree,
			name
		};
	}
};
//#endregion
//#region util/files.ts
async function treeStat(path) {
	const dir = await NodeFS$1.promises.opendir(path).catch((err) => {
		if (isObjectWithValue(err, "code", "ENOTDIR")) return null;
		throw err;
	});
	if (!dir) return await NodeFS$1.promises.stat(path);
	const dst = new PathTree();
	for await (const entry of dir) {
		const entryPath = NodePath$1.join(entry.parentPath, entry.name);
		if (entry.isDirectory()) dst.set(entry.name, await treeStat(entryPath));
		else dst.set(entry.name, await NodeFS$1.promises.stat(entryPath));
	}
	return dst;
}
//#endregion
//#region util/path-map.ts
var PathMap = class PathMap {
	static fromObject(obj, isValue) {
		isValue ??= (target) => {
			if (typeof target !== "object") return true;
			const p = Object.getPrototypeOf(target);
			return p !== Object.prototype && p != null;
		};
		const root = new PathMap();
		const stack = [[root.#root, Object.entries(obj).values()]];
		const visited = new Set([obj]);
		while (true) {
			const top = stack.at(-1);
			if (!top) break;
			const [dst, iter] = top;
			const result = iter.next();
			if (result.done) {
				stack.pop();
				continue;
			}
			const [k, v] = result.value;
			if (isValue(v)) if (!k) dst.value = v;
			else dst.map.set(k, v);
			else {
				if (visited.has(v)) throw new TypeError("cyclic");
				visited.add(v);
				if (!k) stack.push([dst, Object.entries(v).values()]);
				else {
					let child = dst.map.get(k);
					if (!(child instanceof PathMapNode)) {
						let childNode = new PathMapNode();
						childNode.value = child;
						dst.map.set(k, childNode);
						child = childNode;
					}
					stack.push([child, Object.entries(v).values()]);
				}
			}
		}
		return root;
	}
	[Symbol.toStringTag] = "PathMap";
	#root = new PathMapNode();
	constructor(iterable) {
		if (iterable) for (const [k, v] of iterable) this.set(k, v);
	}
	get size() {
		let count = 0;
		for (const _ of this.entries()) count += 1;
		return count;
	}
	clear() {
		this.#root.value = void 0;
		this.#root.map.clear();
	}
	has(key) {
		return this.get(key) !== void 0;
	}
	get(key) {
		return resolveNode(this.#root, key, false)?.value;
	}
	set(key, value) {
		const resolved = resolveNode(this.#root, key, true);
		if (!resolved.name) resolved.node.value = value;
		else resolved.node.map.set(resolved.name, value);
		return this;
	}
	delete(key) {
		const resolved = resolveNode(this.#root, key, false);
		let changed = false;
		if (!resolved) {} else if (!resolved.name) {
			if (resolved.node.value !== void 0) {
				resolved.node.value = void 0;
				changed = true;
			}
		} else changed = resolved.node.map.delete(resolved.name);
		return changed;
	}
	subtree(key) {
		const resolved = resolveNode(this.#root, key, true);
		const result = new PathMap();
		if (!resolved.name) result.#root = resolved.node;
		else {
			result.#root.value = resolved.value;
			resolved.node.map.set(resolved.name, result.#root);
		}
		return result;
	}
	forEach(callback, thisArg) {
		for (const [k, v] of this.entries()) callback.call(thisArg, v, k, this);
	}
	*entries() {
		if (this.#root.value !== void 0) yield ["", this.#root.value];
		const stack = [["", this.#root.map.entries()]];
		while (true) {
			const top = stack.at(-1);
			if (!top) break;
			const [prefix, iter] = top;
			const result = iter.next();
			if (result.done) {
				stack.pop();
				continue;
			}
			const [k, v] = result.value;
			if (v instanceof PathMapNode) {
				if (v.value !== void 0) yield [prefix + k, v.value];
				stack.push([prefix + k + "/", v.map.entries()]);
			} else yield [prefix + k, v];
		}
	}
	keys() {
		return this.entries().map((e) => e[0]);
	}
	values() {
		return this.entries().map((e) => e[1]);
	}
	[Symbol.iterator]() {
		return this.entries();
	}
	toObject() {
		const root = Object.create(null);
		const stack = [[root, this.#root.map.entries()]];
		if (this.#root.value !== void 0) root[""] = this.#root.value;
		while (true) {
			const top = stack.at(-1);
			if (!top) break;
			const [dst, iter] = top;
			const result = iter.next();
			if (result.done) {
				stack.pop();
				continue;
			}
			const [k, v] = result.value;
			if (v instanceof PathMapNode) {
				if (v.map.size) {
					const child = Object.create(null);
					dst[k] = child;
					if (v.value !== void 0) child[""] = v.value;
					stack.push([child, v.map.entries()]);
				} else if (v.value !== void 0) dst[k] = v.value;
			} else dst[k] = v;
		}
		return root;
	}
};
var PathMapNode = class {
	value;
	map = new SortedMap();
};
function resolveNode(root, path, write) {
	path = NodePath$1.posix.resolve("/", ...asArray(path));
	const segments = path.split("/").filter((s) => s !== "" && s !== "." && s !== "..");
	let name = segments.pop() ?? "";
	let node = root;
	for (const segment of segments) {
		const child = node.map.get(segment);
		if (child instanceof PathMapNode) node = child;
		else if (write) {
			let childNode = new PathMapNode();
			childNode.value = child;
			node.map.set(segment, childNode);
			node = childNode;
		} else return;
	}
	let value;
	if (!name || name === ".") {
		name = "";
		value = node.value;
	} else {
		value = node.map.get(name);
		if (value instanceof PathMapNode) {
			node = value;
			name = "";
			value = value.value;
		}
	}
	return {
		node,
		name,
		value
	};
}
//#endregion
//#region util/urls.ts
/**
* Splits the query and fragment from a URL.
*
* The returned search value will include the leading question mark if a
* search is present in the URL, and otherwise be the empty string.
*
* The returned hash value will include the leading hash mark if a hash is
* present in the URL, and otherwise be the empty string.
*
* @returns a tuple containing the base URL, search, and hash.
*/
function urlSplit(url) {
	const h = url.indexOf("#");
	const baseAndSearch = h < 0 ? url : url.slice(0, h);
	const hash = h < 0 ? "" : url.slice(h);
	const q = url.indexOf("?");
	return [
		q < 0 ? baseAndSearch : baseAndSearch.slice(0, q),
		q < 0 ? "" : baseAndSearch.slice(q),
		hash
	];
}
//#endregion
export { PathMap, PathTree, SortedMap, asArray, assertNotNullish, isFunction, isModuleNamespace, isNullish, isObjectWith, isObjectWithValue, isPromiseLike, treeStat, urlSplit };
