import pkg from "./package.json" assert { type: "json" };
import typescript from "@rollup/plugin-typescript";

export default {
    input: "./src/index.ts",
    output: [
        {
            format: "esm",
            file: pkg.module,
        },
        {
            format: "cjs",
            file: pkg.main,
        },
    ],
    plugins: [typescript()],
};
