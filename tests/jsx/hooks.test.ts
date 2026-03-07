import { ensureJsxHooksRegistered, isVNode, jsxToHtml } from "#jsx";

import { expect, test } from "../helpers.ts";

test.suite("jsx hooks", () => {
  test("simple", async () => {
    ensureJsxHooksRegistered({ jsxImportSource: "candle" });

    const example = (await import("./example.tsx")).default();

    expect(isVNode(example));
    expect(jsxToHtml(example)).equals(
      "".concat(
        `<html>`,
        `<head>`,
        `<meta charset="utf-8">`,
        `<link rel="stylesheet" href="main.css">`,
        `<script type="module" src="main.js"></script>`,
        `</head>`,
        `<body>`,
        `<main>`,
        `<h1>Hello World</h1>`,
        `</main>`,
        `</body>`,
        `</html>`,
      ),
    );
  });
});
