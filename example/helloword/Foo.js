import { h, renderSlots } from "../../lib/mini-vue.esm.js";

export const Foo = {
    setup(props, { emit }) {
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
