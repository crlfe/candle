import { fileURLToPath } from "node:url";

import { rolldown as rolldownImpl } from "rolldown";

export default {
  "index.html": "".concat(
    `<!DOCTYPE html>`,
    `<html>`,
    `<head>`,
    `<meta charset="utf-8">`,
    `<title>Candle Documentation</title>`,
    `<link rel="stylesheet" href="./index.css">`,
    `</head>`,
    `<body>`,
    `<h1>Candle Documentation</h1>`,
    `<p>TODO: Write some usage documentation</p>`,
    `<p>TODO: Process the jsdoc into an API reference</p>`,
    `</body>`,
    `</html>`,
  ),
  "index.css": "".concat(
    `html{margin:0;padding:0;font-family:sans-serif}`,
    `body{margin:1rem;padding:0}`,
    `h1{margin:1rem 0}`,
  ),
  "...": async () => {
    await using build = await rolldownImpl({
      cwd: fileURLToPath(import.meta.resolve("..")),
      external(id) {
        return !id.startsWith(".") && !id.startsWith("#") && !id.startsWith("/");
      },
      input: {
        cli: "./cli/index.ts",
        "cli-build": "./cli/build.ts",
        "cli-serve": "./cli/serve.ts",
        hot: "./hot/index.ts",
        "hot-register": "./hot/register.ts",
        jsx: "./jsx/index.ts",
        "jsx-jsx-runtime": "./jsx/jsx-runtime.ts",
        "serve-browser": "./cli/serve-browser.js",
        util: "./util/index.ts",
      },
      platform: "node",
    });

    const generated = await build.generate({
      assetFileNames: "a/[name]-[hash].[ext]",
      chunkFileNames: "a/[name]-[hash].js",
    });

    return Object.fromEntries(
      generated.output.map((c) => {
        if (c.type === "chunk") {
          return [c.fileName, c.code];
        } else {
          return [c.fileName, c.source];
        }
      }),
    );
  },
};
