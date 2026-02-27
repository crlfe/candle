export interface ModuleNamespace {
  [Symbol.toStringTag]: "Module";
  default?: unknown;
  [key: PropertyKey]: unknown;
}

export function isFunction(target: unknown): target is Function {
  return typeof target === "function";
}

export function isModuleNamespace(value: unknown): value is ModuleNamespace {
  return isObjectWith(value, Symbol.toStringTag) && value[Symbol.toStringTag] === "Module";
}

export function isObjectWith<K extends PropertyKey>(
  target: unknown,
  key: K,
): target is { [key in K]: unknown } {
  return typeof target === "object" && target != null && key in target;
}

export function isObjectWithValue<K extends PropertyKey, V extends unknown>(
  target: unknown,
  key: K,
  value: V,
): target is { [key in K]: V } {
  return isObjectWith(target, key) && target[key] === value;
}

export function isPromiseLike(target: unknown): target is PromiseLike<unknown> {
  return isObjectWith(target, "then") && isFunction(target.then);
}
