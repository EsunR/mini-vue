import { track, trigger } from "./effect";
import { ReactiveFlags } from "./reactive";

function createGetter(isReadonly = false): ProxyHandler<any>["get"] {
  return function get(target, key) {
    if (key === ReactiveFlags.IS_REACTIVE) {
      return !isReadonly;
    } else if (key === ReactiveFlags.IS_READONLY) {
      return isReadonly;
    }

    /**
     * ES6 Proxy里面为什么要用Reflect: https://www.zhihu.com/question/460133198
     */
    const res = Reflect.get(target, key);
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

const get = createGetter();
const set = createSetter();
const readonlyGet = createGetter(true);

export const mutableHandlers: ProxyHandler<any> = { get, set };

export const readonlyHandlers: ProxyHandler<any> = {
  get: readonlyGet,
  set() {
    console.warn("readonly");
    return true;
  },
};
