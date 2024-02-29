class ReactiveEffect {
  private _fn: Function;
  constructor(fn: Function) {
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

export function track(target, key) {
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

export function trigger(target, key) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const dep = depsMap.get(key);
  if (!dep) return;

  dep.forEach((effect: ReactiveEffect) => {
    effect.run();
  });
}

let activeEffect: ReactiveEffect;

export function effect(fn: Function) {
  const _effect = new ReactiveEffect(fn);
  _effect.run();
  return _effect.run.bind(_effect);
}
