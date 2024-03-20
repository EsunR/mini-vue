import { hasChanged, isObject } from "../shared";
import { DepSet, isTracking, trackEffects, triggerEffects } from "./effect";
import { reactive } from "./reactive";

export type MaybeRef<T = any> = T | Ref<T>;

class Ref<T = any> {
    /**  存储值 */
    private _value: T;
    /**  使用 Ref 包裹的原始值/对象 */
    private _rawValue: T;
    /** 该值的依赖队列 */
    public depSet: DepSet = new Set();

    public __v_isRef = true;

    constructor(value: T) {
        // 如果 value 是一个对象，则使用 reactive 进行包裹
        this._value = isObject(value) ? reactive(value) : value;
        // 对原始对象进行存储
        this._rawValue = value;
    }

    get value() {
        trackRefValue(this);
        return this._value;
    }

    set value(newVal) {
        // 如果新值和旧值相同，不会触发响应
        if (hasChanged(newVal, this._rawValue)) {
            this._rawValue = newVal;
            this._value = isObject(newVal) ? reactive(newVal) : newVal;
            triggerEffects(this.depSet);
        }
    }
}

function trackRefValue(ref: Ref) {
    if (isTracking()) {
        trackEffects(ref.depSet);
    }
}

export function ref<T = any>(value: T) {
    return new Ref<T>(value);
}

export function isRef(ref: any) {
    return !!ref.__v_isRef;
}

export function unref<T>(ref: MaybeRef<T>): T {
    return isRef(ref) ? (ref as Ref<T>).value : (ref as T);
}

export function proxyRefs(objectWithRefs: any) {
    return new Proxy(objectWithRefs, {
        get(target, key) {
            return unref(Reflect.get(target, key));
        },
        set(target, key, value) {
            // 如果当前值是 Ref 且新值不是 Ref 对象，则将当前 Ref 的 value 设置为新值
            if (isRef(target[key]) && !isRef(value)) {
                return (target[key].value = value);
            }
            // 否则，直接设置新值
            else {
                return Reflect.set(target, key, value);
            }
        },
    });
}
