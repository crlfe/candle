import { createHot } from "../../hot/index.ts";

async function main() {
  const hot = createHot(import.meta);
  for await (const greet of hot.import("./greet.ts")) {
    console.log(`Example says: ${greet?.default}`);
  }
}

if (import.meta.main) {
  main();
}
