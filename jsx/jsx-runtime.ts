export namespace JSX {
  export type Element = VNode;
  export type IntrinsicElements = Record<string, IntrinsicAttributes>;
  export type IntrinsicAttributes = Props;
}

export const VNODE_TAG = Symbol();

export interface VNode extends JSX.IntrinsicAttributes {
  [VNODE_TAG]: string | ((props: JSX.IntrinsicAttributes) => Children);
}

export type Tag = string | ((props: JSX.IntrinsicAttributes) => Children);
export type Props = {
  children?: Children;
  [key: string]: unknown;
};
export type Children = null | undefined | boolean | string | VNode | Children[];

export const isVNode = (value: unknown): value is VNode => {
  return typeof value === "object" && value != null && VNODE_TAG in value;
};

export const jsx = (tag: Tag, props: Props): VNode => ({
  [VNODE_TAG]: tag,
  ...props,
});

export const Fragment = (props: JSX.IntrinsicAttributes) => props.children;

export { jsx as jsxDEV, jsx as jsxs };
