# 1. 源码结构介绍

![](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/202402261940241.png)

> compiler-sfc：依赖 compiler-dom 和 compiler-core 将 template 转换为 render 函数

# 2. Reactive

在 Vue 中，`reactive` 方法可以将一个普通对象转为一个响应式对象，并返回这个响应式对象的代理。

`effect` 是 `reactive` 的核心，虽然其在 Vue 中可以直接被导出使用，但是在官方文档中并没有其具体介绍。`effect` 方法接收一个函数，函数中调用了 `reactive` 响应式对象，当响应式对象更新时 `effect` 传入的函数就会被触发，其使用示例如下：

```ts
const user = reactive({
  age: 10,
});

// track
let nextAge;
effect(() => {
  nextAge = user.age + 1;
});
expect(nextAge).toBe(11);

// update
user.age++;
expect(nextAge).toBe(12);
```

### 依赖收集

当 effect 被创建时就会 **立即执行** 传入的 fn 函数：当函数运行时，会首先将全局变量 `activeEffect` 标记为当前的 effect 对象；然后当代执行到获取依赖值时，会触发依赖值的 get 陷阱，在 get 陷阱中可以通过全局变量 `activeEffect` 拿到正在运行的 effect 对象，并将其放到一个依赖队列中（depSet）。这一过程叫作『依赖收集』。

当 reactive 响应式对象的值更新时，就会触发响应式对象的 set 陷阱，此时 set 陷阱中会检查响应式对象在上面阶段中创建的『依赖队列』，然后取出 effect 对象并执行其 `run` 方法，这就完成了一次 effect 的触发。

![](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/202403202300855.png)

代码实现：

