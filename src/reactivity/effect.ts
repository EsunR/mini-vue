class ReactiveEffect {
  private _fn: Function;
  constructor(fn: Function, public scheduler?: Function) {
    this._fn = fn;
  }
  run() {
    activeEffect = this;
    return this._fn();
  }
}

/**
 * 存放结构：
 * TargetMap: Map<原始对象 target, DepsMap>
 * DepsMap: Map<属性值 key, Dep>
 * Dep: Set<依赖函数>
 */
type TargetMap = Map<any, DepsMap>;
type DepsMap = Map<any, DepSet>;
type DepSet = Set<ReactiveEffect>;
const targetMap: TargetMap = new Map();

/**
 * 在 get 操作时收集依赖
 */
export function track(target: any, key: string | symbol) {
  // 获取到当前 target（原始对象）在 targetMap 中的依赖集合
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  // 获取到当前 key（属性值）在 depsMap 中的依赖集合
  let dep = depsMap.get(key);
  if (!dep) {
    depsMap.set(key, (dep = new Set()));
  }

  dep.add(activeEffect);
}

/**
 * 在 set 操作时触发依赖
 */
export function trigger(target: any, key: string | symbol) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const dep = depsMap.get(key);
  if (!dep) return;

  dep.forEach((effect: ReactiveEffect) => {
    if (effect.scheduler) {
      effect.scheduler();
    } else {
      effect.run();
    }
  });
}

let activeEffect: ReactiveEffect;

/**
 * 创建一个响应式函数
 */
export function effect(fn: Function, options: { scheduler?: Function } = {}) {
  const { scheduler } = options || {};
  const _effect = new ReactiveEffect(fn, scheduler);
  _effect.run();
  return _effect.run.bind(_effect);
}
