import { h } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

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
                h(Foo, { count: 1 }),
            ],
        );
    },
    setup() {
        return {
            msg: "mini-vue",
        };
    },
};
