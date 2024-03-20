import { isReactive, isReadonly, shallowReadonly } from "../reactive";

describe("shallowReadonly", () => {
    test("should not make non-reactive properties reactive", () => {
        const props = shallowReadonly({ n: { foo: 1 } });
        expect(isReadonly(props)).toBe(true);
        expect(isReadonly(props.n)).toBe(false);
    });

    it("warn then call set", () => {
        console.warn = jest.fn();
        const original: any = { foo: 1 };
        const observed = shallowReadonly(original);
        observed.foo = 2;
        expect(console.warn).toBeCalled();
        expect(original.foo).toBe(1);
    });
});
