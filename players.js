document.addEventListener("DOMContentLoaded", function () {
  const DATA_URL = "/data/live_player_stats.json";

  function $(idVal) {
    return document.getElementById(idVal);
  }

  function setState(textVal, badVal) {
    const stateEl = $("state");
    if (!stateEl) return;
    stateEl.textContent = String(textVal);
    stateEl.classList.toggle("pillBad", Boolean(badVal));
  }

  function setCount(countVal) {
    const pillEl = $("countPill");
    if (!pillEl) return;
    pillEl.textContent = "Players " + String(countVal);
  }

  function esc(textVal) {
    return String(textVal == null ? "" : textVal)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function normalizeRows(payloadVal) {
    if (!payloadVal) return [];
    if (Array.isArray(payloadVal)) return payloadVal;
    if (Array.isArray(payloadVal.rows)) return payloadVal.rows;
    if (Array.isArray(payloadVal.players)) return payloadVal.players;
    if (Array.isArray(payloadVal.data)) return payloadVal.data;
    return [];
  }

  function renderRows(rowsVal) {
    const gridEl = $("playersGrid");
    if (!gridEl) return;

    if (!rowsVal.length) {
      gridEl.innerHTML = "<div class='panel'>No players found.</div>";
      return;
    }

    gridEl.innerHTML = rowsVal
      .map(function (pVal) {
        const nameVal = pVal.player || pVal.name || pVal.player_name || "Unknown";
        const teamVal = pVal.team || pVal.school || pVal.college || "";

        const abVal = pVal.ab ?? pVal.AB ?? "";
        const paVal = pVal.pa ?? pVal.PA ?? "";
        const opsVal = pVal.ops ?? pVal.OPS ?? "";

        return (
          "<div class='card'>" +
          "<div style='font-weight:900; font-size:16px; margin-bottom:4px;'>" + esc(nameVal) + "</div>" +
          "<div style='color:#6b7280; font-weight:800; margin-bottom:10px;'>" + esc(teamVal) + "</div>" +
          "<div style='display:flex; gap:10px; flex-wrap:wrap; font-size:13px; color:#374151;'>" +
          "<span>AB " + esc(abVal) + "</span>" +
          "<span>PA " + esc(paVal) + "</span>" +
          "<span>OPS " + esc(opsVal) + "</span>" +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  (async function init() {
    setState("Loading...", false);

    try {
      const resVal = await fetch(DATA_URL, { cache: "no-store" });
      if (!resVal.ok) throw new Error("HTTP " + resVal.status + " for " + DATA_URL);

      const payloadVal = await resVal.json();
      const rowsVal = normalizeRows(payloadVal);

      setCount(rowsVal.length);
      setState("Loaded", false);
      renderRows(rowsVal);
    } catch (errVal) {
      console.error(errVal);
      setState("Load failed", true);

      const gridEl = $("playersGrid");
      if (gridEl) {
        gridEl.innerHTML =
          "<div class='panel' style='border-color:#fecaca; background:#fff1f2; color:#991b1b; white-space:pre-wrap;'>" +
          esc(errVal && errVal.message ? errVal.message : String(errVal)) +
          "</div>";
      }
    }
  })();
});
