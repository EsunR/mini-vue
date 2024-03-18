import { readonly, isReadonly } from "../reactive";

describe("readonly", () => {
  it("should make nested values readonly", () => {
    const original = { nested: { foo: 1 } };
    const observed = readonly(original);
    expect(observed).not.toBe(original);
    expect(isReadonly(observed)).toBe(true);
    expect(observed.nested.foo).toBe(1);
    expect(isReadonly(observed.nested)).toBe(true);
    expect(isReadonly(original.nested)).toBe(false);
  })

  it("happy path", () => {
    const original = { foo: 1 };
    const observed = readonly(original);
    expect(observed).not.toBe(original);
    expect(observed.foo).toBe(1);
  });

  it("warn then call set", () => {
    console.warn = jest.fn();
    const original: any = { foo: 1 };
    const observed = readonly(original);
    observed.foo = 2;
    expect(console.warn).toBeCalled();
    expect(original.foo).toBe(1);
  });
});
