document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const gridEl = document.getElementById("grid");
  const sideEl = document.getElementById("side");
  const countEl = document.getElementById("count");

  function setState(t) {
    if (stateEl) stateEl.textContent = t;
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
    if (!resp.ok) throw new Error("HTTP " + resp.status);

    const payload = await resp.json();
    const rows = Array.isArray(payload) ? payload : (payload.rows || payload.data || []);

    if (countEl) countEl.textContent = String(rows.length) + " teams";
    setState("Loaded " + String(rows.length));

    if (!gridEl) return;
    gridEl.innerHTML = "";

    rows.forEach(function (r) {
      const name = r.team || r.Team || r.school || r.name || "Unknown";
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = "<div class='title'>" + esc(name) + "</div>";

      card.addEventListener("click", function () {
        if (!sideEl) return;
        sideEl.innerHTML = "
