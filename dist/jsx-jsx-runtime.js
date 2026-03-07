//#region jsx/jsx-runtime.ts
const VNODE_TAG = Symbol();
const isVNode = (value) => {
	return typeof value === "object" && value != null && VNODE_TAG in value;
};
const jsx = (tag, props) => ({
	[VNODE_TAG]: tag,
	...props
});
const Fragment = (props) => props.children;
//#endregion
export { Fragment, VNODE_TAG, isVNode, jsx, jsx as jsxDEV, jsx as jsxs };
