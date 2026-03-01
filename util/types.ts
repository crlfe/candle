/**
 * Type that can be awaited to produce T.
 */
export type MaybeAsync<T> = T | PromiseLike<T>;

/**
 * Type of a generic imported module.
 */
export interface ModuleNamespace {
  [Symbol.toStringTag]: "Module";
  default?: unknown;
  [key: PropertyKey]: unknown;
}

/**
 * Determines whether a target value is a function.
 */
export function isFunction(target: unknown): target is Function {
  return typeof target === "function";
}

/**
 * Determines whether a target value is an imported module.
 */
export function isModuleNamespace(value: unknown): value is ModuleNamespace {
  return isObjectWith(value, Symbol.toStringTag) && value[Symbol.toStringTag] === "Module";
}

/**
 * Determines whether a target value is a non-null object with the
 * specified property.
 */
export function isObjectWith<K extends PropertyKey>(
  target: unknown,
  key: K,
): target is { [key in K]: unknown } {
  return typeof target === "object" && target != null && key in target;
}

/**
 * Determines whether a target value is a non-null object with the
 * specified property set to a specified value.
 */
export function isObjectWithValue<K extends PropertyKey, V extends unknown>(
  target: unknown,
  key: K,
  value: V,
): target is { [key in K]: V } {
  return isObjectWith(target, key) && target[key] === value;
}

/**
 * Determines whether a target value is promise-like. This is often
 */
export function isPromiseLike(target: unknown): target is PromiseLike<unknown> {
  return isObjectWith(target, "then") && isFunction(target.then);
}
