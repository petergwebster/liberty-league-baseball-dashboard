document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const gridEl = document.getElementById("grid");
  const sideEl = document.getElementById("side");

  function setState(txt) {
    if (stateEl) stateEl.textContent = txt;
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  try {
    setState("Loading...");
    const resp = await fetch("./live_team_stats.json", { cache: "no-store" });
    if (!resp.ok) {
      throw new Error("live_team_stats.json HTTP " + resp.status);
    }

    const payload = await resp.json();
    const rows = Array.isArray(payload) ? payload : (payload.rows || payload.data || []);

    setState("Loaded " + String(rows.length));

    if (!gridEl) return;
    gridEl.innerHTML = "";

    rows.forEach(function (r) {
      const name = r.team || r.Team || r.school || r.name || "Unknown";
      const card = document.createElement("div");
      card.className = "card";
      card.textContent = String(name);

      card.addEventListener("click", function () {
        if (!sideEl) return;
        sideEl.innerHTML =
          "
