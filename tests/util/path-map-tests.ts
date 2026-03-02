import { PathMap } from "candle/util";

import { expect, test } from "../helpers.ts";

const SIMPLE_NAME_LIST: [string, number][] = [
  ["foo/alice", 10],
  ["bar/alice", 2],
  ["foo/bob", 5],
  ["foo/charlie", 7],
  ["bar/dave", 40],
];

test.suite("PathMap", () => {
  test("simple", () => {
    const m = new PathMap(SIMPLE_NAME_LIST);

    expect(m.has("foo")).equals(false);
    expect(m.has("foo/alice")).equals(true);
    expect(m.get("foo")).equals(undefined);
    expect(m.get("foo/alice")).equals(10);

    expect(Array.from(m)).deep.equals([
      ["bar/alice", 2],
      ["bar/dave", 40],
      ["foo/alice", 10],
      ["foo/bob", 5],
      ["foo/charlie", 7],
    ]);
  });

  test.suite("set", () => {
    test("root", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);
      m.set("", 99);

      expect(Array.from(m)).deep.equals([
        ["", 99],
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo/alice", 10],
        ["foo/bob", 5],
        ["foo/charlie", 7],
      ]);
    });

    test("item-before-node", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      m.set("foo/bob/woo", 15);

      expect(Array.from(m)).deep.equals([
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo/alice", 10],
        ["foo/bob", 5],
        ["foo/bob/woo", 15],
        ["foo/charlie", 7],
      ]);
    });
    test("node-before-item", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      m.set("foo", 15);

      expect(Array.from(m)).deep.equals([
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo", 15],
        ["foo/alice", 10],
        ["foo/bob", 5],
        ["foo/charlie", 7],
      ]);
    });
  });

  test.suite("subtree", () => {
    test("chroot", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      const foo = m.subtree("foo");
      expect(foo.get("alice")).equals(10);
      expect(foo.get("/alice")).equals(10);
      expect(foo.get("./alice")).equals(10);
      expect(foo.get("/zzz/../alice")).equals(10);
      expect(foo.get(["/zzz/", "../alice"])).equals(10);
      expect(foo.get("/foo/alice")).equals(undefined);
      expect(foo.get("../foo/alice")).equals(undefined);
      expect(foo.get("/zzz/../../foo/alice")).equals(undefined);
    });

    test("get", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      expect(Array.from(m.subtree("bar"))).deep.equals([
        ["alice", 2],
        ["dave", 40],
      ]);

      expect(Array.from(m.subtree("foo"))).deep.equals([
        ["alice", 10],
        ["bob", 5],
        ["charlie", 7],
      ]);
    });

    test("set", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      m.subtree("bar").set("bob", 50);

      expect(Array.from(m)).deep.equals([
        ["bar/alice", 2],
        ["bar/bob", 50],
        ["bar/dave", 40],
        ["foo/alice", 10],
        ["foo/bob", 5],
        ["foo/charlie", 7],
      ]);
    });

    test("delete", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      m.subtree("foo").delete("bob");

      expect(Array.from(m)).deep.equals([
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo/alice", 10],
        ["foo/charlie", 7],
      ]);
    });
  });

  test.suite("fromObject", () => {
    test("simple", () => {
      const m = PathMap.fromObject({
        bar: { alice: 2, dave: 40 },
        foo: { alice: 10, bob: 5, charlie: 7 },
      });

      expect(Array.from(m)).deep.equals([
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo/alice", 10],
        ["foo/bob", 5],
        ["foo/charlie", 7],
      ]);
    });

    test("copy", () => {
      const a = new PathMap(SIMPLE_NAME_LIST);
      a.set("", -1);
      a.set("foo", 99);

      const b = PathMap.fromObject(a.toObject());

      expect(Array.from(b)).deep.equals([
        ["", -1],
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo", 99],
        ["foo/alice", 10],
        ["foo/bob", 5],
        ["foo/charlie", 7],
      ]);
    });

    test("collections", () => {
      const obj0 = new Set(["foo-value"]);
      const obj1 = ["bar-0", "bar-1"];
      const obj2 = new Map([["key-0", "value-0"]]);

      const m = PathMap.fromObject<number | string[] | Set<string> | Map<string, string>>({
        bar: { "": obj0, alice: 2, dave: 40 },
        foo: { alice: obj1, bob: 5, charlie: 7 },
        woo: obj2,
      });

      expect(Array.from(m)).deep.equals([
        ["bar", obj0],
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo/alice", obj1],
        ["foo/bob", 5],
        ["foo/charlie", 7],
        ["woo", obj2],
      ]);
    });

    test("cyclic", () => {
      const obj = {
        bar: { alice: 2, dave: 40 },
        foo: { alice: 10, bob: 5, charlie: 7, bar: undefined as unknown },
      };
      obj.foo.bar = obj.bar;

      expect(() => PathMap.fromObject(obj)).throws("cyclic");
    });
  });

  test.suite("toObject", () => {
    test("simple", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      expect(m.toObject()).deep.equals({
        bar: { alice: 2, dave: 40 },
        foo: { alice: 10, bob: 5, charlie: 7 },
      });
    });
    test("item-before-node", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      m.set("foo/bob/woo", 15);

      expect(m.toObject()).deep.equals({
        bar: { alice: 2, dave: 40 },
        foo: { alice: 10, bob: { "": 5, woo: 15 }, charlie: 7 },
      });
    });
    test("node-before-item", () => {
      const m = new PathMap(SIMPLE_NAME_LIST);

      m.set("foo", 15);

      expect(m.toObject()).deep.equals({
        bar: { alice: 2, dave: 40 },
        foo: { "": 15, alice: 10, bob: 5, charlie: 7 },
      });
    });
  });
});
