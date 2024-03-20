import { isProxy, isReactive, reactive } from "../reactive";

describe("reactive", () => {
    it("happy path", () => {
        const original = { foo: 1 };
        const observed = reactive(original);
        expect(observed).not.toBe(original);
        expect(observed.foo).toBe(1);
        expect(isReactive(observed)).toBe(true);
        expect(isReactive(original)).toBe(false);
        expect(isProxy(observed)).toBe(true);
    });

    test("nest reactive", () => {
        const original = {
            nested: {
                foo: 1,
            },
            array: [{ bar: 2 }],
        };
        const observed = reactive(original);
        expect(isReactive(observed.nested)).toBe(true);
        expect(isReactive(observed.array)).toBe(true);
        expect(isReactive(observed.array[0])).toBe(true);
        // 添加新属性时同样会被转化为响应式
        observed.nested.loo = { val: 1 };
        expect(isReactive(observed.nested.loo)).toBe(true);
    });
});
