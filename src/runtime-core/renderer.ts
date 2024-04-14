import { ShapeFlags } from "../shared/ShapeFlags";
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
    const { shapeFlag } = vnode;
    if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container);
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container);
    }
}

function processElement(vnode: VNode, container: HTMLElement) {
    mountElement(vnode, container);
}

function mountElement(vnode: VNode, container: HTMLElement) {
    // 创建元素
    const el = (vnode.el = document.createElement(
        vnode.type as string,
    ) as HTMLElement);

    // 挂载子节点
    mountChildren(vnode, el);

    // 处理属性
    const { props } = vnode;
    for (const key in props) {
        const val = props[key];
        const isOn = (key: string) => /^on[A-Z]/.test(key);
        if (isOn(key)) {
            const event = key.slice(2).toLowerCase();
            el.addEventListener(event, val);
        } else {
            el.setAttribute(key, val);
        }
    }

    // 挂载
    container.append(el);
}

/**
 * 将 vnode 的子节点挂载到 container 中
 */
function mountChildren(vnode: VNode, container: HTMLElement) {
    const { shapeFlag, children } = vnode;
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = children;
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        children.forEach((vnodeChild) => {
            patch(vnodeChild, container);
        });
    } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
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
