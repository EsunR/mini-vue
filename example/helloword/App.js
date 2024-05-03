import {
    h,
    createTextVNode,
    getCurrentInstance,
} from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
    name: 'App',
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
        const instance = getCurrentInstance();
        console.log("🚀 ~ setup ~ instance:", instance)

        return {
            msg: "mini-vue",
        };
    },
};
