import { h, ref } from "../../lib/mini-vue.esm.js";

export const App = {
    name: "App",
    setup() {
        const count = ref(0);
        const props = ref({
            foo: "foo",
            bar: "bar",
        });

        const onClick = () => {
            count.value++;
        };

        const onChangePropsDemo1 = () => {
            props.value.foo = "new-foo";
        };

        const onChangePropsDemo2 = () => {
            props.value.foo = undefined;
        };

        const onChangePropsDemo3 = () => {
            props.value = {
                foo: "foo",
            };
        };

        return {
            count,
            props,
            onClick,
            onChangePropsDemo1,
            onChangePropsDemo2,
            onChangePropsDemo3,
        };
    },
    render() {
        return h("div", { id: "root", ...this.props }, [
            h("div", {}, `count: ${this.count}`),
            h("button", { onClick: this.onClick }, "click"),
            h(
                "button",
                { onClick: this.onChangePropsDemo1 },
                "修改 props 的属性值",
            ),
            h(
                "button",
                { onClick: this.onChangePropsDemo2 },
                "修改 props 的属性值为空",
            ),
            h(
                "button",
                { onClick: this.onChangePropsDemo3 },
                "删除 props 的属性",
            ),
        ]);
    },
};
