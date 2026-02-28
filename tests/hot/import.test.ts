import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

import { createHot, hotAllowShutdown } from "candle/hot";

import { createTempDir, expect, test } from "../helpers.ts";

test("import-simple", async () => {
  await using tempDir = await createTempDir();
  const tempPath = NodePath.join(tempDir.path, "simple.js");

  const hot = createHot(import.meta);

  await NodeFS.promises.writeFile(tempPath, `export default 1;\n`);

  await using iter = hot.import(tempPath);

  await expect(iter.next()).eventually.containSubset({
    done: false,
    value: { default: 1 },
  });

  await NodeFS.promises.writeFile(tempPath, `export default 2;\n`);

  await expect(iter.next()).eventually.containSubset({
    done: false,
    value: { default: 2 },
  });

  hotAllowShutdown();
});

test("import-first-error", async () => {
  await using tempDir = await createTempDir();
  const tempPath = NodePath.join(tempDir.path, "first-error.js");

  const hot = createHot(import.meta);

  await NodeFS.promises.writeFile(tempPath, `this syntax is not javascript!\n`);

  await using iter = hot.import(tempPath);

  await expect(iter.next()).eventually.containSubset({
    done: false,
    value: undefined,
  });

  await NodeFS.promises.writeFile(tempPath, `export default 1;\n`);

  await expect(iter.next()).eventually.containSubset({
    done: false,
    value: { default: 1 },
  });

  hotAllowShutdown();
});

test("import-first-missing", async () => {
  await using tempDir = await createTempDir();
  const tempPath = NodePath.join(tempDir.path, "first-missing.js");

  const hot = createHot(import.meta);

  await using iter = hot.import(tempPath);

  await expect(iter.next()).eventually.containSubset({
    done: false,
    value: undefined,
  });

  await NodeFS.promises.writeFile(tempPath, `export default 1;\n`);

  await expect(iter.next()).eventually.containSubset({
    done: false,
    value: { default: 1 },
  });

  hotAllowShutdown();
});
