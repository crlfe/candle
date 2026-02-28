import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeTest from "node:test";

import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

export const { expect } = chai;
export const { test } = NodeTest;

chai.use(chaiAsPromised);

export function createTempDir(): Promise<NodeFS.promises.DisposableTempDir> {
  const prefix = NodePath.join(NodeOS.tmpdir(), "vitest-candle-");
  return NodeFS.promises.mkdtempDisposable(prefix);
}
