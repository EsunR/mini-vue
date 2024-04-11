import { VNode, createVNode } from "./vnode";

export function h(
    type: VNode["type"],
    props?: VNode["props"],
    children?: VNode["children"],
) {
    return createVNode(type, props, children);
}
