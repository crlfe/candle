/**
 * Type that can be awaited to produce T.
 */
export type MaybeAsync<T> = T | PromiseLike<T>;

/**
 * Type that is either null or undefined.
 */
export type Nullish = null | undefined;

export type RecursiveRecord<K extends PropertyKey, V> = { [key in K]: V | RecursiveRecord<K, V> };

/**
 * Type of a generic imported module.
 */
export interface ModuleNamespace {
  [Symbol.toStringTag]: "Module";
  default?: unknown;
  [key: PropertyKey]: unknown;
}

export function asArray<T>(value: T | T[] | Nullish): T[] {
  if (isNullish(value)) {
    return [];
  } else if (!Array.isArray(value)) {
    return [value];
  } else {
    return value;
  }
}

/**
 * Assures the type checker that a value is not nullish.
 *
 * If the NODE_ENV environment variable is set to "development", this will
 * throw an exception if the value is actually null or undefined.
 */
export function assertNotNullish<T>(value: T | Nullish): T {
  if (process.env.NODE_ENV === "development" && isNullish(value)) {
    throw new TypeError();
  }
  return value as T;
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
 * Determines whether a target value is nullish (null or undefined).
 */
export function isNullish(value: unknown): value is Nullish {
  return value == null;
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
