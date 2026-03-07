import { createHot, hotAllowShutdown } from "#hot";

import { expect, test } from "../helpers.ts";

test.suite("hot invalidate", () => {
  test("simple", async () => {
    const hot = createHot(import.meta);

    const start = Date.now();
    const times: unknown[] = [(await import("./timestamp.ts")).default];
    hot.accept("./timestamp.ts", (mod) => {
      times.push(mod?.default);
    });

    expect(times).length(1);
    expect(times[0]).closeTo(start, 100);

    hot.invalidate("./timestamp.ts");
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(times).length(2);
    expect(times[0]).closeTo(start, 100);
    expect(times[1]).closeTo(start, 200).greaterThan(start);

    hotAllowShutdown();
  });
});
