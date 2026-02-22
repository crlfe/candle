export interface ModuleNamespace {
  [Symbol.toStringTag]: "Module";
  default?: unknown;
  [key: PropertyKey]: unknown;
}
