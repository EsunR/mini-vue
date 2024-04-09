import { createComponentInstance, setupComponent } from "./component";

export function render(vnode, container: HTMLElement) {
    // patch
    patch(vnode, container);
}

/**
 * 将 vnode 渲染到 container 中
 */
function patch(vnode, container: HTMLElement) {
    if (typeof vnode.type === "string") {
        processElement(vnode, container);
    } else {
        processComponent(vnode, container);
    }
}

function processElement(vnode, container: HTMLElement) {
    mountElement(vnode, container);
}

function mountElement(vnode, container: HTMLElement) {
    // 创建元素
    const el = document.createElement(vnode.type) as HTMLElement;

    // 挂载子节点
    mountChildren(vnode, el);

    // 处理属性
    const { props } = vnode;
    for (const key in props) {
        el.setAttribute(key, props[key]);
    }

    // 挂载
    container.append(el);
}

/**
 * 将 vnode 的子节点挂载到 container 中
 */
function mountChildren(vnode, container: HTMLElement) {
    const { children } = vnode;
    if (typeof children === "string") {
        container.textContent = children;
    } else if (children instanceof Array) {
        children.forEach((vnodeChild) => {
            patch(vnodeChild, container);
        });
    } else if (typeof children === "object") {
        patch(children, container);
    }
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
