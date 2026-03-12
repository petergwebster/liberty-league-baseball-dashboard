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
    pre.style.padding = "12px";
    pre.style.border = "1px solid #ddd";
    pre.style.borderRadius = "10px";
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

  function safeVal(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  function renderCards(rows) {
    cardsWrapEl.innerHTML = "";

    if (!rows || !rows.length) {
      showMessage("No rows found in payload.rows");
      return;
    }

    rows.forEach((r) => {
      const teamName = safeVal(r.team) || "Unknown";
      const eraVal = safeVal(r.era);
      const wlVal = safeVal(r["w-l"]);   // IMPORTANT: key has a dash
      const gVal = safeVal(r.g);
      const ipVal = safeVal(r.ip);
      const rVal = safeVal(r.r);
      const erVal = safeVal(r.er);
      const soVal = safeVal(r.so);
      const bbVal = safeVal(r.bb);

      const card = document.createElement("div");
      card.style.border = "1px solid #1b2640";
      card.style.borderRadius = "16px";
      card.style.padding = "16px 18px";
      card.style.margin = "12px 0";
      card.style.background = "#fff";
      card.style.color = "#111";

      card.innerHTML =
        "<div style='display:flex; justify-content:space-between; align-items:baseline; gap:12px; flex-wrap:wrap;'>" +
          "<h3 style='margin:0; font-size:18px;'>" + teamName + "</h3>" +
          "<div style='font-size:12px; opacity:.7;'>Team pitching</div>" +
        "</div>" +
        "<div style='display:flex; flex-wrap:wrap; gap:18px; margin-top:10px; font-size:14px;'>" +
          "<div><strong>ERA</strong> " + eraVal + "</div>" +
          "<div><strong>W-L</strong> " + wlVal + "</div>" +
          "<div><strong>G</strong> " + gVal + "</div>" +
          "<div><strong>IP</strong> " + ipVal + "</div>" +
          "<div><strong>R</strong> " + rVal + "</div>" +
          "<div><strong>ER</strong> " + erVal + "</div>" +
          "<div><strong>SO</strong> " + soVal + "</div>" +
          "<div><strong>BB</strong> " + bbVal + "</div>" +
        "</div>";

      cardsWrapEl.appendChild(card);
    });
  }

  try {
    setState("Loading...", false);
    if (lastGenEl) lastGenEl.textContent = "";

    if (!cardsWrapEl) {
      throw new Error('Missing element id="cardsWrap" in cards/index.html');
    }

    const manifestUrl = "/data/manifest.json";
    const statsUrl = "/data/live_team_stats.json";

    // manifest optional
    try {
      const manifest = await fetchJsonOrThrow(manifestUrl);
      if (lastGenEl) lastGenEl.textContent = manifest.generated_at ? manifest.generated_at : "";
    } catch (e) {
      if (lastGenEl) lastGenEl.textContent = "";
    }

    const payload = await fetchJsonOrThrow(statsUrl);
    const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];

    setState("Loaded team cards", false);
    renderCards(rows);
  } catch (err) {
    console.error(err);
    setState("Failed", true);
    if (lastGenEl) lastGenEl.textContent = "(error)";
    showMessage(String(err));
  }
});
