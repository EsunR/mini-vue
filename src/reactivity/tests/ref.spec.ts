import { effect } from "../effect";
import { reactive } from "../reactive";
import { isRef, proxyRefs, ref, unref } from "../ref";

describe("ref", () => {
    it("happy path", () => {
        const a = ref(1);
        expect(a.value).toBe(1);
    });

    it("should be reactive", () => {
        const a = ref(1);
        let dummy;
        let calls = 0;
        effect(() => {
            calls++;
            dummy = a.value;
        });
        expect(calls).toBe(1);
        expect(dummy).toBe(1);
        a.value = 2;
        expect(calls).toBe(2);
        expect(dummy).toBe(2);
        // 如果新值和旧值相同，不会触发响应
        a.value = 2;
        expect(calls).toBe(2);
        expect(dummy).toBe(2);
    });

    it("should make nested properties reactive", () => {
        const a = ref({
            count: 1,
        });
        let dummy;
        effect(() => {
            dummy = a.value.count;
        });
        expect(dummy).toBe(1);
        a.value.count = 2;
        expect(dummy).toBe(2);
    });

    it("isRef", () => {
        const a = ref(1);
        const user = reactive({
            age: 1,
        });
        expect(isRef(a)).toBe(true);
        expect(isRef(1)).toBe(false);
        expect(isRef(user)).toBe(false);
    });

    it("unref", () => {
        const a = ref(1);
        expect(unref(a)).toBe(1);
        expect(unref(1)).toBe(1);
    });

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
});