- [reactive](https://github.com/EsunR/mini-vue/blob/65a9ba6d971217a0e6a20c0967dc945d04673839/src/reactivity/reactive.ts)
- [effect](https://github.com/EsunR/mini-vue/blob/65a9ba6d971217a0e6a20c0967dc945d04673839/src/reactivity/effect.ts)

收集依赖时创建的缓存关系如下：

![](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/202402292136224.png)

### effect 中的 scheduler

effect 方法允许传入一个 scheduler（调度）函数，如果传入了的话，会其有以下特性：

1. 通过 effect 的第一个参数传入 fn，第二个参数传入一个 scheduler 函数
2. effect 第一次执行的时候仍会执行 fn
3. 当响应式对象发生 set 操作时，不会执行 fn，而是调用 scheduler 函数
4. 如果手动执行 runner 函数，会立即执行 fn

测试用例：

```ts
it("scheduler", () => {
    let dummy;
    let run: any;
    const scheduler = jest.fn(() => {
      run = runner;
    });
    const obj = reactive({ foo: 1 });
    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // should be called on first trigger
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    //    should not run yet
    expect(dummy).toBe(1);
    //    manually run
    run();
    //    should have run
    expect(dummy).toBe(2);
  });
```

[代码实现](https://github.com/EsunR/mini-vue/commit/a1614fdfab060765c531e9e832fe2acb02a1e66a)

### 使用 stop 来停止 effect 的依赖触发

stop 方法可以停止目标 effect，使响应式对象如果发生变更后，不该触发该 effect，使用示例如下：

```ts
let dummy;
const obj = reactive({ prop: 1 });
const runner = effect(() => {
  dummy = obj.prop;
});
obj.prop = 2;
expect(dummy).toBe(2);
stop(runner);
obj.prop = 3;
// obj.prop++;
expect(dummy).toBe(2);

// stopped effect should still be manually callable
runner();
expect(dummy).toBe(3);
```

在其内部实现上，当 `stop` 方法被调用时，当前的 effect 对象会将自身从依赖值的 depSet 中移除（通过 effect.deps），后续当依赖值再变更时，由于其 depSet 已经不存在当前的 effect 对象，因此该 effect 的函数就不会被触发。同时 effect 对象上新增了 `active` 属性，在执行 `stop` 方法时该属性也会被置为 `false`。

[代码实现](https://github.com/EsunR/mini-vue/commit/ac88d00a7e4123f6bda55893d2fe901031566eaa)

但是上面的实现还存在一个问题，当 effect 依赖值的 get 陷阱再次被触发时，当前的全局变量 `activeEffect` 可能指向的还是刚刚已经被调用了 `stop` 方法的 effect 对象。此时，这个 effect 会在 get 陷阱的 track 方法中再次被收集起来。下面的测试用例会报错：

```ts
let dummy;
const obj = reactive({ prop: 1 });
const runner = effect(() => {
  dummy = obj.prop;
});
obj.prop = 2;
expect(dummy).toBe(2);
stop(runner);
// obj.prop = 3;
obj.prop++;
expect(dummy).toBe(2); // error !
```

为了避免这一情况，我们创建一个 `shouldTrack` 的全局变量，将其默认值设置为 `false`。仅当 effect 内部的 `active` 为 `true` 时（也就是未执行 `stop` 方法），在其 `run` 方法中才将 `shouldTrack` 临时置为 `true`，并在执行完内部的 fn 函数后再将 `shouldTrack` 设置为 `false`。

这样，在依赖收集时，即使发现了当前的 effect，但是由于 `shouldTrack` 的限制，就不会将该 effect 进行收集了。

[优化 stop](https://github.com/EsunR/mini-vue/commit/7e3d8f7aee11c534482543d2674205f6132b7d2d)

### readonly 的实现

接受一个对象，返回一个原值的只读代理。就其最简实现来说，其内部创建 Proxy 对象的 set 和 get 陷阱时，不需要依赖收集与触发机制，并且当触发 set 时会抛出一个警告。

[代码实现](https://github.com/EsunR/mini-vue/commit/c33d780e4c00e9ca2f8f28ebfcd073d61c2c0797)

### isReactive 与 isReadonly

这两个方法可以判定对象是否是一个响应式对象或者是一个只读对象，其原理是在 get 陷阱中添加一个 key 的判断：

```ts
if (key === ReactiveFlags.IS_REACTIVE) {
  return !isReadonly;
} else if (key === ReactiveFlags.IS_READONLY) {
  return isReadonly;
}
```

外部就可以通过获取该值来拿到判定结果。

[代码实现](https://github.com/EsunR/mini-vue/commit/0280e258e5b0bc333ed5df2726458b08e7210388)

### 深层响应式

在 Vue3 中，创建响应式对象与 Vue2 一样是深层的，例如当我们创建响应式对象：

```ts
const original = {
  nested: {
	foo: 1,
  },
  array: [{ bar: 2 }],
};
const observed = reactive(original);
```

不仅 `observed` 是一个响应式对象，`observed.nested` `observed.array[0]` 也同样都是一个响应式对象，使用 `isReactive` 判断的返回值都是 `true`，意味着他们身上都会被添加 Proxy Handler 的 Get 和 Set 陷阱。

但与 Vue2 不同的是，Vue3 创建深层响应式对象的性能表现更好。这是因为 Vue2 响应式对象被创建时使用递归的方式将所有嵌套对象都调用了 `Object.defineProperty` 方法；而 Vue3 则是在响应式对象的 Get 陷阱中，发现如果当前访问的值是一个 Object，再对该值添加响应式，也就意味着如果某个响应式对象的嵌套对象没有访问到，那么就不会为其嵌套对象添加响应式。

[代码实现](https://github.com/EsunR/mini-vue/commit/786f3956dc74c6a3800ecb70a3e41ff0d2be78b2)

### shallowReadonly

`shallowReadonly` 可以创建一个浅层的只读对象，与 `readonly` 不同的是其在 Get 陷阱中，跳过了按需深层递归的过程。

[代码实现](https://github.com/EsunR/mini-vue/commit/0fc1bc55a06b37eeaf0cafa065d7df763add916b)

### 实现 isProxy

`isProxy` 用于探测对象是否被创建了一个代理，reactive 响应式对象和 readonly 对象都应该返回 `true`，因此使用 `isReactive` 和 `isReadonly` 进行联合判断即可：

```ts
export function isProxy(value: any) {
  return isReactive(value) || isReadonly(value);
}
```

[代码实现](https://github.com/EsunR/mini-vue/commit/9228fe59b1c58b0636e7e857fbad351405af84c1)

### 实现 ref

`ref` 方法接受一个内部置，返回一个响应式的、可更改的 ref 对象。

与 `reactive` 不同的是，`ref` 可以接收一个值类型的参数，为其创建一个 Ref 对象而不是一个 Proxy 对象，Ref 对象拥有 get 和 set 方法用于捕获值获取和赋值的行为。其响应式的原理也是通过维护一个依赖队列 `depSet`，在 Ref 对象的 get 方法中收集 effect 依赖，然后在 set 方法中触发依赖。

Ref 对象有以下的特性：

- 即可以接受值类型的参数，也可以接受引用类型（对象）的参数
- 如果接受了一个对象，会在内部将该对象使用 reactive 进行包裹
- 当为创建的 ref 对象赋了相同的新值时，响应式依赖不会被触发

[代码实现](https://github.com/EsunR/mini-vue/commit/45a438690597368409a596291cc8729b8ee95218)

### 实现 isRef 与 unref

`isRef` 用于判断目标对象是否是一个 Ref 对象，我们通过向 Ref 构造类中添加一个 `__v_isRef` 私有属性即可完成判断。

`unref` 可以获取一个 Ref 对象或者普通对象的值，其内部实现上是通过 `isRef` 进行一个判断，如果是 Ref 对象，则返回 Ref 对象的 value 属性，否则返回传入值。

[代码实现](https://github.com/EsunR/mini-vue/commit/2154e9ca23d4e40b21ea2e467ac763d135ae931e)

### 实现 proxyRefs

`proxyRefs` 是 Vue3 内部私有的一个方法，用于在向包含了 Ref 对象的 Object 取值时，可以不用使用 `.value` 而是像普通对象取值那样直接通过属性名即可获取到值。其单测用例为：

```ts
it("proxyRefs", () => {
	const user = {
	  age: ref(10),
	  name: "xiaohong",
	};
	const proxyUser = proxyRefs(user);
	expect(user.age.value).toBe(10);
	expect(proxyUser.age).toBe(10);
	expect(proxyUser.name).toBe("xiaohong");
	
	// 如果赋值一个普通值，则修改 Ref 对象的 value
	proxyUser.age = 20;
	expect(user.age.value).toBe(20);
	expect(proxyUser.age).toBe(20);
	
	// 如果赋值一个 Ref 对象，则直接替换
	proxyUser.age = ref(30);
	expect(user.age.value).toBe(30);
	expect(proxyUser.age).toBe(30);
});
```

`proxyRefs` 在 Vue 的模板编译时十分有用，当我们使用 `setup` 返回一个 Object 时，这个返回值通常会包含多个 Ref 对象供 Vue 模板中使用，但是我们在 Vue 模板中使用这些 Ref 对象时，却不用使用 `.value` 进行取值，这就是 Vue 在内部使用了 `proxyRefs` 对 `setup` 函数的返回对象进行了包裹。

代码实现上，`proxyRefs` 实际上是为目标对象创建了一个 Proxy。在其 get 陷阱中，使用 `unref` 来包裹获取值并返回；在 set 陷阱中则是先判断新值是否是一个 Ref 对象，如果是则替换原有的 Ref，否则将 Ref 对象的 `.value` 指向最新值。

[代码实现](https://github.com/EsunR/mini-vue/commit/85d6512611fa7b0d0386f914721f39f64494e818)

### 实现 computed

`computed` 拥有以下几个特性：

- 传入一个计算函数，并返回一个 Computed 对象，通过 `.value` 来获取计算值；
- 当计算值被获取时才会执行内部的计算函数；
- 当计算函数已被执行过，且计算函数中的依赖值未被再次更新时，再次获取计算值时并不会执行计算函数；
- 当计算函数中的依赖值发生了变化，且计算值再次被获取时，计算函数才会被再次执行。

代码实现上，computed 方法创建了一个 Proxy 对象，并为其设置了 get 和 set 陷阱。当 computed 对象被获取时，会通过一个 `_dirty` 私有属性来判断是否需要重新计算缓存值，如果需要，则会调用传入的计算函数，否则直接返回缓存值。

那么，computed 是如何做到监测到依赖值变化后让计算函数重新执行的呢？

computed 对象通过构建一个 ReactiveEffect 对象来收集计算函数中的依赖值，构建 ReactiveEffect 对象时，会将计算函数（getter）作为 effect 的 fn，并在 scheduler 参数位传入一个将 `_dirty` 置为 `true` 的方法。这样就做到了如果依赖值发生变更时，再次获取 computed 对象的值时就重新触发计算函数。

[代码实现](https://github.com/EsunR/mini-vue/commit/b2b6235336e36edbe7c119787685e66db8ddcc91)