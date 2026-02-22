= Candle

Candle is a collection of utilities and libraries for quickly and easily
building small, mostly self-contained, websites, webapps, and web games.

This software is a proof of concept. Do not try to use it for anything real,
because it will likely break in unexpected ways at the worst time. It is
released mostly so that I have something to point people at when I'm rambling
about concepts and prototypes.

== Hot Reloading

Run the example (tested with Node v24.11.0):
```
pnpm i
node ./examples/hot-import/index.ts
```

Then modify the 'bar.ts', 'foo.ts', or 'greet.ts' files. As soon as you save
a change the 'hot.import' in 'index.ts' will be updated, and the new message
will be printed.

The same technique can be used to instantly update configuration files,
plugins, or parts of an application during development. I intend to use code
rewrites to provide 'import.meta.hot', so code deeper in the application can
do fine-grained reloads that simply vanish from the release bundle.

== License and Warranty Disclaimer

    Copyright 2026 Chris Wolfe (https://crlfe.ca/)

    Permission is hereby granted, free of charge, to any person obtaining a
    copy of this software and associated documentation files (the “Software”),
    to deal in the Software without restriction, including without limitation
    the rights to use, copy, modify, merge, publish, distribute, sublicense,
    and/or sell copies of the Software, and to permit persons to whom the
    Software is furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
    THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
    FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
    DEALINGS IN THE SOFTWARE.
