import { createRenderer } from "../../lib/mini-vue.esm.js";
import { App } from "./App.js";

// init canvas
const game = new PIXI.Application();
game.init({
    width: 500,
    height: 500,
}).then(() => {
    document.body.appendChild(game.canvas);

    const renderer = createRenderer({
        createElement(type) {
            if (type === "rect") {
                const rect = new PIXI.Graphics();
                rect.beginFill(0xff0000);
                rect.drawRect(0, 0, 100, 100);
                rect.endFill();

                return rect;
            }
        },
        patchProp(el, key, val) {
            el[key] = val;
        },
        insert(el, parent) {
            parent.addChild(el);
        },
    });

    renderer.createApp(App).mount(game.stage);
});
