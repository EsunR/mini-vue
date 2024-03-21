import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container: HTMLElement) {
    // patch
    patch(vnode, container);
}

function patch(vnode, container: HTMLElement) {
    processComponent(vnode, container);
}

function processComponent(vnode, container: HTMLElement) {
    mountComponent(vnode, container);
}

function mountComponent(vnode, container: HTMLElement) {
    const instance = createComponentInstance(vnode);

    setupComponent(instance);
    setupRenderEffect(instance, container);
}

function setupRenderEffect(instance, container: HTMLElement) {
    const subTree = instance.render();

    // vnode -> component -> patch
    // vnode -> element -> mountElement
    patch(subTree, container);
}
