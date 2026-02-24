export interface ModuleNamespace {
  [Symbol.toStringTag]: "Module";
  default?: unknown;
  [key: PropertyKey]: unknown;
}

export function isObjectWith<K extends PropertyKey>(
  target: unknown,
  key: K,
): target is { [key in K]: unknown } {
  return typeof target === "object" && target != null && key in target;
}
