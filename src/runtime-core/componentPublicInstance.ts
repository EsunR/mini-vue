import { hasOwn } from "../shared/index";
import { ComponentInstance } from "./component";

const publicPropertiesMap = {
    $el: (i: ComponentInstance) => i.vnode.el,
    $slots: (i: ComponentInstance) => i.slots,
};

export const PublicInstanceProxyHandlers: ProxyHandler<{
    _: ComponentInstance;
}> = {
    get({ _: instance }, key: string) {
        const { setupState, props } = instance;

        if (hasOwn(setupState, key)) {
            return setupState[key];
        } else if (hasOwn(props, key)) {
            return props[key];
        }

        // public properties
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};
