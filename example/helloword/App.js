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
