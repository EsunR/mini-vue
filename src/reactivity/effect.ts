import { extend } from "../shared";

/**
 * 存放结构：
 * TargetMap: Map<原始对象 target, DepsMap>
 * DepsMap: Map<属性值 key, Dep>
 * Dep: Set<依赖函数>
 * ![](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/202402292136224.png)
 */
type TargetMap = Map<any, DepsMap>;
type DepsMap = Map<string | symbol, DepSet>;
type DepSet = Set<ReactiveEffect>;

function cleanupEffect(effect: ReactiveEffect) {
  effect.deps.forEach((depSet) => {
    depSet.delete(effect);
  });
  effect.deps.length = 0;
}

class ReactiveEffect {
  private _fn: Function;
  deps: DepSet[] = [];
  active = true;
  onStop?: Function;
  constructor(fn: Function, public scheduler?: Function) {
    this._fn = fn;
  }
  run() {
    activeEffect = this;
    return this._fn();
  }
  stop() {
    if (this.active) {
      cleanupEffect(this);
      if (this.onStop) {
        this.onStop();
      }
      this.active = false;
    }
  }
}

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
  let depSet = depsMap.get(key);
  if (!depSet) {
    depsMap.set(key, (depSet = new Set()));
  }

  if (!activeEffect) return;

  // 已经收集过依赖的话就不再重复收集
  if (!depSet.has(activeEffect)) {
    depSet.add(activeEffect);
    activeEffect.deps.push(depSet);
  }
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

let activeEffect: ReactiveEffect | null = null;

/**
 * 创建一个响应式函数
 */
export function effect(
  fn: Function,
  options: {
    /**
     * 当存在调度函数时，set 操作不会立即执行 fn，而是调用 scheduler 函数
     */
    scheduler?: Function;
    onStop?: Function;
  } = {}
) {
  const { scheduler, onStop } = options || {};

  const _effect = new ReactiveEffect(fn, scheduler);
  _effect.run();

  extend(_effect, { onStop });

  const runner: any = _effect.run.bind(_effect);
  runner.effect = _effect;

  return runner;
}

export function stop(runner: any) {
  runner.effect.stop();
}
