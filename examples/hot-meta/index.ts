import greet from "./greet.ts";

async function main() {
  console.log(`Example says: ${greet}`);
  import.meta.hot?.accept("./greet.ts", (mod) => {
    console.log(`Example says: ${mod?.default}`);
  });
}

if (import.meta.main) {
  main();
}
