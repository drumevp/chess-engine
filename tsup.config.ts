import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    target: "es2022",
    platform: "node",
    dts: true,
    clean: true,
    esbuildOptions(options) {
      options.logOverride = {
        ...options.logOverride,
        "empty-import-meta": "silent",
      };
    },
  },
  {
    entry: {
      "drumevp-chess-engine": "src/uci/main.ts",
      uciSearchWorker: "src/uci/uciSearchWorker.ts",
      lazySmpWorker: "src/search/lazySmpWorker.ts",
    },
    format: ["esm"],
    target: "es2022",
    platform: "node",
    splitting: false,
    clean: false,
  },
]);
