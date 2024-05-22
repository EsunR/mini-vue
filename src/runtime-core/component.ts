import { proxyRefs } from "../reactivity";
import { shallowReadonly } from "../reactivity/reactive";
import { emit } from "./componentEmit";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { initSlots } from "./componentSlots";
import { h } from "./h";
import { VNode } from "./vnode";

let currentInstance: ComponentInstance | null = null;

export interface ComponentInstance {
    vnode: VNode;
    type: VNode["type"];
    /**
     * 属性代理，将组件的 props 和 setupState 都代理到该对象上
     * 在组件执行 render 函数时候作为上下文 this 调用
     */
    proxy: Record<string, any>;
    /** setup 函数的返回值 */
    setupState: Record<string, any>;
    /** 组件的渲染函数 */
    render: Component["render"];
    /** 组件的 props */
    props: VNode["props"];
    /** 组件的 emit 方法 */
    emit: Function;
    /** 组件上的插槽 */
    slots: Record<string, VNode["children"]>;
    /** 存放在当前组件上调用 provide 存放的对象 */
    provides: Record<string, any>;
    /** 父组件 */
    parent: ComponentInstance | null;
    /** 当前组件是否已经挂载 */
    isMounted: boolean;
    /** 存放上次更新后的 VNode */
    subTree: VNode | null;
}

export interface Component {
    name?: string;
    setup: (props: VNode["props"], ctx: { emit: Function }) => any;
    render: () => VNode;
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
        props: {},
        render: () => h("div", {}, "TODO: set default render"),
        emit: () => {},
        slots: {},
        provides: parent?.provides ?? {},
        parent,
        isMounted: false,
        subTree: null,
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
        instance.setupState = proxyRefs(setupResult);
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
