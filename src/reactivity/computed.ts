import { ReactiveEffect } from "./effect";

class ComputedRefImpl {
    private _getter: () => any;
    private _value: any;
    /** 用于判断 getter 是需要否执行 */
    private _dirty = true;
    private _effect: ReactiveEffect;

    constructor(getter: () => any) {
        this._getter = getter;
        this._effect = new ReactiveEffect(
            getter,
            // 传入一个 scheduler 函数后，依赖发生变化时会调用 scheduler 函数而不是重新执行 getter
            () => {
                if (!this._dirty) {
                    this._dirty = true;
                }
            },
        );
    }

    get value() {
        // 不需要重新计算值时不执行 getter
        if (this._dirty) {
            this._dirty = false;
            this._value = this._effect.run();
        }
        return this._value;
    }
}

export function computed(getter: () => any) {
    return new ComputedRefImpl(getter);
}
