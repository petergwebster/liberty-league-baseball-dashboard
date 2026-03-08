console.log("CARDS_JS_VERSION_A");

document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const gridEl = document.getElementById("grid");
  const sideEl = document.getElementById("side");
  const countEl = document.getElementById("count");

  function setState(txt) {
    if (stateEl) stateEl.textContent = txt;
  }

  setState("Loading...");

  let resp;
  try {
    resp = await fetch("./live_team_stats.json", { cache: "no-store" });
  } catch (err) {
    setState("Fetch failed");
    if (gridEl) gridEl.textContent = String(err);
    return;
  }

  if (!resp.ok) {
    setState("HTTP " + String(resp.status));
    if (gridEl) gridEl.textContent = "live_team_stats.json HTTP " + String(resp.status);
    return;
  }

  let payload;
  try {
    payload = await resp.json();
  } catch (err) {
    setState("Bad JSON");
    if (gridEl) gridEl.textContent = String(err);
    return;
  }

  const rows = Array.isArray(payload) ? payload : (payload.rows || payload.data || []);
  setState("Loaded " + String(rows.length));
  if (countEl) countEl.textContent = String(rows.length) + " teams";

  if (!gridEl) return;
  gridEl.innerHTML = "";

  rows.forEach(function (r) {
    const name = r.team || r.Team || r.school || r.name || "Unknown";
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = String(name);

    card.addEventListener("click", function () {
      if (!sideEl) return;
      sideEl.textContent = JSON.stringify(r, null, 2);
    });

    gridEl.appendChild(card);
  });
});
