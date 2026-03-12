// VERY SMALL DEBUG SCRIPT
document.addEventListener("DOMContentLoaded", async function () {
  const statusEl = document.getElementById("status");
  const outEl = document.getElementById("output");

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = "Status: " + msg;
  }

  setStatus("script loaded, starting fetch...");

  try {
    // SINGLE ABSOLUTE PATH FETCH
    const res = await fetch("/players.json", { cache: "no-store" });
    setStatus("got response: " + res.status);

    if (!res.ok) {
      outEl.textContent = "Fetch failed with status " + res.status;
      return;
    }

    const json = await res.json();
    setStatus("JSON parsed");

    // Show just a bit of the data
    const preview = Array.isArray(json)
      ? json.slice(0, 3)
      : (json.rows || []).slice(0, 3);

    outEl.textContent =
      "Preview of first rows:\n\n" + JSON.stringify(preview, null, 2);
  } catch (err) {
    setStatus("error");
    outEl.textContent = "Error: " + (err && err.message ? err.message : err);
  }
});
