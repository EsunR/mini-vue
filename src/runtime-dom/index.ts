import { createRenderer, RendererOptions } from "../runtime-core";

const createElement: RendererOptions["createElement"] = (type) => {
    return document.createElement(type) as HTMLElement;
};

const patchProp: RendererOptions["patchProp"] = (el, key, val) => {
    const isOn = (key: string) => /^on[A-Z]/.test(key);
    if (isOn(key)) {
        const event = key.slice(2).toLowerCase();
        el.addEventListener(event, val);
    } else {
        el.setAttribute(key, val);
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