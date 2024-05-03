import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
import { VNode } from "./vnode";

let currentInstance: ComponentInstance | null = null;

export interface ComponentInstance {
    vnode: VNode;
    type: VNode["type"];
    proxy: Record<string, any>;
    setupState: Record<string, any>;
    render: Function;
    props: VNode["props"];
    emit: Function;
    slots: Record<string, VNode["children"]>;
    provides: Record<string, any>;
    parent: ComponentInstance | null;
}

export interface Component {
    setup: (props: VNode["props"], ctx: { emit: Function }) => any;
    render: Function;
}

/**
 * 根据虚拟节点创建组件实例
 */
export function createComponentInstance(
    vnode: VNode,
    parent: ComponentInstance | null,
) {
    const instance: ComponentInstance = {
        vnode,
        type: vnode.type,
        proxy: {},
        setupState: {},
        render: () => {},
        props: {},
        emit: () => {},
        slots: {},
        provides: parent?.provides ?? {},
        parent,
    };

    // 处理 emit 调用
    instance.emit = emit.bind(null, instance);

    return instance;
}

/**
 * 初始化组件实例:
 * - 初始化 props
 * - 初始化 slots
 * - 初始化组件状态
 */
export function setupComponent(instance: ComponentInstance) {
    initProps(instance, instance.vnode.props);
    initSlots(instance, instance.vnode.children);

    setupStatefulComponent(instance);
}

/**
 * 初始化组件状态
 */
function setupStatefulComponent(instance: ComponentInstance) {
    const Component = instance.type;

    // 属性代理
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

    const { setup } = Component as Component;

    if (setup) {
        setCurrentInstance(instance);
        const setupResult = setup(shallowReadonly(instance.props), {
            emit: instance.emit,
        });
        setCurrentInstance(null);

        handleSetupResult(instance, setupResult);
    }
}

/**
 * 处理组件 setup 的返回结果，将处理结果保存到组件实例中
 */
function handleSetupResult(
    instance: ComponentInstance,
    setupResult: ComponentInstance["setupState"],
) {
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    } else if (typeof setupResult === "function") {
        // TODO: function result
    }
    // FIXME: 如果组件没有 setup，则无法走到这里
    finishComponentSetup(instance);
}

/**
 * 完成组件初始化，将组件的 render 函数挂载到组件实例上
 */
function finishComponentSetup(instance: ComponentInstance) {
    const Component = instance.type as Component;
    instance.render = Component.render;
}

export function getCurrentInstance() {
    return currentInstance;
}

export function setCurrentInstance(instance: ComponentInstance | null) {
    currentInstance = instance;
}
