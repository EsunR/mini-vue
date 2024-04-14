import { camelized, capitalized } from "../shared/index";
import { ComponentInstance } from "./component";

/**
 * 实现组件内的事件触发
 * @example emit('btn-click', args1, args2)
 */
export function emit(
    instance: ComponentInstance,
    event: string,
    ...args: any[]
) {
    const { props } = instance;

    // 将 event 事件进行转换，如：btn-click => onBtnClick
    const toHandlerKey = (str: string) =>
        str ? "on" + capitalized(camelized(str)) : "";

    const handlerName = toHandlerKey(event);
    // 从组件 props 获取事件函数
    const handler = props[handlerName];
    // 执行事件函数
    handler && handler(...args);
}
