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

  function esc(textVal) {
    return String(textVal)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderPlayers(rowsVal) {
    const gridEl = byId("playersGrid");
    if (!gridEl) {
      console.log("Missing #playersGrid in HTML");
      return;
    }

    if (!rowsVal || !rowsVal.length) {
      gridEl.innerHTML = "<div style='padding:12px; border:1px solid #b91c1c; border-radius:12px; color:#b91c1c; font-weight:700;'>No players found</div>";
      return;
    }

    gridEl.innerHTML = rowsVal.map(function (pVal) {
      const nameVal = pVal.player || pVal.name || "Unknown";
      const teamVal = pVal.team || "";
      const abVal = pVal.ab != null ? String(pVal.ab) : "";
      const paVal = pVal.pa != null ? String(pVal.pa) : "";
      const opsVal = pVal.ops != null ? String(pVal.ops) : "";

      return (
        "<div style='padding:12px; border:1px solid #e5e7eb; border-radius:14px; margin-bottom:10px; background:#ffffff;'>" +
          "<div style='font-weight:900; font-size:16px;'>" + esc(nameVal) + "</div>" +
          "<div style='opacity:0.7; font-weight:700; margin:4px 0 10px 0;'>" + esc(teamVal) + "</div>" +
          "<div style='display:flex; gap:12px; flex-wrap:wrap; font-size:13px;'>" +
            "<div>AB " + esc(abVal) + "</div>" +
            "<div>PA " + esc(paVal) + "</div>" +
            "<div>OPS " + esc(opsVal) + "</div>" +
          "</div>" +
        "</div>"
      );
    }).join("");
  }

  (async function init() {
    console.log("players.js running");

    setText("statePill", "Loading...");

    try {
      const resVal = await fetch("/players.json", { cache: "no-store" });
      console.log("players.json status", resVal.status);

      if (!resVal.ok) throw new Error("players.json HTTP " + resVal.status);

      const payloadVal = await resVal.json();
      const rowsVal = Array.isArray(payloadVal) ? payloadVal : (payloadVal.rows || payloadVal.players || []);

      setText("playersCount", rowsVal.length);
      setText("statePill", "Loaded");

      renderPlayers(rowsVal);
    } catch (eVal) {
      console.error(eVal);
      setText("statePill", "Load failed");
      setHtml(
        "playersGrid",
        "<div style='padding:12px; border:1px solid #b91c1c; border-radius:12px; color:#b91c1c; font-weight:700; white-space:pre-wrap;'>" +
          esc(eVal && eVal.message ? eVal.message : String(eVal)) +
        "</div>"
      );
    }
  })();
});
