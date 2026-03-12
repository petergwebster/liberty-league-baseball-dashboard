document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");

  const cardsWrapEl =
    document.getElementById("cardsWrap") ||
    document.getElementById("teamCards") ||
    document.getElementById("cards") ||
    document.getElementById("tableWrap");

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

  async function fetchJson(urlPath) {
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
      const teamName = r.team != null ? r.team : "Unknown";
      const eraVal = r.era != null ? r.era : "";
      const wlVal = r["w-l"] != null ? r["w-l"] : "";
      const gVal = r.g != null ? r.g : "";
      const ipVal = r.ip != null ? r.ip : "";
      const svVal = r.sv != null ? r.sv : "";

      const card = document.createElement("div");
      card.style.border = "1px solid #ddd";
      card.style.borderRadius = "10px";
      card.style.padding = "12px";
      card.style.margin = "10px 0";

      card.innerHTML =
        "<h3 style='margin:0 0 6px 0;'>" +
        teamName +
        "</h3>" +
        "<div style='display:flex; gap:16px; flex-wrap:wrap; font-size:14px;'>" +
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

    // absolute paths to avoid /cards relative-path issues
    const manifestUrl = "/data/manifest.json";
    const teamStatsUrl = "/data/live_team_stats.json";

    // manifest is optional for cards (don’t fail the whole page if it’s missing)
    try {
      const manifest = await fetchJson(manifestUrl);
      const generatedAt = manifest && manifest.generated_at ? manifest.generated_at : "";
      if (lastGenEl) lastGenEl.textContent = generatedAt || "(unknown)";
    } catch (e) {
      if (lastGenEl) lastGenEl.textContent = "";
      console.warn("Manifest not loaded:", e);
    }

    const payload = await fetchJson(teamStatsUrl);
    const rows = Array.isArray(payload.rows) ? payload.rows : [];

    setState("Loaded team cards", false);
    renderCards(rows);
  } catch (err) {
    console.error(err);
    setState("Failed", true);
    if (lastGenEl) lastGenEl.textContent = "(error)";
    showMessage(String(err));
  }
});
