import { createRenderer, RendererOptions } from "../runtime-core";

const createElement: RendererOptions["createElement"] = (type) => {
    return document.createElement(type) as HTMLElement;
};

/**
 * 处理 element.attributes 的更新
 */
const patchProp: RendererOptions["patchProp"] = (el, key, preVal, nextVal) => {
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, nextVal);
    } else {
        if (nextVal === undefined || nextVal === null) {
            // 如果新的属性值为空，那么就从 element.attributes 上移除该属性
            el.removeAttribute(key);
        } else {
            el.setAttribute(key, nextVal);
        }
    }
};

const insert: RendererOptions["insert"] = (el, container) => {
    container.append(el);
};

const renderer = createRenderer({ createElement, patchProp, insert });

export function createApp(rootComponent) {
    return renderer.createApp(rootComponent);
}

export * from "../runtime-core";
