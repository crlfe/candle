import { createHot, hotAllowShutdown } from "candle/hot";
import { type ModuleNamespace } from "candle/util";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";
import { createTempDir, expect, test } from "../helpers.ts";

test("accept-simple", async () => {
  await using tempDir = await createTempDir();
  const tempPath = NodePath.join(tempDir.path, "simple.js");

  const hot = createHot(import.meta);

  await NodeFS.promises.writeFile(tempPath, `export default 1;\n`);

  const imported = await import(tempPath);

  expect(imported).containSubset({ default: 1 });

  const updates: (ModuleNamespace | undefined)[] = [];
  hot.accept(tempPath, (mod) => {
    updates.push(mod);
  });

  expect(updates).length(0);

  await NodeFS.promises.writeFile(tempPath, `export default 2;\n`);
  await new Promise((resolve) => setTimeout(resolve, 200));

  expect(updates).length(1);
  expect(updates[0]).containSubset({ default: 2 });

  hotAllowShutdown();
});
