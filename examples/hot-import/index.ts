import { createHot } from "candle/hot";

async function main() {
  const hot = createHot(import.meta);
  for await (const greet of hot.import("./greet.ts")) {
    console.log(`Example says: ${greet?.default}`);
  }
}

if (import.meta.main) {
  main();
}
