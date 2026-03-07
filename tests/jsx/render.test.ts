import { jsx, jsxToHtml, jsxToXml } from "candle/jsx";

import { expect, test } from "../helpers.ts";

test.suite("jsx render to html", () => {
  test("simple", () => {
    const doc = jsx("html", {
      children: [
        jsx("head", {
          children: [
            jsx("meta", { charset: "utf-8" }),
            jsx("link", { rel: "stylesheet", href: "main.css" }),
            jsx("script", { type: "module", src: "main.js" }),
          ],
        }),
        jsx("body", {
          children: jsx("main", { children: jsx("h1", { children: "Hello World" }) }),
        }),
      ],
    });

    expect(jsxToHtml(doc)).equals(
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

test.suite("jsx render to xml", () => {
  test("simple", () => {
    expect(jsxToXml(jsx("h1", { children: "Hello World" }))).equals(`<h1>Hello World</h1>`);
  });

  test("self-closing-void", () => {
    expect(jsxToXml(jsx("meta", { charset: "utf-8" }))).equals(`<meta charset="utf-8" />`);
  });

  test("self-closing-script", () => {
    expect(jsxToXml(jsx("script", { type: "module", src: "main.js" }))).equals(
      `<script type="module" src="main.js" />`,
    );
  });
});
