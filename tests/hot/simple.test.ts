import { createHot } from "candle/hot";
import { testWithTempDir } from "../helpers.ts";
import * as NodePath from "node:path";
import * as NodeFS from "node:fs";

testWithTempDir("import-simple", async ({ expect, tempDir }) => {
  const hot = createHot(import.meta);
  const fooPath = NodePath.join(tempDir, "simple.js");

  await NodeFS.promises.writeFile(fooPath, `export default 1;\n`);

  const iter = hot.import(fooPath)[Symbol.asyncIterator]();
  await expect(iter.next()).resolves.toHaveProperty(["value", "default"], 1);

  await NodeFS.promises.writeFile(fooPath, `export default 2;\n`);

  await expect(iter.next()).resolves.toHaveProperty(["value", "default"], 2);
});

testWithTempDir("import-first-error", async ({ expect, tempDir }) => {
  const hot = createHot(import.meta);
  const fooPath = NodePath.join(tempDir, "first-error.js");

  await NodeFS.promises.writeFile(fooPath, `this is not javascript!\n`);

  const iter = hot.import(fooPath)[Symbol.asyncIterator]();
  await expect(iter.next()).resolves.toHaveProperty("value", undefined);

  await NodeFS.promises.writeFile(fooPath, `export default 1;\n`);

  await expect(iter.next()).resolves.toHaveProperty(["value", "default"], 1);
});

testWithTempDir("import-first-missing", async ({ expect, tempDir }) => {
  const hot = createHot(import.meta);
  const fooPath = NodePath.join(tempDir, "first-missing.js");

  const iter = hot.import(fooPath)[Symbol.asyncIterator]();
  await expect(iter.next()).resolves.toHaveProperty("value", undefined);

  await NodeFS.promises.writeFile(fooPath, `export default 1;\n`);

  await expect(iter.next()).resolves.toHaveProperty(["value", "default"], 1);
});
