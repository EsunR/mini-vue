import { computed } from "../computed";
import { reactive } from "../reactive";

describe("computed", () => {
    it("happy path", () => {
        const user = reactive({
            age: 1,
        });
        const age = computed(() => {
            return user.age;
        });
        expect(age.value).toBe(1);
    });

    it("should compute lazily", () => {
        const value = reactive({
            foo: 1,
        });
        const getter = jest.fn(() => {
            return value.foo;
        });
        const cValue = computed(getter);

        // 如果没有调用 cValue.value，getter 不应该被调用
        expect(getter).not.toHaveBeenCalled();
        expect(cValue.value).toBe(1);
        expect(getter).toHaveBeenCalledTimes(1);

        // 再此获取 Computed 对象的值时，getter 不应该被调用
        cValue.value;
        expect(getter).toHaveBeenCalledTimes(1);

        // 当依赖值发生变化，但没有调用计算值时，getter 不应该被调用
        value.foo = 2;
        expect(getter).toHaveBeenCalledTimes(1);

        // 计算值被调用时，getter 才被调用
        expect(cValue.value).toBe(2);
        expect(getter).toHaveBeenCalledTimes(2);

        // 再此获取 Computed 对象的值时，getter 不应该被调用
        cValue.value;
        expect(getter).toHaveBeenCalledTimes(2);
    });
});
