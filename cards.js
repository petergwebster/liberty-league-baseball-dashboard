document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const cardsWrapEl = document.getElementById("cardsWrap");

  function setState(msg, isError) {
    if (!stateEl) return;
    stateEl.textContent = msg;
    stateEl.style.background = isError ? "#ffe5e5" : "#e8f5e9";
    stateEl.style.border = "1px solid " + (isError ? "#ffb3b3" : "#b7e1bc");
    stateEl.style.padding = "2px 8px";
    stateEl.style.borderRadius = "999px";
    stateEl.style.display = "inline-block";
    stateEl.style.fontSize = "12px";
  }

  function showMessage(msg) {
    if (!cardsWrapEl) return;
    cardsWrapEl.innerHTML = "";
    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.padding = "10px";
    pre.style.border = "1px solid #ddd";
    pre.style.borderRadius = "8px";
    pre.textContent = msg;
    cardsWrapEl.appendChild(pre);
  }

  async function fetchJsonOrThrow(urlPath) {
    const resp = await fetch(urlPath, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error("Failed to fetch " + urlPath + " (HTTP " + resp.status + ")");
    }
    return await resp.json();
  }

  function renderCards(rows) {
    if (!cardsWrapEl) return;
    cardsWrapEl.innerHTML = "";

    if (!rows || !rows.length) {
      showMessage("No rows found in live_team_stats.json");
      return;
    }

    rows.forEach((r) => {
      // EXACT field names taken from your JSON
      const teamName = r.team != null ? r.team : "Unknown";
      const eraVal  = r.era  != null ? r.era  : "";
      const wlVal   = r["w-l"] != null ? r["w-l"] : "";  // note: "w-l" with a dash
      const gVal    = r.g    != null ? r.g    : "";
      const ipVal   = r.ip   != null ? r.ip   : "";
      const rVal    = r.r    != null ? r.r    : "";
      const erVal   = r.er   != null ? r.er   : "";

      const card = document.createElement("div");
      card.style.border = "1px solid #1b2640";
      card.style.borderRadius = "16px";
      card.style.padding = "16px 18px";
      card.style.margin = "10px 0";
      card.style.background = "#ffffff";

      card.innerHTML =
        "<div style='display:flex; justify-content:space-between; align-items:baseline; flex-wrap:wrap; gap:12px;'>" +
          "<h3 style='margin:0; font-size:18px;'>" + teamName + "</h3>" +
          "<div style='font-size:12px; opacity:.7;'>Pitching summary</div>" +
        "</div>" +
        "<div style='display:flex; flex-wrap:wrap; gap:18px; margin-top:10px; font-size:14px;'>" +
          "<div><strong>ERA</strong> " + eraVal + "</div>" +
          "<div><strong>W-L</strong> " + wlVal + "</div>" +
          "<div><strong>G</strong> " + gVal + "</div>" +
          "<div><strong>IP</strong> " + ipVal + "</div>" +
          "<div><strong>R</strong> " + rVal + "</div>" +
          "<div><strong>ER</strong> " + erVal + "</div>" +
        "</div>";

      cardsWrapEl.appendChild(card);
    });
  }

  try {
    setState("Loading...", false);
    if (lastGenEl) lastGenEl.textContent = "";

    if (!cardsWrapEl) {
      throw new Error('Missing <div id="cardsWrap"></div> in cards HTML.');
    }

    const manifestUrl = "/data/manifest
