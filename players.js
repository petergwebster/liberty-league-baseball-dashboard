document.addEventListener("DOMContentLoaded", function () {
  function esc(textVal) {
    return String(textVal)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function byId(idVal) {
    return document.getElementById(idVal);
  }

  function setTextById(idVal, textVal) {
    const elVal = byId(idVal);
    if (!elVal) return false;
    elVal.textContent = String(textVal);
    return true;
  }

  function setVisibleLoadingText(textVal) {
    const allEls = Array.from(document.querySelectorAll("body *"));
    allEls.forEach(function (elVal) {
      if (!elVal || !elVal.childNodes || elVal.childNodes.length !== 1) return;
      if (elVal.childNodes[0].nodeType !== Node.TEXT_NODE) return;

      const tVal = (elVal.textContent || "").trim();
      if (tVal === "Loading..." || tVal === "Loading…") {
        elVal.textContent = String(textVal);
      }
    });
  }

  function setVisiblePlayersCount(countVal) {
    const allEls = Array.from(document.querySelectorAll("body *"));
    allEls.forEach(function (elVal) {
      const tVal = (elVal.textContent || "").trim();
      if (tVal === "Players 0") {
        elVal.textContent = "Players " + String(countVal);
      }
    });
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
    if (!gridEl) return;

    if (!rowsVal.length) {
      gridEl.innerHTML = "<div style='padding:12px; border:1px solid #b91c1c; border-radius:12px; color:#b91c1c; font-weight:800;'>No players found</div>";
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
    setTextById("statePill", "Loading...");
    setVisibleLoadingText("Loading...");

    try {
      const resVal = await fetch("/players.json", { cache: "no-store" });
      if (!resVal.ok) throw new Error("players.json HTTP " + resVal.status);

      const payloadVal = await resVal.json();
      const rowsVal = normalizeRows(payloadVal);

      setTextById("playersCount", rowsVal.length);
      setVisiblePlayersCount(rowsVal.length);

      setTextById("statePill", "Loaded");
      setVisibleLoadingText("Loaded");

      renderPlayers(rowsVal);
    } catch (eVal) {
      console.error(eVal);
      setTextById("statePill", "Load failed");
      setVisibleLoadingText("Load failed");

      const gridEl = byId("playersGrid");
      if (gridEl) {
        gridEl.innerHTML = "<div style='padding:12px; border:1px solid #b91c1c; border-radius:12px; color:#fecaca; background: rgba(185, 28, 28, 0.12); white-space:pre-wrap;'>" +
          esc(eVal && eVal.message ? eVal.message : String(eVal)) +
        "</div>";
      }
    }
  })();
});
