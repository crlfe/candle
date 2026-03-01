const ws = new WebSocket("/.candle/reload");
ws.addEventListener("open", () => {
  console.log("[Candle] Waiting for reload...");
  let dialog;
  function reloadWhenReady() {
    fetch("/.candle/ping").then(
      () => location.reload(),
      () => {
        if (!dialog) {
          dialog = document.createElement("dialog");
          dialog.textContent = `Waiting for server...`;
          document.body.append(dialog);
          dialog.showModal();
        }
        setTimeout(reloadWhenReady, 1000);
      },
    );
  }
  ws.addEventListener("close", reloadWhenReady, { once: true });
});
