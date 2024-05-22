import { effect } from "../reactivity/effect";
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

/**
 * 供渲染器调用，传入自定义渲染 API，然后生成一个 renderer 对象
 */
export function createRenderer(options: RendererOptions) {
    const { createElement, patchProp, insert } = options;

    const render: Render = (vnode, container, parentComponent) => {
        // patch
        patch(null, vnode, container, parentComponent);
    };

    /**
     * 将 vnode 渲染到 container 中
     */
    function patch(
        n1: VNode | null,
        n2: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        const { shapeFlag, type } = n2;

        switch (type) {
            case Fragment:
                processFragment(n1, n2, container, parentComponent);
                break;
            case Text:
                processText(n1, n2, container);
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(n1, n2, container, parentComponent);
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(n1, n2, container, parentComponent);
                }
                break;
        }
    }

    // ================= Text 节点处理逻辑 | Start ====================
    function processText(n1: VNode | null, n2: VNode, container: HTMLElement) {
        const { children } = n2;
        const textNode = (n2.el = document.createTextNode(children));
        container.append(textNode);
    }
    // ================= Text 节点处理逻辑 | End ====================

    // ================= Fragment 节点处理逻辑 | Start ====================
    function processFragment(
        n1: VNode | null,
        n2: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        mountChildren(n2, container, parentComponent);
    }
    // ================= Fragment 节点处理逻辑 | End ====================

    // ================= Element 节点处理逻辑 | Start ====================
    function processElement(
        n1: VNode | null,
        n2: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        if (!n1) {
            mountElement(n2, container, parentComponent);
        } else {
            patchElement(n1, n2, container);
        }
    }

    /**
     * 将 Element 类型的 vnode 挂载到 DOM 中
     */
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
     * 更新 Element 类型的 vnode
     * 从 DOM 中找到旧节点，替换为新节点
     */
    function patchElement(n1: VNode, n2: VNode, container: HTMLElement) {
        // TODO
        console.log("old vnode", n1);
        console.log("new vnode", n2);
    }
    // ================= Element 节点处理逻辑 | End ====================

    /**
     * 将 vnode 对象的 children 挂载到 DOM container 中
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
                patch(null, vnodeChild, container, parentComponent);
            });
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            patch(null, children, container, parentComponent);
        }
    }

    // ================= Component 节点处理逻辑 | Start ====================
    /**
     * 处理组件类型的节点
     */
    function processComponent(
        n1: VNode | null,
        n2: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        mountComponent(n2, container, parentComponent);
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

    /**
     * 调用组件的 render 函数，渲染到 DOM 中
     */
    function setupRenderEffect(
        instance: ComponentInstance,
        initialVnode: VNode,
        container: HTMLElement,
    ) {
        effect(() => {
            // 执行组件挂载的逻辑
            if (!instance.isMounted) {
                const { proxy } = instance;
                const subTree = (instance.subTree =
                    instance.render!.call(proxy));

                // vnode -> component -> patch
                // vnode -> element -> mountElement
                patch(null, subTree, container, instance);

                // 子节点已经渲染完成
                initialVnode.el = subTree.el;

                instance.isMounted = true;
            }
            // 执行组件更新的逻辑
            else {
                const { proxy } = instance;
                const subTree = instance.render!.call(proxy);
                const prevSubTree = instance.subTree;
                instance.subTree = subTree;
                // 更新节点
                patch(prevSubTree, subTree, container, instance);
            }
        });
    }
    // ================= Component 节点处理逻辑 | End ====================

    return {
        createApp: createAppAPI(render),
    };
}
