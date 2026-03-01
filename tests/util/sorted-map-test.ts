import { SortedMap } from "candle/util";

import { expect, test } from "../helpers.ts";

const SIMPLE_NAME_LIST = [
  ["Emily", 4],
  ["Betty", 10],
  ["Fred", 50],
  ["Charlie", 2],
  ["Dave", 30],
  ["Alice", 0],
] as const;

test.suite("sorted-map", () => {
  test("construct-none", () => {
    const m = new SortedMap<string, number>();

    expect(m).property("size").equals(0);
    expect(m.has("Alice")).equals(false);
    expect(m.has("Bob")).equals(false);
    expect(Array.from(m)).deep.equals([]);
  });

  test("construct-one", () => {
    const m = new SortedMap<string, number>([["Bob", 1]]);

    expect(m).property("size").equals(1);
    expect(m.has("Alice")).equals(false);
    expect(m.has("Bob")).equals(true);
    expect(Array.from(m)).deep.equals([["Bob", 1]]);
  });

  test("construct-some", () => {
    const m = new SortedMap<string, number>([
      ["Alice", 0],
      ["Bob", 1],
    ]);

    expect(m).property("size").equals(2);
    expect(m.has("Alice")).equals(true);
    expect(m.has("Bob")).equals(true);
    expect(Array.from(m)).deep.equals([
      ["Alice", 0],
      ["Bob", 1],
    ]);
  });

  test("set", () => {
    const m = new SortedMap<string, number>();

    expect(m.get("Alice")).equals(undefined);
    expect(m.get("Fred")).equals(undefined);
    m.set("Fred", 50);
    m.set("Charlie", 2);
    expect(m.get("Alice")).equals(undefined);
    expect(m.get("Fred")).equals(50);
    m.set("Emily", 4);
    m.set("Alice", 0);
    m.set("Dave", 30);
    m.set("Betty", 10);
    expect(m.get("Alice")).equals(0);
    expect(m.get("Fred")).equals(50);

    expect(Array.from(m)).deep.equals([
      ["Alice", 0],
      ["Betty", 10],
      ["Charlie", 2],
      ["Dave", 30],
      ["Emily", 4],
      ["Fred", 50],
    ]);
  });

  test("delete-first", () => {
    const p = new SortedMap<string, number>(SIMPLE_NAME_LIST);

    p.delete("Alice");

    expect(Array.from(p)).deep.equals([
      ["Betty", 10],
      ["Charlie", 2],
      ["Dave", 30],
      ["Emily", 4],
      ["Fred", 50],
    ]);
  });

  test("delete-last", () => {
    const p = new SortedMap<string, number>(SIMPLE_NAME_LIST);

    p.delete("Fred");

    expect(Array.from(p)).deep.equals([
      ["Alice", 0],
      ["Betty", 10],
      ["Charlie", 2],
      ["Dave", 30],
      ["Emily", 4],
    ]);
  });

  test("delete-several", () => {
    const p = new SortedMap<string, number>(SIMPLE_NAME_LIST);

    p.delete("Emily");
    p.delete("Alice");
    p.delete("Charlie");

    expect(Array.from(p)).deep.equals([
      ["Betty", 10],
      ["Dave", 30],
      ["Fred", 50],
    ]);
  });

  test("entries", () => {
    const p = new SortedMap<string, number>(SIMPLE_NAME_LIST);

    expect(Array.from(p.entries())).deep.equals([
      ["Alice", 0],
      ["Betty", 10],
      ["Charlie", 2],
      ["Dave", 30],
      ["Emily", 4],
      ["Fred", 50],
    ]);
  });

  test("keys", () => {
    const p = new SortedMap<string, number>(SIMPLE_NAME_LIST);

    expect(Array.from(p.keys())).deep.equals([
      "Alice",
      "Betty",
      "Charlie",
      "Dave",
      "Emily",
      "Fred",
    ]);
  });

  test("values", () => {
    const p = new SortedMap<string, number>(SIMPLE_NAME_LIST);

    expect(Array.from(p.values())).deep.equals([0, 10, 2, 30, 4, 50]);
  });
});
