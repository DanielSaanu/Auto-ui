import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@orrery/protocol": r("./packages/protocol/src/index.ts"),
      "@orrery/query": r("./packages/query/src/index.ts"),
      "@orrery/packs-core": r("./packages/packs-core/src/index.ts"),
      "@orrery/runtime": r("./packages/runtime/src/index.ts"),
    },
  },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
