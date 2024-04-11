import { ComponentInstance } from "./component";

const publicPropertiesMap = {
    $el: (i: ComponentInstance) => i.vnode.el,
};

export const PublicInstanceProxyHandlers: ProxyHandler<{
    _: ComponentInstance;
}> = {
    get({ _: instance }, key) {
        const { setupState } = instance;
        // setupState
        if (key in setupState) {
            return setupState[key as string];
        }

        // public properties
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};
