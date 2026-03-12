console.log("PLAYERS.JS LOADED", new Date().toISOString());
alert("players.js loaded");

fetch("/players.json", { cache: "no-store" })
  .then(function (rVal) { console.log("players.json status", rVal.status); return rVal.text(); })
  .then(function (tVal) { console.log("players.json first 200 chars", tVal.slice(0, 200)); })
  .catch(function (eVal) { console.error("players.json fetch error", eVal); });

document.addEventListener("DOMContentLoaded", function () {
  function q(idVal) {
    return document.getElementById(idVal);
  }

  function safeText(idVal, textVal) {
    const elVal = q(idVal);
    if (!elVal) return;
    elVal.textContent = String(textVal);
  }

  function safeHtml(idVal, htmlVal) {
    const elVal = q(idVal);
    if (!elVal) return;
    elVal.innerHTML = String(htmlVal);
  }

  async function fetchJson(urlVal) {
    const resVal = await fetch(urlVal, { cache: "no-store" });
    const textVal = await resVal.text();

    if (!resVal.ok) {
      throw new Error("HTTP " + resVal.status + " for " + urlVal + "\n" + textVal.slice(0, 400));
    }

    try {
      return JSON.parse(textVal);
    } catch (eVal) {
      throw new Error("Response was not valid JSON for " + urlVal + "\n" + textVal.slice(0, 400));
    }
  }

  function normalizeRows(payloadVal) {
    if (!payloadVal) return [];
    if (Array.isArray(payloadVal)) return payloadVal;
    if (Array.isArray(payloadVal.rows)) return payloadVal.rows;
    if (Array.isArray(payloadVal.players)) return payloadVal.players;
    return [];
  }

  function esc(textVal) {
    return String(textVal)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function render(rowsVal) {
    const gridEl = q("playersGrid");
    if (!gridEl) return;

    if (!rowsVal.length) {
      gridEl.innerHTML = "<div style='padding:12px;border:1px solid #444;border-radius:12px;'>No rows in players.json</div>";
      return;
    }

    gridEl.innerHTML = rowsVal.slice(0, 100).map(function (rVal) {
      const nameVal = rVal.player || rVal.name || rVal.Player || "Unknown";
      const teamVal = rVal.team || rVal.Team || "";
      return (
        "<div style='border:1px solid #111827;border-radius:16px;padding:12px;background:#020617;color:#e5e7eb;'>" +
          "<div style='font-weight:900;'>" + esc(nameVal) + "</div>" +
          "<div style='opacity:0.8;'>" + esc(teamVal) + "</div>" +
        "</div>"
      );
    }).join("");
  }

  (async function init() {
    try {
      safeText("statePill", "Loading...");
      safeText("status", "Loading...");

      const payloadVal = await fetchJson("/players.json");
      const rowsVal = normalizeRows(payloadVal);

      safeText("statePill", "Loaded player cards");
      safeText("status", "Loaded " + rowsVal.length + " players");

      if (payloadVal && payloadVal.meta && payloadVal.meta.generated_at) {
        safeText("lastGenerated", payloadVal.meta.generated_at);
      }

      render(rowsVal);
    } catch (errVal) {
      console.error(errVal);
      safeText("statePill", "Load failed");
      safeHtml(
        "playersGrid",
        "<div style='padding:12px;border:1px solid #b91c1c;border-radius:12px;color:#b91c1c;white-space:pre-wrap;'>" +
          esc(errVal && errVal.message ? errVal.message : String(errVal)) +
        "</div>"
      );
    }
  })();
});
