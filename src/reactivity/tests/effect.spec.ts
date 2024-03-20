import { reactive } from "../reactive";
import { effect, stop } from "../effect";

describe("effect", () => {
    it("happy path", () => {
        const user = reactive({
            age: 10,
        });

        // track
        let nextAge;
        let called = 0;
        effect(() => {
            nextAge = user.age + 1;
            called++;
        });
        expect(called).toBe(1);
        expect(nextAge).toBe(11);

        // update
        user.age++;
        expect(nextAge).toBe(12);
        expect(called).toBe(2);

        user.age = 11;
        expect(nextAge).toBe(12);
        expect(called).toBe(3);
    });

    it("should return runner when call effect", () => {
        let foo = 10;
        const runner = effect(() => {
            foo++;
            return "foo";
        });
        expect(foo).toBe(11);
        const r = runner();
        expect(foo).toBe(12);
        expect(r).toBe("foo");
    });

    it("scheduler", () => {
        /**
         * 1. 通过 effect 的第一个参数传入 fn，第二个参数传入一个 scheduler 函数
         * 2. effect 第一次执行的时候仍会执行 fn
         * 3. 当响应式对象发生 set 操作时，不会执行 fn，而是调用 scheduler 函数
         * 4. 如果手动执行 runner 函数，会立即执行 fn
         */
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
            { scheduler },
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

    it("stop", () => {
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
        expect(dummy).toBe(2);

        // stopped effect should still be manually callable
        runner();
        expect(dummy).toBe(3);
    });

    it("event: onStop", () => {
        const onStop = jest.fn();
        const runner = effect(() => {}, {
            onStop,
        });

        stop(runner);
        expect(onStop).toHaveBeenCalled();
    });
});
