import { ShapeFlags } from "../shared/ShapeFlags";
import { ComponentInstance } from "./component";
import { VNode } from "./vnode";

/**
 * 初始化插槽，将插槽值（也就是组件的 children）保存到实例的 slots 属性中
 */
export function initSlots(
    instance: ComponentInstance,
    children: VNode["children"],
) {
    const { vnode } = instance;
    if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        normalizeObjectSlots(children, instance.slots);
    }
}

/**
 * 由组件的 children 生成插槽对象
 */
export function normalizeObjectSlots(
    children: VNode["children"],
    slots: ComponentInstance["slots"],
) {
    for (const key in children) {
        const value = children[key];
        slots[key] = (props: any) => normalizeSlotValue(value(props));
    }
}

/**
 * 格式化插槽值
 * @example { default: () => h('p', {}, 'default slot') } => { default: () => [h('p', {}, 'default slot')] }
 */
function normalizeSlotValue(value: any) {
    return Array.isArray(value) ? value : [value];
}
