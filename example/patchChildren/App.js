import { h } from "../../lib/mini-vue.esm.js";

import ArrayToText from "./components/ArrayToText.js";
import TextToText from "./components/TextToText.js";
import TextToArray from "./components/TextToArray.js";
// import ArrayToArray from "./components/ArrayToArray.js";

export const App = {
    name: "App",
    setup() {},
    render() {
        return h("div", { id: "root" }, [
            h("p", {}, "主页"),
            // array -> text
            // h(ArrayToText),
            
            // text -> text
            // h(TextToText),

            // text -> array
            h(TextToArray),
        ]);
    },
};
