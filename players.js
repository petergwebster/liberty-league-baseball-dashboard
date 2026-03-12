document.addEventListener("DOMContentLoaded", function () {
  function byId(idVal) {
    return document.getElementById(idVal);
  }

  function setText(idVal, textVal) {
    const elVal = byId(idVal);
    if (!elVal) return;
    elVal.textContent = String(textVal);
  }

  function setHtml(idVal, htmlVal) {
    const elVal = byId(idVal);
    if (!elVal) return;
    elVal.innerHTML = String(htmlVal);
  }

  async function fetchJsonOrThrow(urlVal) {
    const resVal = await fetch(urlVal, { cache: "no-store" });
    if (!resVal.ok) {
      const tVal = await resVal.text();
      throw new Error("Fetch failed " + resVal.status + " for " + urlVal + "\n" + tVal.slice(0, 300));
    }
    return await resVal.json();
  }

  function normalizePayloadToRows(payloadVal) {
    if (!payloadVal) return [];
    if (Array.isArray(payloadVal)) return payloadVal;
    if (Array.isArray(payloadVal.rows)) return payloadVal.rows;
    if (Array.isArray(payloadVal.players)) return payloadVal.players;
    return [];
  }

  function escapeHtml(textVal) {
    return String(textVal)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function toNum(val) {
    const nVal = Number(val);
    if (Number.isFinite(nVal)) return nVal;
    return null;
  }

  function renderCards(rowsVal) {
    const gridEl = byId("playersGrid");
    if (!gridEl) return;

    if (!rowsVal.length) {
      gridEl.innerHTML = "<div style='padding:12px;border:1px solid #ddd;border-radius:12px;'>No players found in JSON.</div>";
      return;
    }

    const cardsVal = rowsVal.slice(0, 200).map(function (rVal) {
      const nameVal = rVal.player || rVal.name || rVal.Player || "Unknown";
      const teamVal = rVal.team || rVal.Team || "";
      const abVal = toNum(rVal.ab != null ? rVal.ab : rVal.AB);
      const paVal = toNum(rVal.pa != null ? rVal.pa : rVal.PA);
      const opsVal = toNum(rVal.ops != null ? rVal.ops : rVal.OPS);

      const abTxt = abVal == null ? "" : "AB " + abVal;
      const paTxt = paVal == null ? "" : "PA " + paVal;
      const opsTxt = opsVal == null ? "" : "OPS " + opsVal.toFixed(3);

      return (
        "<div style='border:1px solid #111827;border-radius:16px;padding:12px;background:#020617;color:#e5e7eb;'>" +
          "<div style='font-weight:900;font-size:14px;'>" + escapeHtml(nameVal) + "</div>" +
          "<div style='opacity:0.8;margin-top:2px;'>" + escapeHtml(teamVal) + "</div>" +
          "<div style='margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;font-size:12px;opacity:0.9;'>" +
            "<span>" + escapeHtml(abTxt) + "</span>" +
            "<span>" + escapeHtml(paTxt) + "</span>" +
            "<span>" + escapeHtml(opsTxt) + "</span>" +
          "</div>" +
        "</div>"
      );
    });

    gridEl.innerHTML = cardsVal.join("");
  }

  (async function init() {
    try {
      setText("statePill", "Loading...");
      setText("status", "Loading...");

      const payloadVal = await fetchJsonOrThrow("/players.json");
      const rowsVal = normalizePayloadToRows(payloadVal);

      setText("statePill", "Loaded player cards");
      setText("status", "Loaded " + rowsVal.length + " players");

      if (payloadVal && payloadVal.meta && payloadVal.meta.generated_at) {
        setText("lastGenerated", payloadVal.meta.generated_at);
      }

      renderCards(rowsVal);
    } catch (errVal) {
      setText("statePill", "Load failed");
      setText("status", "Load failed");
      setHtml("playersGrid", "<div style='padding:12px;border:1px solid #b91c1c;border-radius:12px;color:#b91c1c;'>"
        + escapeHtml(errVal && errVal.message ? errVal.message : String(errVal))
        + "</div>");
      console.error(errVal);
    }
  })();
});
