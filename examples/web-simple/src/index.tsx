export default {
  foo: import("./foo/index.tsx"),
  "index.html": (
    <html>
      <head>
        <link rel="stylesheet" href="main.css" />
      </head>
      <body>
        <h1>Hello World</h1>
        <a href="foo/">Foo</a>
      </body>
    </html>
  ),
  "main.css": `h1 { color: red }`,
};
