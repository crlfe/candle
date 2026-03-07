import { i as invalidateModule, n as ensureModuleInfo, r as hotAllowShutdown, t as ensureHotHooksRegistered } from "./a/hooks-DwcgAoO1.js";
//#region hot/index.ts
var HotImpl = class {
	#meta;
	constructor(meta) {
		this.#meta = meta;
	}
	accept(specifier, callback) {
		ensureModuleInfo(this.#meta.url).acceptors.push([new URL(specifier, this.#meta.url).href, callback]);
	}
	import(specifier) {
		const resolved = this.#meta.resolve(specifier);
		let promise = import(resolved).then((mod) => ({
			done: false,
			value: mod
		}), (err) => {
			console.error(err.message);
			return {
				done: false,
				value: void 0
			};
		});
		let nextUpdate = Promise.withResolvers();
		this.accept(resolved, (mod) => {
			nextUpdate.resolve({
				done: false,
				value: mod
			});
			promise = nextUpdate.promise;
			nextUpdate = Promise.withResolvers();
		});
		return {
			[Symbol.asyncIterator]() {
				return this;
			},
			async next() {
				const result = await promise;
				promise = nextUpdate.promise;
				return result;
			},
			async return(value) {
				nextUpdate.resolve({
					done: true,
					value
				});
				promise = nextUpdate.promise;
				return await promise;
			},
			async [Symbol.dispose]() {
				nextUpdate.resolve({
					done: true,
					value: void 0
				});
				promise = nextUpdate.promise;
			}
		};
	}
	invalidate(specifier) {
		invalidateModule(this.#meta.resolve(specifier));
	}
};
function createHot(meta) {
	ensureHotHooksRegistered();
	return new HotImpl(meta);
}
//#endregion
export { createHot, hotAllowShutdown };
