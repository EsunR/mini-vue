import { h, renderSlots, getCurrentInstance } from "../../lib/mini-vue.esm.js";

export const Foo = {
    name: 'Foo',
    setup(props, { emit }) {
        const instance = getCurrentInstance();
        console.log("🚀 ~ setup ~ instance:", instance);

        const onBtnClick = () => {
            emit("btn-click", { count: props.count });
        };

        return {
            onBtnClick,
        };
    },
    render() {
        const age = 18;
        const foo = h("div", {}, "props.count: " + this.count);
        const btn = h("button", { onClick: this.onBtnClick }, "click me");
        return h("div", {}, [
            foo,
            btn,
            renderSlots(this.$slots, "header", { age }),
            renderSlots(this.$slots, "footer"),
        ]);
    },
};
