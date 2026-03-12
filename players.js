document.addEventListener("DOMContentLoaded", function () {
  const stateEl = document.getElementById("state");
  const countPillEl = document.getElementById("countPill");
  const lastGeneratedEl = document.getElementById("lastGenerated");
  const playersGridEl = document.getElementById("playersGrid");

  const qEl = document.getElementById("q");
  const minABEl = document.getElementById("minAB");
  const minPaPctEl = document.getElementById("minPaPct");
  const paPctLabelEl = document.getElementById("paPctLabel");
  const sortByEl = document.getElementById("sortBy");

  const exportBtn = document.getElementById("exportBtn");
  const clearPinsBtn = document.getElementById("clearPinsBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let allRows = [];
  let viewRows = [];
  let pinned = new Set();

  function setState(textVal, isErrorVal) {
    if (!stateEl) return;
    stateEl.textContent = textVal;
    stateEl.style.background = isErrorVal ? "#7f1d1d" : "#111827";
    stateEl.style.color = isErrorVal ? "#fee2e2" : "#e5e7eb";
    stateEl.style.border = isErrorVal ? "1px solid #fca5a5" : "1px solid #111827";
  }

  function renderErrorBox(msgVal) {
    return '<div class="error">Error: ' + String(msgVal) + "</div>";
  }

  function toNum(vVal) {
    const nVal = Number(vVal);
    return Number.isFinite(nVal) ? nVal : 0;
  }

  function pctStr(pVal) {
    const nVal = toNum(pVal);
    const pctVal = nVal * 100;
    return pctVal.toFixed(1).replace(/\.0$/, "") + "%";
  }

  function opsStr(vVal) {
    const nVal = toNum(vVal);
    return nVal.toFixed(3);
  }

  function normalizePayloadToRows(payloadVal) {
    if (!payloadVal) return [];
    if (Array.isArray(payloadVal)) return payloadVal;
    if (payloadVal.rows && Array.isArray(payloadVal.rows)) return payloadVal.rows;
    return [];
  }

  function getId(rowVal, idxVal) {
    if (rowVal && rowVal.id != null) return String(rowVal.id);
    if (rowVal && rowVal.player && rowVal.team) return String(rowVal.player) + " :: " + String(rowVal.team);
    return "row-" + String(idxVal);
  }

  function fetchJsonOrThrow(urlVal) {
    return fetch(urlVal, { cache: "no-store" }).then(function (resVal) {
      if (!resVal.ok) throw new Error("Request failed: " + urlVal + " (" + resVal.status + ")");
      return resVal.json();
    });
  }

  function renderCard(rowVal) {
    const idVal = rowVal.id;
    const isPinnedVal = pinned.has(idVal);

    const nameVal = rowVal.player || rowVal.name || "(no name)";
    const teamVal = rowVal.team || "-";

    const abVal = toNum(rowVal.ab);
    const paVal = toNum(rowVal.pa);

    const paPctVal = rowVal.pa_pct != null ? rowVal.pa_pct : null;
    const paPctDisplayVal = paPctVal == null ? "-" : pctStr(paPctVal);

    const opsVal = rowVal.ops != null ? opsStr(rowVal.ops) : "-";

    const btnClassVal = isPinnedVal ? "btn-pin pinned" : "btn-pin";
    const btnTextVal = isPinnedVal ? "Pinned" : "Pin";

    return (
      '<article class="card">' +
        '<div class="card-head">' +
          '<div>' +
            '<div class="card-name">' + String(nameVal) + "</div>" +
            '<div class="card-sub">' + String(teamVal) + "</div>" +
          "</div>" +
          '<button class="' + btnClassVal + '" data-action="pin" data-id="' + String(idVal) + '">' + btnTextVal + "</button>" +
        "</div>" +

        '<div class="card-body">' +
          '<div class="metric"><span class="label">AB</span><span class="value">' + String(abVal) + "</span></div>" +
          '<div class="metric"><span class="label">PA</span><span class="value">' + String(paVal) + "</span></div>" +
          '<div class="metric"><span class="label">PA %</span><span class="value">' + String(paPctDisplayVal) + "</span></div>" +
          '<div class="metric"><span class="label">OPS</span><span class="value">' + String(opsVal) + "</span></div>" +
        "</div>" +
      "</article>"
    );
  }

  function applyFilters() {
    const qVal = qEl ? qEl.value.trim().toLowerCase() : "";
    const minABVal = minABEl ? toNum(minABEl.value) : 0;
    const minPaPctVal = minPaPctEl ? toNum(minPaPctEl.value) : 0;
    const sortByVal = sortByEl ? sortByEl.value : "ops";

    if (paPctLabelEl) paPctLabelEl.textContent = String(minPaPctVal) + "%";

    viewRows = allRows.filter(function (rowVal) {
      if (toNum(rowVal.ab) < minABVal) return false;

      const paPctRawVal = rowVal.pa_pct != null ? toNum(rowVal.pa_pct) * 100 : 0;
      if (paPctRawVal < minPaPctVal) return false;

      if (qVal) {
        const hayVal = (String(rowVal.player || rowVal.name || "") + " " + String(rowVal.team || "")).toLowerCase();
        if (!hayVal.includes(qVal)) return false;
      }

      return true;
    });

    viewRows.sort(function (aVal, bVal) {
      if (sortByVal === "name") {
        return String(aVal.player || aVal.name || "").localeCompare(String(bVal.player || bVal.name || ""));
      }
      if (sortByVal === "ab") return toNum(bVal.ab) - toNum(aVal.ab);
      if (sortByVal === "pa") return toNum(bVal.pa) - toNum(aVal.pa);
      return toNum(bVal.ops) - toNum(aVal.ops);
    });
  }

  function renderGrid() {
    if (!playersGridEl) return;
    playersGridEl.innerHTML = viewRows.map(renderCard).join("");

    if (countPillEl) countPillEl.textContent = String(viewRows.length);
  }

  function wireEvents() {
    if (qEl) qEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (minABEl) minABEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (minPaPctEl) minPaPctEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (sortByEl) sortByEl.addEventListener("change", function () { applyFilters(); renderGrid(); });

    document.addEventListener("click", function (evtVal) {
      const tVal = evtVal.target;
      if (!tVal || !tVal.matches) return;
      if (!tVal.matches('button[data-action="pin"]')) return;

      const idVal = tVal.getAttribute("data-id");
      if (!idVal) return;

      if (pinned.has(idVal)) pinned.delete(idVal);
      else pinned.add(idVal);

      renderGrid();
    });

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        const colsVal = ["player", "team", "ab", "pa", "pa_pct", "ops"];
        const linesVal = [];
        linesVal.push(colsVal.join(","));

        viewRows.forEach(function (rowVal) {
          const valsVal = colsVal.map(function (cVal) {
            const rawVal = rowVal[cVal] == null ? "" : String(rowVal[cVal]);
            return '"' + rawVal.replace(/"/g, '""') + '"';
          });
          linesVal.push(valsVal.join(","));
        });

        const csvVal = linesVal.join("\n");
        const blobVal = new Blob([csvVal], { type: "text/csv;charset=utf-8" });
        const urlVal = URL.createObjectURL(blobVal);

        const aVal = document.createElement("a");
        aVal.href = urlVal;
        aVal.download = "players_filtered.csv";
        document.body.appendChild(aVal);
        aVal.click();
        aVal.remove();
        URL.revokeObjectURL(urlVal);
      });
    }

    if (clearPinsBtn) {
      clearPinsBtn.addEventListener("click", function () {
        pinned = new Set();
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

  (async function init() {
    try {
      setState("Loading", false);

      const payloadVal = await fetchJsonOrThrow("/players.json");
      const rowsVal = normalizePayloadToRows(payloadVal);

      allRows = rowsVal.map(function (rowVal, idxVal) {
        const copyVal = Object.assign({}, rowVal);
        copyVal.id = getId(rowVal, idxVal);
        return copyVal;
      });

      if (payloadVal && payloadVal.meta && payloadVal.meta.generated_at && lastGeneratedEl) {
        lastGeneratedEl.textContent = String(payloadVal.meta.generated_at);
      } else if (lastGeneratedEl) {
        lastGeneratedEl.textContent = "-";
      }

      wireEvents();
      applyFilters();
      renderGrid();

      setState("Loaded player cards", false);
    } catch (errVal) {
      if (playersGridEl) playersGridEl.innerHTML = renderErrorBox(errVal && errVal.message ? errVal.message : String(errVal));
      setState("Load failed", true);
    }
  })();
});
