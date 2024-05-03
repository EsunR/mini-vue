import {
    h,
    createTextVNode,
    getCurrentInstance,
} from "../../lib/mini-vue.esm.js";
import { Foo } from "./Foo.js";

export const App = {
    name: "App",
    render() {
        return h("rect", { x: this.x, y: this.y });
    },
    setup() {
        return {
            x: 100,
            y: 100,
        };
    },
};
