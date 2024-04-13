import { h } from "../../lib/mini-vue.esm.js";

window.self = null;
export const App = {
    render() {
        window.self = this;
        return h(
            "div",
            {
                id: "root",
                class: ["blue", "hard"],
                onMousedown() {
                    console.log("mousedown");
                },
                onMouseup() {
                    console.log("mouseup");
                },
            },
            [
                h(
                    "p",
                    {
                        class: ["red"],
                    },
                    "hello!",
                ),
                h(
                    "p",
                    {
                        class: ["blue"],
                    },
                    "this is your message: " + this.msg,
                ),
                h(SubComponent),
            ],
        );
    },
    setup() {
        return {
            msg: "mini-vue",
        };
    },
};

const SubComponent = {
    render() {
        return h("div", {}, "SubComponent");
    },
    setup() {
        return {};
    },
};
