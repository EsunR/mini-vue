import { ShapeFlags } from "../shared/ShapeFlags";
import { Component } from "./component";

export type VNodeType = string | Component;

export interface VNode {
    type: VNodeType;
    props: Record<string, any>;
    children: any;
    el: null | HTMLElement;
    shapeFlag: number;
}

export function createVNode(
    type: any,
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

    if (typeof children === "string") {
        vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    } else if (Array.isArray(children)) {
        vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else {
        vnode.shapeFlag |= ShapeFlags.STATEFUL_COMPONENT;
    }

    return vnode;
}

export function getShapeFlag(type: any) {
    return typeof type === "string"
        ? ShapeFlags.ELEMENT
        : ShapeFlags.STATEFUL_COMPONENT;
}
