import {
    h,
    createTextVNode,
    getCurrentInstance,
    provide,
    inject,
} from "../../lib/mini-vue.esm.js";

export const App = {
    name: "App",
    render() {
        return h(Provider);
    },
    setup() {},
};

const Provider = {
    name: "Provider",
    setup() {
        provide("foo", "fooVal");
        provide("bar", "barVal");
    },
    render() {
        return h("div", {}, [h("p", {}, "Provider"), h(Middle)]);
    },
};

const Middle = {
    name: "Middle",
    setup() {
        provide("foo", "foo_middle");
        const foo = inject("foo");

        return {
            foo,
        };
    },
    render() {
        return h("div", {}, [
            h("p", {}, `Middle: foo:${this.foo}`),
            h(Consumer),
        ]);
    },
};

const Consumer = {
    name: "Consumer",
    setup() {
        const foo = inject("foo");
        const bar = inject("bar");
        const baz = inject("baz", "baz_default");

        return {
            foo,
            bar,
        };
    },
    render() {
        return h("div", {}, `Consumer - foo:${this.foo} bar:${this.bar}`);
    },
};
