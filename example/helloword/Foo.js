import { h } from "../../lib//mini-vue.esm.js";

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
        const foo = h("div", {}, "props.count: " + this.count);
        const btn = h("button", { onClick: this.onBtnClick }, "click me");
        return h("div", {}, [foo, btn]);
    },
};
