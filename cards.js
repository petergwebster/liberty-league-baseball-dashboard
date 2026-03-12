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
    cardsWrapEl.innerHTML = "";

    rows.forEach((r) => {
      const teamName = r.team != null ? r.team : "Unknown";
      const eraVal = r.era != null ? r.era : "";
      const wlVal = r["w-l"] != null ? r["w-l"] : "";
      const gVal = r.g != null ? r.g : "";
      const ipVal = r.ip != null ? r.ip : "";
      const svVal = r.sv != null ? r.sv : "";

      const card = document.createElement("div");
      card.style.border = "1px solid #ddd";
      card.style.borderRadius = "12px";
      card.style.padding = "14px";
      card.style.margin = "12px 0";
      card.style.background = "#fff";

      card.innerHTML =
        "<div style='display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap;'>" +
        "<h3 style='margin:0;'>" +
        teamName +
        "</h3>" +
        "<div style='opacity:.7; font-size:13px;'>Pitching</div>" +
        "</div>" +
        "<div style='display:flex; gap:18px; flex-wrap:wrap; margin-top:8px; font-size:14px;'>" +
        "<div><strong>ERA</strong> " +
        eraVal +
        "</div>" +
        "<div><strong>W-L</strong> " +
        wlVal +
        "</div>" +
        "<div><strong>G</strong> " +
        gVal +
        "</div>" +
        "<div><strong>IP</strong> " +
        ipVal +
        "</div>" +
        "<div><strong>SV</strong> " +
        svVal +
        "</div>" +
        "</div>";

      cardsWrapEl.appendChild(card);
    });
  }

  try {
    setState("Loading...", false);
    if (lastGenEl) lastGenEl.textContent = "";

    if (!cardsWrapEl) {
      throw new Error('Missing element id="cardsWrap" in cards HTML.');
    }

    const manifestUrl = "/data/manifest.json";
    const statsUrl = "/data/live_team_stats.json";

    try {
      const manifest = await fetchJsonOrThrow(manifestUrl);
      if (lastGenEl) lastGenEl.textContent = manifest.generated_at || "";
    } catch (e) {
      if (lastGenEl) lastGenEl.textContent = "";
    }

    const payload = await fetchJsonOrThrow(statsUrl);
    const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];

    if (!rows.length) {
      setState("Loaded (0 teams)", false);
      showMessage("Fetched " + statsUrl + " but rows[] was empty.");
      return;
    }

    setState("Loaded team cards", false);
    renderCards(rows);
  } catch (err) {
    console.error(err);
    setState("Failed", true);
    if (lastGenEl) lastGenEl.textContent = "(error)";
    showMessage(String(err));
  }
});
