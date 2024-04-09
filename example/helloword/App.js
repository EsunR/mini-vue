import { h } from "../../lib/mini-vue.esm.js";

export const App = {
    render() {
        return h(
            "div",
            {
                id: "root",
                class: ["blue", "hard"],
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
                    "this is your message: xxx",
                ),
            ],
        );
    },
    setup() {
        return {
            msg: "mini-vue",
        };
    },
};
