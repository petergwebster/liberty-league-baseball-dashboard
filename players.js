document.addEventListener("DOMContentLoaded", function () {
  function byId(idVal) {
    return document.getElementById(idVal);
  }

  function safeText(idVal, textVal) {
    const elVal = byId(idVal);
    if (!elVal) return;
    elVal.textContent = String(textVal);
  }

  function esc(textVal) {
    return String(textVal)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderPlayers(rowsVal) {
    const gridEl = byId("playersGrid");
    if (!gridEl) return;

    gridEl.innerHTML = rowsVal.map(function (pVal) {
      const nameVal = pVal.player || pVal.name || "Unknown";
      const teamVal = pVal.team || "";
      const abVal = pVal.ab != null ? String(pVal.ab) : "";
      const paVal = pVal.pa != null ? String(pVal.pa) : "";
      const opsVal = pVal.ops != null ? String(pVal.ops) : "";

      return (
        "<div class='player-card'>" +
          "<div class='player-name'>" + esc(nameVal) + "</div>" +
          "<div class='player-team'>" + esc(teamVal) + "</div>" +
          "<div class='player-stats'>" +
            "<span>AB " + esc(abVal) + "</span>" +
            "<span>PA " + esc(paVal) + "</span>" +
            "<span>OPS " + esc(opsVal) + "</span>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  (async function init() {
    safeText("statePill", "Loading...");

    const resVal = await fetch("/players.json", { cache: "no-store" });
    if (!resVal.ok) throw new Error("players.json HTTP " + resVal.status);
    const payloadVal = await resVal.json();

    const rowsVal = Array.isArray(payloadVal) ? payloadVal : (payloadVal.rows || payloadVal.players || []);
    safeText("statePill", "Loaded player cards");
    safeText("playersCount", rowsVal.length);

    renderPlayers(rowsVal);
  })().catch(function (eVal) {
    console.error(eVal);
    safeText("statePill", "Load failed");
  });
});
