import { getCurrentInstance } from "./component";

export function provide(key: string, value: any) {
    const currentInstance = getCurrentInstance();

    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent?.provides;

        // 当前组件的 provides 与父组件的 provides 相同时，说明是组件内首次使用 provide，要对其进行初始化
        if (provides === parentProvides) {
            provides = currentInstance.provides = Object.create(
                parentProvides || {},
            );
        }
        provides[key] = value;
    }
}

export function inject(key: string, defaultValue: any) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const parentProvides = currentInstance.parent?.provides ?? {};

        if (key in parentProvides) {
            return parentProvides?.[key];
        } else if (defaultValue) {
            return typeof defaultValue === "function"
                ? defaultValue()
                : defaultValue;
        }
    }
}
