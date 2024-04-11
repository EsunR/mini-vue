export interface VNode {
    type: any;
    el: null | HTMLElement;
    props?: Record<string, any>;
    children?: any;
}

export function createVNode(
    type: any,
    props?: VNode["props"],
    children?: VNode["children"],
) {
    const vnode: VNode = {
        type,
        props,
        children,
        el: null,
    };

    return vnode;
}
