# 1. 源码结构介绍

![202402261940241.png|754](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/202402261940241.png)

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

### 2.1 依赖收集

当 effect 被创建时就会 **立即执行** 传入的 fn 函数：当函数运行时，会首先将全局变量 `activeEffect` 标记为当前的 effect 对象；然后当代执行到获取依赖值时，会触发依赖值的 get 陷阱，在 get 陷阱中可以通过全局变量 `activeEffect` 拿到正在运行的 effect 对象，并将其放到一个依赖队列中（depSet）。这一过程叫作『依赖收集』。

当 reactive 响应式对象的值更新时，就会触发响应式对象的 set 陷阱，此时 set 陷阱中会检查响应式对象在上面阶段中创建的『依赖队列』，然后取出 effect 对象并执行其 `run` 方法，这就完成了一次 effect 的触发。

![](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/202403202300855.png)

代码实现：

- [reactive](https://github.com/EsunR/mini-vue/blob/65a9ba6d971217a0e6a20c0967dc945d04673839/src/reactivity/reactive.ts)
- [effect](https://github.com/EsunR/mini-vue/blob/65a9ba6d971217a0e6a20c0967dc945d04673839/src/reactivity/effect.ts)

收集依赖时创建的缓存关系如下：

![](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/202402292136224.png)

### 2.2 effect 中的 scheduler

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

### 2.3 使用 stop 来停止 effect 的依赖触发

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

### 2.4 readonly 的实现

接受一个对象，返回一个原值的只读代理。就其最简实现来说，其内部创建 Proxy 对象的 set 和 get 陷阱时，不需要依赖收集与触发机制，并且当触发 set 时会抛出一个警告。

[代码实现](https://github.com/EsunR/mini-vue/commit/c33d780e4c00e9ca2f8f28ebfcd073d61c2c0797)

### 2.5 isReactive 与 isReadonly

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

### 2.6 深层响应式

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

### 2.7 shallowReadonly

`shallowReadonly` 可以创建一个浅层的只读对象，与 `readonly` 不同的是其在 Get 陷阱中，跳过了按需深层递归的过程。

[代码实现](https://github.com/EsunR/mini-vue/commit/0fc1bc55a06b37eeaf0cafa065d7df763add916b)

### 2.8 实现 isProxy

`isProxy` 用于探测对象是否被创建了一个代理，reactive 响应式对象和 readonly 对象都应该返回 `true`，因此使用 `isReactive` 和 `isReadonly` 进行联合判断即可：

```ts
export function isProxy(value: any) {
  return isReactive(value) || isReadonly(value);
}
```

[代码实现](https://github.com/EsunR/mini-vue/commit/9228fe59b1c58b0636e7e857fbad351405af84c1)

### 2.9 实现 ref

`ref` 方法接受一个内部置，返回一个响应式的、可更改的 ref 对象。

与 `reactive` 不同的是，`ref` 可以接收一个值类型的参数，为其创建一个 Ref 对象而不是一个 Proxy 对象，Ref 对象拥有 get 和 set 方法用于捕获值获取和赋值的行为。其响应式的原理也是通过维护一个依赖队列 `depSet`，在 Ref 对象的 get 方法中收集 effect 依赖，然后在 set 方法中触发依赖。

Ref 对象有以下的特性：

- 即可以接受值类型的参数，也可以接受引用类型（对象）的参数
- 如果接受了一个对象，会在内部将该对象使用 reactive 进行包裹
- 当为创建的 ref 对象赋了相同的新值时，响应式依赖不会被触发

[代码实现](https://github.com/EsunR/mini-vue/commit/45a438690597368409a596291cc8729b8ee95218)

### 2.10 实现 isRef 与 unref

`isRef` 用于判断目标对象是否是一个 Ref 对象，我们通过向 Ref 构造类中添加一个 `__v_isRef` 私有属性即可完成判断。

`unref` 可以获取一个 Ref 对象或者普通对象的值，其内部实现上是通过 `isRef` 进行一个判断，如果是 Ref 对象，则返回 Ref 对象的 value 属性，否则返回传入值。

[代码实现](https://github.com/EsunR/mini-vue/commit/2154e9ca23d4e40b21ea2e467ac763d135ae931e)

### 2.11 实现 proxyRefs

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

### 2.12 实现 computed

`computed` 拥有以下几个特性：

- 传入一个计算函数，并返回一个 Computed 对象，通过 `.value` 来获取计算值；
- 当计算值被获取时才会执行内部的计算函数；
- 当计算函数已被执行过，且计算函数中的依赖值未被再次更新时，再次获取计算值时并不会执行计算函数；
- 当计算函数中的依赖值发生了变化，且计算值再次被获取时，计算函数才会被再次执行。

代码实现上，computed 方法创建了一个 Proxy 对象，并为其设置了 get 和 set 陷阱。当 computed 对象被获取时，会通过一个 `_dirty` 私有属性来判断是否需要重新计算缓存值，如果需要，则会调用传入的计算函数，否则直接返回缓存值。

那么，computed 是如何做到监测到依赖值变化后让计算函数重新执行的呢？

computed 对象通过构建一个 ReactiveEffect 对象来收集计算函数中的依赖值，构建 ReactiveEffect 对象时，会将计算函数（getter）作为 effect 的 fn，并在 scheduler 参数位传入一个将 `_dirty` 置为 `true` 的方法。这样就做到了如果依赖值发生变更时，再次获取 computed 对象的值时就重新触发计算函数。

[代码实现](https://github.com/EsunR/mini-vue/commit/b2b6235336e36edbe7c119787685e66db8ddcc91)

# 3. Runtime

### 3.1 初始化 component 主流程

在 Vue 项目的入口文件，我们会创建一个组件实例，并将其挂载到 DOM 元素上：

```js
const rootContainer = document.getElementById("app");
createApp(App).mount(rootContainer);
```

初始化 component 的流程大体有以下几个要点：

- `createApp` 方法执行完毕后调用返回的 `mount` 方法时，方法内会调用  `createVNode` 为组件创建一个 `vnode` 对象，然后执行 `render` 函数对组件进行渲染；
- `render` 函数的渲染过程实际上就是将组件或者 Element 元素挂载到根元素或者父组件上的过程，在这个过程中会对组件进行实例化，并进行初始化组件的 props、slot、执行组件的 setup 函数等一系列行为，这一过程在 `setupComponent` 函数中执行；
- 当一个 vnode 对象完成了 setup 阶段后，会执行 `setupRenderEffect` 函数，在该函数中，会拿到实例化的组件，并执行组件的 render 函数来获取到子树，然后再递归对子树进行 `patch`；

函数调用栈如下：

![](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/20240409224504.jpg)

代码：[21. 使用 rollup 打包库](https://github.com/EsunR/mini-vue/commit/0ee1e8c8f046d2f08de8a351df8e7f4c72cd44be)

### 3.2 初始化 element

在上一节中，我们已经完成了在执行 patch 阶段将 VNode 挂载到 Container 中时对 Component 类型的 VNode 的处理（`processComponent` 函数），但是在渲染过程中还要处理 Element 节点：

```js
// 这是一个 Element 节点
h('div', { id: "root" }, "你好")

// 这是一个 Component 节点
h(VueComponent, { propsA: "prop value" }, [/** children */])
```

如果是 Element 节点，则 `VNode.type` 将会是一个 `string` 类型，然后通过 `processElement` 函数来将 Element 节点挂载到容器中。其过程如下：

1. 使用 `createElement` 根据 `VNode.type` 创建 Element 元素；
2. 将  `VNode.props` 作为节点的 attributes 进行绑定；
3. 处理 Children：
	1. 如果是文本，则直接作为 textContent 写入到 Element 中；
	2. 如果是 VNode 数组或 VNode 对象，则对其递归调用 `patch`，patch 目标的 container 是当前元素；
4. 使用 `append` 将 Element 挂载到 container 中。

函数调用栈：

![image.png|695](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/20240410002244.png)


代码：[22. 实现初始化 element](https://github.com/EsunR/mini-vue/commit/b199fec90637e752865d7cea27d9c3c6fcf4568f)

### 3.3 实现组件代理对象

在执行组件的 `render` 函数时，可以通过 `this.xxx` 来获取组件 `setup` 函数中返回的 setupState 中的数据，比如：

```js
export const App = {
    render() {
        return h(
            "div",
            {
                id: "root",
            },
            "this is your message: " + this.msg,
        );
    },
    setup() {
        return {
            msg: "mini-vue",
        };
    },
};
```

此外，我们还可以使用 `this` 来获取其他的值，比如当前组件的 Element 对象 `this.$el`，完整的组件实例上的属性可以参考 [官方文档](https://cn.vuejs.org/api/component-instance.html) 。

为了实现一功能，Vue 在创建组件实例的时候需要在组件实例上创建一个 `proxy` 代理对象来获取各个属性值，同时在执行组件的 `render` 函数时将该 Proxy 对象作为 `this` 来执行，这一过程我们称为“创建组件的代理对象”，其流程如下：

1. 在的 `setupStatefulComponent` 阶段创建代理对象；
	- 代理对象中的 get 陷阱中来获取组件实例上的属性值，比如 setupState 的值；
2. 在 `setupRenderEffect` 阶段执行组件 `render` 函数时，为 `render` 函数绑定 this 为上一步创建的代理对象；
	- 此外，在这一步执行完 patch 后，组件子树的 `$el` 就是当前组件实例的 `$el`；

![image.png](https://esunr-image-bed.oss-cn-beijing.aliyuncs.com/picgo/20240411223644.png)

[23. 实现组件的代理对象](https://github.com/EsunR/mini-vue/commit/c0a188d1ea8c5ba40255aa574433642bd1d02666)

### 3.4实现 ShapeFlags

在 Vue 中，VNode 的种类是多样的，在前面的实现中我们已经实现了组件 VNode、元素 VNode，VNode 的子节点（children）也分为数组子节点、文本子节点，在将来还会有更多的 VNode 类型。因此我们需要一种方法来标记当前的节点类型及其子节点的类型，方便我们在 patch 阶段根据不同的节点类型来执行不同的逻辑。

假设我们在 VNode 上创建一个属性 `shapeFlag` 来标记当前节点的类型及其子节点（children）的类型，那么我们可能会设计为：

```ts
interface ShapeFlag {
	/** 是否是 Element 类型的节点 */
	element: boolean;
	/** 是否是组件类型的节点 */
	stateful_component: boolean;
	/** 是否是文本类型的子节点 */
	text_children: boolean;
	/** 是否是数组类型的子节点 */
	array_children: boolean;
}
```

但是这样设计 `shapeFlag` 属性可能会越来越多，整体的解构越来越复杂，对性能也会产生影响。因此 Vue 采用了二进制的方式来标记节点的 `shapeFlag`，同时使用异或运算来判断节点是否属于哪种类型，这样 `shapeFlag` 的类型就可以优化为 number。接下来我们来具体讲一下 Vue 是如何处理 ShapeFlag 的：

Javascript 使用 `|` 来进行或运算，使用 `&` 来进行与运算。在二进制的或运算中，如果计算位两者有一位为 `1`，则计算后的值即为 `1`：

```
         0001
|(或运算) 0100
——————————————
         0101
```

在二进制的与运算中，如果计算位两者必须都为 `1`，计算值才能为 `1`，否则为 `0`：

```
         1001
&(或运算) 1100
——————————————
         1000
```

如果我们将 `shapFlag` 使用二进制表示：

- `0001` 可以标识 Element 类型的节点
- `0010` 可以表示组件类节点
- `0100` 可以标识文本类子节点
- `1000` 可以表示数组类子节点

一个 Element 类型的节点 `0001`，拥有文本类型的子节点 `0100` 就可以组合使用 `0101` 来标识，其他情况的组合类似，我们可以使用或运算来为节点“追加”类型属性：

```
如果一个节点既是 Element 类型，又拥有文本类行的节点：

         0001
|(或运算) 0100
——————————————
         0101
```

如果要判断节点是否拥有某个属性，就可以使用与运算（&）来判断，如果值为 0 则为没有命中。举例来说，如果要判断某个节点是否是 Element 类型，那么就可以将这个节点的 shapeType 与 `0001` 进行与运算：

```
         1010 (组件类型的节点、数组类型的子节点)
&(与运算) 0001 (Element 类型的节点)
——————————————
         0000 (结果为 0，判断为 false)
```

```
         1001 (Element 类型的节点、数组类型的子节点)
&(与运算) 0001 (Element 类型的节点)
——————————————
         0001 (结果大于 0，判断为 true)
```

此外，Javascript 还有位移运算符 `>>` 右移、`<<` 左移，如 `2 << 1` 就是将十进制数字 `1` 转为二进制数字 `10` 后向左移动一位，变为 `100`，计算结果转为十进制即为 `4`：

```
          00000000000000000000000000000010
<<2       00000000000000000000000000000100
——————————————————————————————————————————
转为十进制：                               4
```

因此在声明节点类型时，我们可以使用位移运算符来简明定义类型：

```js
export const enum ShapeFlags {
    ELEMENT = 1, // 0001
    STATEFUL_COMPONENT = 1 << 1, // 0010
    TEXT_CHILDREN = 1 << 2, // 0100
    ARRAY_CHILDREN = 1 << 3, // 1000
}
```

[24. 实现 ShapeFlags](https://github.com/EsunR/mini-vue/commit/98c7df5295cfda744abd4cf4560e1365ef6a40c7 "24. 实现 ShapeFlags")

### 3.5 Element 节点的事件注册

Vue 支持使用 `onXXX` 的方式来为组件添加事件，其在原生的 Element 节点上也是生效的，因此在 Element 节点的 `mountElement` 阶段中处理组件的 props 时，需要单独将事件 prop 提取出来并对其进行属性挂载：

```js
// 遍历 props 阶段
for (const key in props) {
	const val = props[key];
	// 判断是否是事件属性
	const isOn = (key: string) => /^on[A-Z]/.test(key);
	if (isOn(key)) {
		const event = key.slice(2).toLowerCase();
		el.addEventListener(event, val);
	}
	// 其他 props 作为节点 attribute 处理
	else {
		el.setAttribute(key, val);
	}
}
```

[25. Element 节点的事件注册](https://github.com/EsunR/mini-vue/commit/7cb8f2bf5ca7343cc77f8ae23ba71d9aa0e5c183 "25. Element 节点的事件注册")

### 3.6 实现组件 props 逻辑

Vue 的组件 Props 必须满足以下三个特性：

1. 在 setup 函数的第一个参数中可以获取到 props；
2. 在组件的 render 函数中可以通过 `this.xxx` 来获取 props；
3. 组件 props 是只读的

首先，在 `setupComponent` 阶段需要初始化 Props，执行 `initProps` 函数，其主要行为就是将 VNode 的 props 属性挂载到组件实例上，让 ComponentInstance 也拥有 props 属性。

其次，在 `setupStatefulComponent` 阶段，需要执行组件的 setup 函数，这时就可以通过组件实例，将 props 作为 setup 函数的第一个参数传入，这样就可以在 setup 函数中获取到 props。同时为了保证 props 为只读，可以利 reactive 模块的 `readonly` 方法将 props 包裹为只读对象。

最后，为了保证 render 函数中可以通过 `this.xxx` 来获取 props 上传递的属性，在 [3.3 实现组件代理对象](#33-实现组件代理对象) 章节中的属性代理阶段，需要将组件 props 也代理到组件实例上：

```diff
export const PublicInstanceProxyHandlers: ProxyHandler<{
    _: ComponentInstance;
}> = {
    get({ _: instance }, key: string) {
        const { setupState, props } = instance;

        if (hasOwn(setupState, key)) {
            return setupState[key];
+       } else if (hasOwn(props, key)) {
+           return props[key];
+       }

        // public properties
        const publicGetter = publicPropertiesMap[key];
        if (publicGetter) {
            return publicGetter(instance);
        }
    },
};
```

[26. 实现组件 props 逻辑](https://github.com/EsunR/mini-vue/commit/76c35efd29b0082860430504e86ae2f9a0dbba48)


### 3.7 实现组件 emit 功能

在组件的 setup 函数中，通过函数的 context 参数位，可以解构出 `emit` 方法用来触发事件。我们要在 `createComponentInstance` 创建组件实例的阶段来实现这个功能：

```js
export function createComponentInstance(vnode: VNode) {
    const instance: ComponentInstance = {
        // ... ...
    };
    // 处理 emit 调用
    instance.emit = emit.bind(null, instance);
    return instance;
}
```

emit 方法的具体实现：

```js
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
```

[27. 实现组件 emit 功能](https://github.com/EsunR/mini-vue/commit/ef46ff5fe93799dc772d191ef766421eda690ccb)

### 3.8 实现组件 slot 

在 Vue 中，我们使用 render 函数来创建插槽与使用 template 创建有所不同。

在父组件中使用插槽，是在 `h` 函数的 children 参数为传入一个对象，对象的 key 即为插槽的名称，对象的值为一个函数，函数的参数位用于传递组件作用域，函数的返回值为一个 VNode 对象或者 VNode 数组，示例如下：


```js
// Foo 组件拥有 header 和 footer 两个插槽，其中 header 组件通过插槽作用域传递了一些数据
h(
    Foo,
    {},
    {
        header: (scope) =>
            h("p", {}, `header slot, scope: ${JSON.stringify(scope)}`),
        footer: () => [
            h("p", {}, "footer slot"),
            h("p", {}, "end footer slot"),
        ],
    },
)
```

在子组件中，可以使用 `$slots` 来获取插槽对象，然后通过插槽对象的 key 来获取对应的插槽内容并进行渲染和传递作用域，这一过程被封装在 `renderSlots` 方法中，因此可写为：

```js
render() {
    const age = 18;
    return h("div", {}, [
        renderSlots(
            this.$slots,
            "header",
            // 传递组件作用域
            { age }
        ),
        // ... ... 其他 VNode
        renderSlots(this.$slots, "footer"),
    ]);
}
```

`renderSlots` 方法负责调用 `createVNode` 函数将插槽内容渲染在一个 Fragment 中，然后将 Fragment 作为 VNode 返回，同时还会传递作用域到插槽内容中。

> 这里进行了一定的简化，如果想要查看 template 转为 render 函数的具体结果，可以访问 [template-explorer](https://template-explorer.vuejs.org/) 查看。

Vue 在 `setupComponent` 初始化组件实例阶段完成对 props 的初始化后开始初始化插槽，其过程如下：

1. 判断节点是否是 SLOTS_CHILDREN，如果有则说明当前 VNode 是一个组件 VNode 并且拥有插槽；
2. 将 VNode 的 children 进行 normalize 处理，将其挂载到组件实例的 slots 属性上，即 ComponentInstance\['slots'\];
3. 在组件属性代理阶段，将组件实例的 slots 值代理到 `$slots` 上。

[28. 实现组件 slot](https://github.com/EsunR/mini-vue/commit/dd2453013a8a825b0fb5b420e02e40dddae0a390)

### 3.9 实现 Fragment 和 Text 类型节点

我们在使用 Vue 的 render 函数编写组件时，如果想将多个 VNode 作为一个整体返回，可以使用 Fragment 来包裹多个 VNode，示例如下：

```js
h(Fragment, {}, [
    h("p", {}, "hello"),
    h("p", {}, "world"),
])
```

这样渲染出的结果就是两个 `p` 标签，而不需要容器节点：

```html
<p>hello</p>
<p>world</p>
```

我们为了实现这一功能，需要单独为其创建一个 `VNode.type` 类型来让其在 `patch` 阶段能够被识别，我们可以使用 Symbol 来创建该类型，然后在 `patch` 函数中进行判断：

```ts
const Fragment = Symbol("Fragment");

// ... ...

function patch(vnode: VNode, container: HTMLElement) {
    const { shapeFlag, type } = vnode;

    switch (type) {
        case Fragment:
            // 处理 Fragment 类型节点
            processFragment(vnode, container);
            break;
        default:
            // 判断其他类型节点的逻辑，比如 Element、Component
            if (shapeFlag & ShapeFlags.ELEMENT) {
                processElement(vnode, container);
            } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                processComponent(vnode, container);
            }
            break;
    }
}
```

处理 Fragment 类型的节点时，我们需要将 Fragment 的 children 递归进行 patch，然后将其挂载到 Fragment 节点的 container 中即可，这一步我们可以直接使用之前写好的 `mountChildren` 方法：

```ts
function processFragment(vnode: VNode, container: HTMLElement) {
    mountChildren(vnode, container);
}
```

此外，与 Fragment 节点类似的还有 Text 节点，这类节点用于单独渲染文本，通常会使用 `createTextVNode` 来创建：

```js
h(
    "div",
    {},
    [
        h("span", {}, "hello"),
        // 这里不能直接使用字符串创建，而是要使用 createTextVNode 来创建一个 VNode 对象
        createTextVNode("text vnode"),
        h("span", {}, "world"),
    ]
)
```

[29. 实现 Fragment 和 Text 类型节点](https://github.com/EsunR/mini-vue/commit/dff6b6f250fcf0e4d43fbd405a8cef5ff542c81e)
