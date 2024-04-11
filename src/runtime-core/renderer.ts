import {
    ComponentInstance,
    createComponentInstance,
    setupComponent,
} from "./component";
import { VNode, createVNode } from "./vnode";

export function render(vnode: VNode, container: HTMLElement) {
    // patch
    patch(vnode, container);
}

/**
 * 将 vnode 渲染到 container 中
 */
function patch(vnode: VNode, container: HTMLElement) {
    if (typeof vnode.type === "string") {
        processElement(vnode, container);
    } else {
        processComponent(vnode, container);
    }
}

function processElement(vnode: VNode, container: HTMLElement) {
    mountElement(vnode, container);
}

function mountElement(vnode: VNode, container: HTMLElement) {
    // 创建元素
    const el = (vnode.el = document.createElement(vnode.type) as HTMLElement);

    // 挂载子节点
    mountChildren(vnode, el);

    // 处理属性
    const { props } = vnode;
    for (const key in props) {
        el.setAttribute(key, props[key]);
    }

    // 挂载
    container.append(el);
}

/**
 * 将 vnode 的子节点挂载到 container 中
 */
function mountChildren(vnode: VNode, container: HTMLElement) {
    const { children } = vnode;
    if (typeof children === "string") {
        container.textContent = children;
    } else if (children instanceof Array) {
        children.forEach((vnodeChild) => {
            patch(vnodeChild, container);
        });
    } else if (typeof children === "object") {
        patch(children, container);
    }
}

function processComponent(vnode: VNode, container: HTMLElement) {
    mountComponent(vnode, container);
}

function mountComponent(initialVnode: VNode, container: HTMLElement) {
    const instance = createComponentInstance(initialVnode);

    setupComponent(instance);
    setupRenderEffect(instance, initialVnode, container);
}

function setupRenderEffect(
    instance: ComponentInstance,
    initialVnode: VNode,
    container: HTMLElement,
) {
    const { proxy } = instance;
    const subTree = instance.render!.call(proxy);

    // vnode -> component -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);

    // 子节点已经渲染完成
    initialVnode.el = subTree.el;
}
