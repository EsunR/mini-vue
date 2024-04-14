import { shallowReadonly } from "../reactivity/reactive";
import { initProps } from "./componentProps";
import { PublicInstanceProxyHandlers } from "./componentPublicInstance";
import { VNode } from "./vnode";

export interface ComponentInstance {
    vnode: VNode;
    type: VNode["type"];
    proxy: Record<string, any>;
    setupState: Record<string, any>;
    render: Function;
    props: VNode["props"];
}

export interface Component {
    setup: (props: VNode["props"]) => any;
    render: Function;
}

/**
 * 根据虚拟节点创建组件实例
 */
export function createComponentInstance(vnode: VNode) {
    const instance: ComponentInstance = {
        vnode,
        type: vnode.type,
        proxy: {},
        setupState: {},
        render: () => {},
        props: {},
    };
    return instance;
}

/**
 * 初始化组件实例:
 * - 初始化 props
 * - 初始化 slots
 * - 初始化组件状态
 */
export function setupComponent(instance: ComponentInstance) {
    // TODO:
    initProps(instance, instance.vnode.props);
    // initSlots();

    setupStatefulComponent(instance);
}

/**
 * 初始化组件状态
 */
function setupStatefulComponent(instance: ComponentInstance) {
    const Component = instance.type;

    // ctx
    instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);

    const { setup } = Component as Component;

    if (setup) {
        const setupResult = setup(shallowReadonly(instance.props));
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
