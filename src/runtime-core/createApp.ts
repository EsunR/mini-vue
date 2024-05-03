import { Render } from "./renderer";
import { createVNode } from "./vnode";

export function createAppAPI(render: Render) {
    return function createApp(rootComponent) {
        return {
            mount(rootContainer: HTMLElement) {
                const vnode = createVNode(rootComponent);
                render(vnode, rootContainer, null);
            },
        };
    };
}
