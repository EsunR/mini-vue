import { Render } from "./renderer";
import { createVNode } from "./vnode";

/**
 * createApp 方法的顶层封装
 */
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
