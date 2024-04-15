import { h, createTextVNode } from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

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
                    Foo,
                    {
                        count: 1,
                        onBtnClick(...payload) {
                            console.log(`Foo event onBtnClick, e: ${payload}`);
                        },
                    },
                    {
                        header: (scope) =>
                            h(
                                "p",
                                {},
                                `header slot, scope: ${JSON.stringify(scope)}`,
                            ),
                        footer: () => [
                            h("p", {}, "footer slot"),
                            createTextVNode("text vnode"),
                            h("p", {}, "end footer slot"),
                        ],
                    },
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