document.addEventListener("DOMContentLoaded", function () {
  console.log("PLAYERS.JS LOADED", new Date().toISOString());

  function byId(idVal) {
    return document.getElementById(idVal);
  }

  function safeText(idVal, textVal) {
    const elVal = byId(idVal);
    if (!elVal) return;
    elVal.textContent = String(textVal);
  }

  function safeHtml(idVal, htmlVal) {
    const elVal = byId(idVal);
    if (!elVal) return;
    elVal.innerHTML = String(htmlVal);
  }

  function esc(textVal) {
    return String(textVal)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function normalizeRows(payloadVal) {
    if (!payloadVal) return [];
    if (Array.isArray(payloadVal)) return payloadVal;
    if (Array.isArray(payloadVal.rows)) return payloadVal.rows;
    if (Array.isArray(payloadVal.players)) return payloadVal.players;
    return [];
  }

  function renderPlayers(rowsVal) {
    const gridEl = byId("playersGrid");
    if (!gridEl) {
      console.log("Missing #playersGrid element");
      return;
    }

    if (!rowsVal.length) {
      gridEl.innerHTML = "<div class='errorBox'>No players found in players.json</div>";
      return;
    }

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
    console.log("init() starting");

    console.log("DOM presence",
      "statePill", !!byId("statePill"),
      "playersCount", !!byId("playersCount"),
      "playersGrid", !!byId("playersGrid")
    );

    safeText("statePill", "Loading...");

    try {
      const resVal = await fetch("/players.json", { cache: "no-store" });
      console.log("players.json HTTP", resVal.status);

      const contentTypeVal = resVal.headers.get("content-type");
      console.log("players.json content-type", contentTypeVal);

      const bodyTextVal = await resVal.text();
      console.log("players.json first 200 chars", bodyTextVal.slice(0, 200));

      if (!resVal.ok) throw new Error("players.json HTTP " + resVal.status);

      let payloadVal = null;
      try {
        payloadVal = JSON.parse(bodyTextVal);
      } catch (jsonErrVal) {
        throw new Error("players.json is not valid JSON. First 200 chars: " + bodyTextVal.slice(0, 200));
      }

      const rowsVal = normalizeRows(payloadVal);
      console.log("rowsVal length", rowsVal.length);

      safeText("playersCount", rowsVal.length);
      safeText("statePill", "Loaded player cards");
      renderPlayers(rowsVal);

      console.log("init() done");
    } catch (eVal) {
      console.error("init() error", eVal);
      safeText("statePill", "Load failed");
      safeHtml("playersGrid", "<div class='errorBox'>" + esc(eVal && eVal.message ? eVal.message : String(eVal)) + "</div>");
    }
  })();
});
