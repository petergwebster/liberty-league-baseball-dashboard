document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");

  const qEl = document.getElementById("q");
  const minABEl = document.getElementById("minAB");
  const minPaPctEl = document.getElementById("minPaPct");
  const pctPaLabelEl = document.getElementById("paPctLabel");
  const sortByEl = document.getElementById("sortBy");

  const countPillEl = document.getElementById("countPill");
  const playersGridEl = document.getElementById("playersGrid");
  const detailEl = document.getElementById("detail");
  const pinnedRowEl = document.getElementById("pinnedRow");

  const exportBtn = document.getElementById("exportBtn");
  const clearPinsBtn = document.getElementById("clearPinsBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let allRows = [];
  let viewRows = [];
  let selectedId = null;
  let pinned = new Set();

  function setState(textVal, isError) {
    if (!stateEl) return;
    stateEl.textContent = textVal;
    stateEl.style.background = isError ? "#fff3f3" : "#f2f2f2";
    stateEl.style.border = isError ? "1px solid #ffcccc" : "1px solid transparent";
  }

  function escHtml(sVal) {
    return String(sVal == null ? "" : sVal)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function numVal(xVal) {
    const vVal = Number(xVal);
    return Number.isFinite(vVal) ? vVal : null;
  }

  function renderErrorBox(msgVal) {
    return '<div class="error"><strong>Load failed</strong><div style="margin-top:6px;">' + escHtml(msgVal) + "</div></div>";
  }

  async function fetchJsonOrThrow(urlVal) {
    const respVal = await fetch(urlVal, { cache: "no-store" });
    if (!respVal.ok) {
      throw new Error("HTTP " + respVal.status + " for " + urlVal);
    }
    return await respVal.json();
  }

  function normalizePayloadToRows(payloadVal) {
    if (Array.isArray(payloadVal)) return payloadVal;
    if (payloadVal && Array.isArray(payloadVal.rows)) return payloadVal.rows;
    return [];
  }

  function getRowId(rowVal, idxVal) {
    if (rowVal && rowVal.id != null) return String(rowVal.id);
    if (rowVal && rowVal.player != null && rowVal.team != null) return String(rowVal.player) + "@" + String(rowVal.team);
    return "row-" + String(idxVal);
  }

  function getSearchText(rowVal) {
    const partsVal = [];
    if (rowVal.player != null) partsVal.push(String(rowVal.player));
    if (rowVal.team != null) partsVal.push(String(rowVal.team));
    if (rowVal.pos != null) partsVal.push(String(rowVal.pos));
    if (rowVal.position != null) partsVal.push(String(rowVal.position));
    return partsVal.join(" ").toLowerCase();
  }

  function sortRows(rowsVal) {
    const sortKeyVal = sortByEl ? sortByEl.value : "ops";
    const rowsCopyVal = rowsVal.slice();

    rowsCopyVal.sort(function (aVal, bVal) {
      const aNumVal = numVal(aVal[sortKeyVal]);
      const bNumVal = numVal(bVal[sortKeyVal]);

      if (aNumVal == null && bNumVal == null) return 0;
      if (aNumVal == null) return 1;
      if (bNumVal == null) return -1;

      return bNumVal - aNumVal;
    });

    return rowsCopyVal;
  }

  function applyFilters() {
    const qVal = qEl ? qEl.value.trim().toLowerCase() : "";
    const minABVal = minABEl ? Number(minABEl.value || 0) : 0;
    const minPaPctVal = minPaPctEl ? Number(minPaPctEl.value || 0) : 0;

    if (pctPaLabelEl) pctPaLabelEl.textContent = String(minPaPctVal) + "%";

    const filteredVal = allRows.filter(function (rowVal) {
      const abVal = numVal(rowVal.ab);
      const paVal = numVal(rowVal.pa);

      const okABVal = abVal == null ? true : abVal >= minABVal;

      let okPaPctVal = true;
      if (paVal != null) {
        const paPctVal = paVal;
        okPaPctVal = paPctVal >= minPaPctVal;
      }

      const okSearchVal = qVal.length === 0 ? true : getSearchText(rowVal).includes(qVal);

      return okABVal && okPaPctVal && okSearchVal;
    });

    viewRows = sortRows(filteredVal);

    if (countPillEl) countPillEl.textContent = String(viewRows.length);
  }

  function renderCard(rowVal, rowIdVal) {
    const playerVal = rowVal.player != null ? rowVal.player : "(unknown)";
    const teamVal = rowVal.team != null ? rowVal.team : "";
    const abVal = rowVal.ab != null ? rowVal.ab : "";
    const paVal = rowVal.pa != null ? rowVal.pa : "";
    const opsVal = rowVal.ops != null ? rowVal.ops : "";

    const isPinnedVal = pinned.has(rowIdVal);

    return (
      '<div class="card" data-rowid="' + escHtml(rowIdVal) + '">' +
        '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">' +
          '<div>' +
            '<div style="font-weight:800;font-size:15px;">' + escHtml(playerVal) + "</div>" +
            '<div class="muted">' + escHtml(teamVal) + "</div>" +
          "</div>" +
          '<button type="button" class="pinBtn" data-rowid="' + escHtml(rowIdVal) + '">' +
            (isPinnedVal ? "Unpin" : "Pin") +
          "</button>" +
        "</div>" +
        '<div style="margin-top:10px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">' +
          '<div><div class="muted">AB</div><div style="font-weight:800;">' + escHtml(abVal) + "</div></div>" +
          '<div><div class="muted">PA</div><div style="font-weight:800;">' + escHtml(paVal) + "</div></div>" +
          '<div><div class="muted">OPS</div><div style="font-weight:800;">' + escHtml(opsVal) + "</div></div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderGrid() {
    if (!playersGridEl) return;
    if (viewRows.length === 0) {
      playersGridEl.innerHTML = '<div class="muted">No players match your filters.</div>';
      return;
    }

    let htmlVal = "";
    for (let iVal = 0; iVal < viewRows.length; iVal++) {
      const rowVal = viewRows[iVal];
      const idVal = getRowId(rowVal, iVal);
      htmlVal += renderCard(rowVal, idVal);
    }
    playersGridEl.innerHTML = htmlVal;

    const btnEls = playersGridEl.querySelectorAll(".pinBtn");
    btnEls.forEach(function (btnVal) {
      btnVal.addEventListener("click", function () {
        const idVal = btnVal.getAttribute("data-rowid");
        if (!idVal) return;
        if (pinned.has(idVal)) pinned.delete(idVal);
        else pinned.add(idVal);
        renderPinnedRow();
        renderGrid();
      });
    });
  }

  function renderPinnedRow() {
    if (!pinnedRowEl) return;
    if (pinned.size === 0) {
      pinnedRowEl.innerHTML = "";
      return;
    }
    pinnedRowEl.innerHTML = '<div class="muted">Pinned: ' + escHtml(Array.from(pinned).join(", ")) + "</div>";
  }

  function wireEvents() {
    if (qEl) qEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (minABEl) minABEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (minPaPctEl) minPaPctEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (sortByEl) sortByEl.addEventListener("change", function () { applyFilters(); renderGrid(); });

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        const blobVal = new Blob([JSON.stringify(viewRows, null, 2)], { type: "application/json" });
        const urlVal = URL.createObjectURL(blobVal);
        const aVal = document.createElement("a");
        aVal.href = urlVal;
        aVal.download = "players_filtered.json";
        document.body.appendChild(aVal);
        aVal.click();
        aVal.remove();
        URL.revokeObjectURL(urlVal);
      });
    }

    if (clearPinsBtn) {
      clearPinsBtn.addEventListener("click", function () {
        pinned = new Set();
        renderPinnedRow();
        renderGrid();
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", function () {
        if (qEl) qEl.value = "";
        if (minABEl) minABEl.value = "0";
        if (minPaPctEl) minPaPctEl.value = "0";
        if (sortByEl) sortByEl.value = "ops";
        applyFilters();
        renderGrid();
        setState("Loaded player cards", false);
      });
    }
  }

  try {
    setState("Loading", false);

    const payloadVal = await fetchJsonOrThrow("/players.json");
    const rowsVal = normalizePayloadToRows(payloadVal);

    allRows = rowsVal.map(function (rowVal, idxVal) {
      const idVal = getRowId(rowVal, idxVal);
      const mergedVal = Object.assign({}, rowVal);
      mergedVal.id = idVal;
      return mergedVal;
    });

    if (payloadVal && payloadVal.meta && payloadVal.meta.generated_at && lastGenEl) {
      lastGenEl.textContent = String(payloadVal.meta.generated_at);
    } else if (lastGenEl) {
      lastGenEl.textContent = "-";
    }

    wireEvents();
    applyFilters();
    renderPinnedRow();
    renderGrid();

    setState("Loaded player cards", false);
  } catch (errVal) {
    if (playersGridEl) playersGridEl.innerHTML = renderErrorBox(String(errVal && errVal.message ? errVal.message : errVal));
    setState("Load failed", true);
    if (detailEl) detailEl.innerHTML = "";
  }
});
