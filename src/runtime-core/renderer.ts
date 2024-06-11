import { effect } from "../reactivity/effect";
import { EMPTY_OBJ } from "../shared";
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
    patchProp: (
        el: HTMLElement,
        key: string,
        prevVal: any,
        nextVal: any,
    ) => void;
    insert: (el: HTMLElement, container: HTMLElement) => void;
    remove: (el: HTMLElement) => void;
    setElementText: (el: HTMLElement, text: string) => void;
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
    const {
        createElement,
        patchProp,
        insert,
        remove: hostRemove,
        setElementText: hostSetElementText,
    } = options;

    const render: Render = (vnode, container, parentComponent) => {
        // patch
        patch(null, vnode, container, parentComponent);
    };

    /**
     * 将 vnode 渲染到 container 中
     * @param n1 旧的 vnode
     * @param n2 新的 vnode
     * @param container 组件的根 DOM 节点
     * @param parentComponent 父组件
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
        mountChildren(n2.children, container, parentComponent);
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
            patchElement(n1, n2, container, parentComponent);
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
        const { children, shapeFlag, props } = vnode;

        // 创建元素
        const el = (vnode.el = createElement(vnode.type as string));

        // 挂载子节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, children as string);
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            mountChildren(vnode.children, el, parentComponent);
        }

        // 处理属性
        for (const key in props) {
            const val = props[key];
            patchProp(el, key, null, val);
        }

        // 挂载
        // container.append(el);
        insert(el, container);
    }

    /**
     * 更新 Element 类型的 vnode
     * 从 DOM 中找到旧节点，替换为新节点
     */
    function patchElement(
        n1: VNode,
        n2: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        const oldProps = n1.props || EMPTY_OBJ;
        const newProps = n2.props || EMPTY_OBJ;

        const el = (n2.el = n1.el as HTMLElement);

        // 0. 更新子节点
        patchChildren(n1, n2, el, parentComponent);
        // 1. 更新节点属性
        patchProps(el, oldProps, newProps);
    }

    /**
     * 更新子节点
     * @param n1 旧的 vnode
     * @param n2 新的 vnode
     * @param container 新旧节点的父 DOM 节点（区别于组件的 container）
     */
    function patchChildren(
        n1: VNode,
        n2: VNode,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        const prevShapeFlag = n1.shapeFlag;
        const shapeFlag = n2.shapeFlag;

        const c1 = n1.children;
        const c2 = n2.children;

        // 新节点是文本节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧节点是数组节点
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 移除旧节点的所有 children
                unmountChildren(n1.children);
            }
            // 新旧节点都是文本节点时，对比文本内容后再决定是否更新
            if (c1 !== c2) {
                hostSetElementText(container, c2);
            }
        }
        // 新节点是数组节点
        else {
            // 旧节点是文本节点
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                hostSetElementText(container, "");
                mountChildren(c2, container, parentComponent);
            }
        }
    }

    /**
     * 移除传入的节点
     */
    function unmountChildren(children: VNode["children"]) {
        for (let i = 0; i < children.length; i++) {
            const el = children[i].el;
            hostRemove(el);
        }
    }

    /**
     * 更新节点的属性
     */
    function patchProps(
        el: HTMLElement,
        oldProps: VNode["props"],
        newProps: VNode["props"],
    ) {
        if (oldProps !== newProps) {
            // 处理 newProps 更新了某些属性
            for (const key in newProps) {
                const prevProp = oldProps[key];
                const nextProp = newProps[key];
                if (prevProp !== nextProp) {
                    patchProp(el, key, prevProp, nextProp);
                }
            }

            // 处理 newProps 中移除了某些属性，需要移除 DOM 上的属性
            if (oldProps !== EMPTY_OBJ) {
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        patchProp(document.body, key, oldProps, null);
                    }
                }
            }
        }
    }
    // ================= Element 节点处理逻辑 | End ====================

    /**
     * 将 vnode 对象的 children 挂载到 DOM container 中
     */
    function mountChildren(
        children: any[] /** VNode['children'] */,
        container: HTMLElement,
        parentComponent: ComponentInstance | null,
    ) {
        children.forEach((vnodeChild: VNode) => {
            patch(null, vnodeChild, container, parentComponent);
        });
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
