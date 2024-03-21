/**
 * 根据虚拟节点创建组件实例
 */
export function createComponentInstance(vnode) {
    const instance = {
        vnode,
        type: vnode.type,
    };
    return instance;
}

/**
 * 初始化组件实例:
 * - 初始化 props
 * - 初始化 slots
 * - 初始化组件状态
 */
export function setupComponent(instance) {
    // TODO:
    // initProps();
    // initSlots();

    setupStatefulComponent(instance);
}

/**
 * 初始化组件状态
 */
function setupStatefulComponent(instance) {
    const Component = instance.type;

    const { setup } = Component;

    if (setup) {
        const setupResult = setup();
        handleSetupResult(instance, setupResult);
    }
}

/**
 * 处理组件 setup 的返回结果，将处理结果保存到组件实例中
 */
function handleSetupResult(instance, setupResult) {
    if (typeof setupResult === "object") {
        instance.setupState = setupResult;
    } else if (typeof setupResult === "function") {
        // TODO: function result
    }
    finishComponentSetup(instance);
}

/**
 * 完成组件初始化，将组件的 render 函数挂载到组件实例上
 */
function finishComponentSetup(instance) {
    const Component = instance.type;
    if (Component.render) {
        instance.render = Component.render;
    }
}
