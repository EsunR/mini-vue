import { ShapeFlags } from "../shared/ShapeFlags";
import {
    ComponentInstance,
    createComponentInstance,
    setupComponent,
} from "./component";
import { createAppAPI } from "./createApp";
import { Fragment, Text, VNode } from "./vnode";

export interface RendererOptions {
    createElement: (type: string) => HTMLElement;
    patchProp: (el: HTMLElement, key: string, value: any) => void;
    insert: (el: HTMLElement, container: HTMLElement) => void;
}

export type Render = (
    vnode: VNode,
    container: HTMLElement,
    parentComponent: ComponentInstance | null,
) => void;

export function createRenderer(options: RendererOptions) {
    const { createElement, patchProp, insert } = options;

    const render: Render = (vnode, container, parentComponent) => {
        // patch
        patch(vnode, container, parentComponent);
    };

    /**
     * 将 vnode 渲染到 container 中
     */
    function patch(
        vnode: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        const { shapeFlag, type } = vnode;

        switch (type) {
            case Fragment:
                processFragment(vnode, container, parentComponent);
                break;
            case Text:
                processText(vnode, container);
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(vnode, container, parentComponent);
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(vnode, container, parentComponent);
                }
                break;
        }
    }

    function processText(vnode: VNode, container: HTMLElement) {
        const { children } = vnode;
        const textNode = (vnode.el = document.createTextNode(children));
        container.append(textNode);
    }

    function processFragment(
        vnode: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        mountChildren(vnode, container, parentComponent);
    }

    function processElement(
        vnode: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        mountElement(vnode, container, parentComponent);
    }

    function mountElement(
        vnode: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        // 创建元素
        const el = (vnode.el = createElement(vnode.type as string));

        // 挂载子节点
        mountChildren(vnode, el, parentComponent);

        // 处理属性
        const { props } = vnode;
        for (const key in props) {
            const val = props[key];
            patchProp(el, key, val);
        }

        // 挂载
        // container.append(el);
        insert(el, container);
    }

    /**
     * 将 vnode 的子节点挂载到 container 中
     */
    function mountChildren(
        vnode: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        const { shapeFlag, children } = vnode;
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            container.textContent = children;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            children.forEach((vnodeChild: VNode) => {
                patch(vnodeChild, container, parentComponent);
            });
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            patch(children, container, parentComponent);
        }
    }

    function processComponent(
        vnode: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        mountComponent(vnode, container, parentComponent);
    }

    function mountComponent(
        initialVnode: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        const instance = createComponentInstance(initialVnode, parentComponent);

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
        patch(subTree, container, instance);

        // 子节点已经渲染完成
        initialVnode.el = subTree.el;
    }

    return {
        createApp: createAppAPI(render),
    };
}
