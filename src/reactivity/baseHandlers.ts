import { extend, isObject } from "../shared";
import { track, trigger } from "./effect";
import { ReactiveFlags, reactive, readonly } from "./reactive";

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);
const shallowReadonlyGet = createGetter(true, true);

function createGetter(
    isReadonly = false,
    shallow = false,
): ProxyHandler<any>["get"] {
    return function get(target, key) {
        if (key === ReactiveFlags.IS_REACTIVE) {
            // 是 readonly 的话就不是 reactive 了
            return !isReadonly;
        } else if (key === ReactiveFlags.IS_READONLY) {
            return isReadonly;
        }

        /**
         * ES6 Proxy里面为什么要用Reflect: https://www.zhihu.com/question/460133198
         */
        const res = Reflect.get(target, key);

        // TODO: 这里只做了 shallowReadonly，因此直接返回 res 而不进行 track
        if (shallow) {
            return res;
        }

        // 相比于 vue2，vue3 采用懒加载，当访问响应式对象时，再去构造下一个Proxy(res, { getter })
        if (isObject(res)) {
            return isReadonly ? readonly(res) : reactive(res);
        }

        if (!isReadonly) {
            // 依赖收集
            track(target, key);
        }
        return res;
    };
}

function createSetter(isReadonly = false): ProxyHandler<any>["set"] {
    return function set(target, key, value) {
        const res = Reflect.set(target, key, value);
        if (!isReadonly) {
            // 触发依赖
            trigger(target, key);
        }
        return res;
    };
}

export const mutableHandlers: ProxyHandler<any> = { get, set };

export const readonlyHandlers: ProxyHandler<any> = {
    get: readonlyGet,
    set(target, key) {
        console.warn(
            `Set operation on key "${String(key)}" failed: target is readonly.`,
            target,
        );
        return true;
    },
};

export const shallReadonlyHandlers: ProxyHandler<any> = extend(
    {},
    readonlyHandlers,
    {
        get: shallowReadonlyGet,
    },
);
