import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import { test } from "vitest";

export const testWithTempDir = test.extend<{ tempDir: string }>({
  tempDir: async ({}, use) => {
    const prefix = NodePath.join(NodeOS.tmpdir(), "vitest-candle-");
    await using handle = await NodeFS.promises.mkdtempDisposable(prefix);
    await use(handle.path);
  },
});
