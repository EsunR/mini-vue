import { ShapeFlags } from "../shared/ShapeFlags";
import { Component } from "./component";

export type VNodeType = string | Component | Symbol;

export interface VNode {
    type: VNodeType;
    props: Record<string, any>;
    children: any;
    el: null | HTMLElement | Text;
    shapeFlag: number;
}

export const Fragment = Symbol("Fragment");
export const Text = Symbol("Text");

/**
 * 创建 VNode 对象
*/
export function createVNode(
    type: VNodeType,
    props?: VNode["props"],
    children?: VNode["children"],
) {
    const vnode: VNode = {
        type,
        props: props || {},
        children,
        el: null,
        shapeFlag: getShapeFlag(type),
    };

    // 是否是文本子节点
    if (typeof children === "string") {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }
    // 是否是数组子节点
    else if (Array.isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }

    // VNode 是组件节点时
    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // 判断是否是插槽子节点
        if (typeof children === "object") {
            vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
        }
    }
    return vnode;
}

export function createTextVNode(text: string) {
    return createVNode(Text, {}, text);
}

export function getShapeFlag(type: any) {
    return typeof type === "string"
        ? ShapeFlags.ELEMENT
        : ShapeFlags.STATEFUL_COMPONENT;
}
