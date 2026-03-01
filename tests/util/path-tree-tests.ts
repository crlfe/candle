import { assertNotNullish, PathTree } from "candle/util";

import { expect, test } from "../helpers.ts";

const SIMPLE_NAME_LIST = [
  ["foo/alice", 10],
  ["bar/alice", 2],
  ["foo/bob", 5],
  ["foo/charlie", 7],
  ["bar/dave", 40],
] as const;

test.suite("path-tree", () => {
  test("simple", () => {
    const t = new PathTree<number>();

    t.set("foo/alice", 10);
    t.set("bar/alice", 2);
    t.set("foo/bob", 5);

    expect(t.toDeepObject()).deep.equals({
      bar: { alice: 2 },
      foo: { alice: 10, bob: 5 },
    });

    expect(t.toFlatObject()).deep.equals({
      "bar/alice": 2,
      "foo/alice": 10,
      "foo/bob": 5,
    });
  });

  test.suite("get", () => {
    test("subkey", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.get(["foo", "alice"])).equals(10);
      expect(t.get(["foo", "bar/alice"])).equals(undefined);
      expect(t.get(["foo", "/bar/alice"])).equals(2);
      expect(t.get(["foo", "../bar/alice"])).equals(2);
      expect(t.get(["foo", "/foo/alice"])).equals(10);
      expect(t.get(["foo", "../foo/alice"])).equals(10);
    });

    test("subtree", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.get("foo")).instanceOf(PathTree);
      expect((t.get("foo") as PathTree<number>).toDeepObject()).deep.equals({
        alice: 10,
        bob: 5,
        charlie: 7,
      });

      expect(t.get("bar")).instanceOf(PathTree);
      (t.get("bar") as PathTree<number>).set("frank", -100).set("emily", -1);
      expect(t.toDeepObject()).deep.equals({
        bar: { alice: 2, dave: 40, emily: -1, frank: -100 },
        foo: { alice: 10, bob: 5, charlie: 7 },
      });
    });

    test("parent-empty", () => {
      const t = new PathTree<number>();
      expect(t.get("/")).equals(t, `key="/"`);
      expect(t.get(".")).equals(t, `key="."`);
      expect(t.get("..")).equals(t, `key=".."`);
    });

    test("unsafe", () => {
      const t = new PathTree<number>([
        ["foo", 20],
        ["woo/bar", 3],
        ["bar", 1],
      ]);

      expect(t.get("/")).instanceof(PathTree);
      expect(t.get("/foo")).equals(20);
      expect(t.get("foo/")).equals(20);
      expect(t.get("./bar")).equals(1);
      expect(t.get("woo/././bar")).equals(3);
      expect(t.get("foo/.")).equals(20);
      expect(t.get("../bar")).equals(1);
      expect(t.get("foo/../bar")).equals(1);
      expect(t.get("foo/..")).instanceof(PathTree);
      expect(t.get("foo/../../../bar")).equals(1);
    });
  });

  test.suite("delete", () => {
    test("simple", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.delete("bar/alice")).equals(true);
      expect(t.delete("bar/bob")).equals(false);
      expect(t.delete("foo")).equals(true);

      expect(t.toDeepObject()).deep.equals({
        bar: { dave: 40 },
      });
    });
  });

  test.suite("move", () => {
    test("items", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.move("foo/alice", "emily")).equals(true);
      expect(t.move("foo/charlie", "bar/dave")).equals(true);

      expect(t.toDeepObject()).deep.equals({
        bar: { alice: 2, dave: 7 },
        foo: { bob: 5 },
        emily: 10,
      });
    });

    test("trees", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.move("foo", "bar/foo")).equals(true);

      expect(t.toDeepObject()).deep.equals({
        bar: { alice: 2, dave: 40, foo: { alice: 10, bob: 5, charlie: 7 } },
      });
    });

    test("item-to-tree", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.move("foo/bob", "bar")).equals(true);

      expect(t.toDeepObject()).deep.equals({
        bar: 5,
        foo: { alice: 10, charlie: 7 },
      });
    });

    test("tree-to-item", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.move("bar", "foo/charlie")).equals(true);

      expect(t.toDeepObject()).deep.equals({
        foo: { alice: 10, bob: 5, charlie: { alice: 2, dave: 40 } },
      });
    });
  });

  test.suite("toDeepObject", () => {
    test("simple", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.toDeepObject()).deep.equals({
        bar: { alice: 2, dave: 40 },
        foo: { alice: 10, bob: 5, charlie: 7 },
      });
    });

    test("cyclic", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      t.set("foo/woo", assertNotNullish(t.get("foo")));

      const obj = t.toDeepObject();
      expect(obj).deep.equals({
        bar: { alice: 2, dave: 40 },
        foo: { alice: 10, bob: 5, charlie: 7, woo: obj.foo },
      });
    });
  });

  test.suite("toFlatEntries", () => {
    test("simple", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.toFlatEntries()).deep.equals([
        ["bar/alice", 2],
        ["bar/dave", 40],
        ["foo/alice", 10],
        ["foo/bob", 5],
        ["foo/charlie", 7],
      ]);
    });

    test("cyclic", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      t.set("foo/woo", assertNotNullish(t.get("foo")));

      expect(() => t.toFlatEntries()).throws("Cyclic");
    });
  });

  test.suite("toFlatObject", () => {
    test("simple", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      expect(t.toFlatObject()).deep.equals({
        "bar/alice": 2,
        "bar/dave": 40,
        "foo/alice": 10,
        "foo/bob": 5,
        "foo/charlie": 7,
      });
    });

    test("cyclic", () => {
      const t = new PathTree<number>(SIMPLE_NAME_LIST);

      t.set("foo/woo", assertNotNullish(t.get("foo")));

      expect(() => t.toFlatObject()).throws("Cyclic");
    });
  });
});
