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

  function setState(txt, isBad) {
    if (!stateEl) return;
    stateEl.textContent = txt;
    stateEl.className = "pill " + (isBad ? "pillBad" : "");
  }

  function setLastGenerated(txt) {
    if (!lastGenEl) return;
    lastGenEl.textContent = txt;
  }

  function pillCount(n) {
    if (!countPillEl) return;
    countPillEl.textContent = "Players " + String(n);
  }

  function safeStr(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  function safeNum(v) {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    return null;
  }

  function fmt3(v) {
    const n = safeNum(v);
    if (n === null) return "—";
    return n.toFixed(3);
  }

  function escHtml(s) {
    const txt = safeStr(s);
    return txt
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function asPct01(v) {
    const n = safeNum(v);
    if (n === null) return null;
    if (n <= 1) return n;
    if (n <= 100) return n / 100.0;
    return null;
  }

  function pickId(r, idx) {
    const rid = safeStr(r && r.id);
    if (rid.trim() !== "") return rid;
    const nm = safeStr((r && (r.player || r.name)) || "Unknown");
    const tm = safeStr((r && r.team) || "");
    return nm + "|" + tm + "|" + String(idx);
  }

  async function fetchJsonOrThrow(urlPath) {
    const resp = await fetch(urlPath, { cache: "no-store" });
    const ct = resp.headers.get("content-type") || "";
    const txt = await resp.text();

    if (!resp.ok) {
      throw new Error(
        "Fetch failed " + urlPath + " HTTP " + String(resp.status) + " CT " + ct + " Head " + txt.slice(0, 140)
      );
    }

    const trimmed = txt.trim();
    try {
      return JSON.parse(trimmed);
    } catch (e) {
      throw new Error("Invalid JSON at " + urlPath + " Head " + trimmed.slice(0, 140));
    }
  }

  function normalizeRow(r, idx) {
    const out = Object.assign({}, r || {});
    out._id = pickId(r, idx);

    out._name = safeStr((r && (r.player || r.name)) || "Unknown");
    out._team = safeStr((r && (r.team || r.tm || r.Tm)) || "");

    out._ab = safeNum(r && (r.ab !== undefined ? r.ab : r.AB));
    out._pa = safeNum(r && (r.pa !== undefined ? r.pa : r.PA));

    out._avg = safeNum(r && (r.avg !== undefined ? r.avg : r.AVG));
    out._obp = safeNum(r && (r.obp !== undefined ? r.obp : r.OBP));
    out._slg = safeNum(r && (r.slg !== undefined ? r.slg : r.SLG));
    out._ops = safeNum(r && (r.ops !== undefined ? r.ops : r.OPS));

    out._paPct = null;
    if (r && (r.pa_pct !== undefined || r.paPct !== undefined || r.PA_PCT !== undefined)) {
      out._paPct = asPct01(r.pa_pct !== undefined ? r.pa_pct : (r.paPct !== undefined ? r.paPct : r.PA_PCT));
    }

    return out;
  }

  function normalizeRows(rows) {
    const out = [];
    for (let i = 0; i < rows.length; i++) out.push(normalizeRow(rows[i], i));
    return out;
  }

  function computePaPercentiles(rows) {
    const paVals = rows
      .map(function (r) {
        return r._pa;
      })
      .filter(function (v) {
        return v !== null && Number.isFinite(v);
      })
      .slice()
      .sort(function (a, b) {
        return a - b;
      });

    if (paVals.length === 0) return;

    function pctRank(v) {
      let lo = 0;
      let hi = paVals.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (paVals[mid] <= v) lo = mid + 1;
        else hi = mid;
      }
      return lo / paVals.length;
    }

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r._paPct === null && r._pa !== null) r._paPct = pctRank(r._pa);
    }
  }

  function cardHtml(r) {
    const isSelected = selectedId && r._id === selectedId;
    const isPinned = pinned.has(r._id);
    const cls = "playerCard" + (isSelected ? " selected" : "");

    const abTxt = r._ab === null ? "—" : String(r._ab);
    const paTxt = r._pa === null ? "—" : String(r._pa);
    const paPctTxt = r._paPct === null ? "—" : String(Math.round(r._paPct * 100)) + "%";

    return (
      '<div class="' + cls + '" data-id="' + escHtml(r._id) + '">' +
      '<div class="cardTop">' +
      '<div class="cardName">' + escHtml(r._name) + "</div>" +
      '<div class="cardTeam">' + escHtml(r._team) + "</div>" +
      '<button class="pinBtn" data-id="' + escHtml(r._id) + '">' + (isPinned ? "Unpin" : "Pin") + "</button>" +
      "</div>" +
      '<div class="cardStats">' +
      '<div class="stat"><div class="k">OPS</div><div class="v">' + escHtml(fmt3(r._ops)) + "</div></div>" +
      '<div class="stat"><div class="k">AVG</div><div class="v">' + escHtml(fmt3(r._avg)) + "</div></div>" +
      '<div class="stat"><div class="k">OBP</div><div class="v">' + escHtml(fmt3(r._obp)) + "</div></div>" +
      '<div class="stat"><div class="k">SLG</div><div class="v">' + escHtml(fmt3(r._slg)) + "</div></div>" +
      '<div class="stat"><div class="k">AB</div><div class="v">' + escHtml(abTxt) + "</div></div>" +
      '<div class="stat"><div class="k">PA</div><div class="v">' + escHtml(paTxt) + "</div></div>" +
      '<div class="stat"><div class="k">PA %tile</div><div class="v">' + escHtml(paPctTxt) + "</div></div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderGrid(rows) {
    if (!playersGridEl) return;
    if (!rows || rows.length === 0) {
      playersGridEl.innerHTML = '<div class="empty">No players match the filters.</div>';
      return;
    }
    playersGridEl.innerHTML = rows.map(cardHtml).join("");
  }

  function pinnedHtml(r) {
    return (
      '<div class="pinItem">' +
      '<div class="pinMain">' +
      '<div class="pinName">' + escHtml(r._name) + "</div>" +
      '<div class="pinTeam">' + escHtml(r._team) + "</div>" +
      "</div>" +
      '<div class="pinMeta">' +
      '<div class="pinOps">OPS ' + escHtml(fmt3(r._ops)) + "</div>" +
      '<button class="pinRemove" data-id="' + escHtml(r._id) + '">Remove</button>' +
      "</div>" +
      "</div>"
    );
  }

  function renderPinned() {
    if (!pinnedRowEl) return;
    const pins = allRows.filter(function (r) {
      return pinned.has(r._id);
    });
    if (pins.length === 0) {
      pinnedRowEl.innerHTML = '<div class="emptyPins">Pinned players will show up here.</div>';
      return;
    }
    pinnedRowEl.innerHTML = pins.map(pinnedHtml).join("");
  }

  function detailHtml(r) {
    if (!r) return '<div class="detailEmpty">Click a player card to see details.</div>';

    const paPctTxt = r._paPct === null ? "—" : String(Math.round(r._paPct * 100)) + "%";

    return (
      '<div class="detailCard">' +
      '<div class="detailHeader">' +
      '<div class="detailName">' + escHtml(r._name) + "</div>" +
      '<div class="detailTeam">' + escHtml(r._team) + "</div>" +
      "</div>" +
      '<div class="detailGrid">' +
      '<div class="drow"><div class="k">AB</div><div class="v">' + escHtml(r._ab === null ? "—" : String(r._ab)) + "</div></div>" +
      '<div class="drow"><div class="k">PA</div><div class="v">' + escHtml(r._pa === null ? "—" : String(r._pa)) + "</div></div>" +
      '<div class="drow"><div class="k">PA %tile</div><div class="v">' + escHtml(paPctTxt) + "</div></div>" +
      '<div class="drow"><div class="k">AVG</div><div class="v">' + escHtml(fmt3(r._avg)) + "</div></div>" +
      '<div class="drow"><div class="k">OBP</div><div class="v">' + escHtml(fmt3(r._obp)) + "</div></div>" +
      '<div class="drow"><div class="k">SLG</div><div class="v">' + escHtml(fmt3(r._slg)) + "</div></div>" +
      '<div class="drow"><div class="k">OPS</div><div class="v">' + escHtml(fmt3(r._ops)) + "</div></div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderDetail() {
    if (!detailEl) return;
    const r = allRows.find(function (x) {
      return x._id === selectedId;
    });
    detailEl.innerHTML = detailHtml(r || null);
  }

  function readFilters() {
    const q = qEl ? qEl.value.trim().toLowerCase() : "";
    const minAB = minABEl ? safeNum(minABEl.value) : 0;
    const minPaPct = minPaPctEl ? safeNum(minPaPctEl.value) : 0;
    const sortBy = sortByEl ? sortByEl.value : "ops";

    const minABVal = minAB === null ? 0 : minAB;
    const minPaPctVal = minPaPct === null ? 0 : minPaPct / 100.0;

    if (pctPaLabelEl) pctPaLabelEl.textContent = String(Math.round(minPaPctVal * 100)) + "%";

    return { q: q, minAB: minABVal, minPaPct: minPaPctVal, sortBy: sortBy };
  }
    function applyFiltersAndSort() {
    const f = readFilters();

    viewRows = allRows.filter(function (r) {
      if (f.q) {
        const hay = (r._name + " " + r._team).toLowerCase();
        if (!hay.includes(f.q)) return false;
      }
      if (r._ab !== null && r._ab < f.minAB) return false;
      if (r._ab === null && f.minAB > 0) return false;

      if (f.minPaPct > 0) {
        if (r._paPct === null) return false;
        if (r._paPct < f.minPaPct) return false;
      }

      return true;
    });

    function cmpNum(a, b) {
      const av = a === null ? -Infinity : a;
      const bv = b === null ? -Infinity : b;
      return bv - av;
    }

    viewRows.sort(function (a, b) {
      if (sortByEl && sortByEl.value === "avg") return cmpNum(a._avg, b._avg);
      const sortBy = f.sortBy;
      if (sortBy === "avg") return cmpNum(a._avg, b._avg);
      if (sortBy === "obp") return cmpNum(a._obp, b._obp);
      if (sortBy === "slg") return cmpNum(a._slg, b._slg);
      if (sortBy === "ab") return cmpNum(a._ab, b._ab);
      if (sortBy === "pa") return cmpNum(a._pa, b._pa);
      if (sortBy === "paPct") return cmpNum(a._paPct, b._paPct);
      return cmpNum(a._ops, b._ops);
    });

    pillCount(viewRows.length);
    renderGrid(viewRows);
    renderPinned();
    renderDetail();
  }

  function onGridClick(ev) {
    const t = ev.target;
    if (!t) return;

    const pinBtn = t.closest ? t.closest(".pinBtn") : null;
    if (pinBtn) {
      const pid = pinBtn.getAttribute("data-id") || "";
      if (pid) {
        if (pinned.has(pid)) pinned.delete(pid);
        else pinned.add(pid);
        applyFiltersAndSort();
      }
      ev.preventDefault();
      return;
    }

    const card = t.closest ? t.closest(".playerCard") : null;
    if (!card) return;
    const pid = card.getAttribute("data-id") || "";
    if (!pid) return;

    selectedId = pid;
    applyFiltersAndSort();
  }

  function onPinnedClick(ev) {
    const t = ev.target;
    if (!t) return;
    const rm = t.closest ? t.closest(".pinRemove") : null;
    if (!rm) return;
    const pid = rm.getAttribute("data-id") || "";
    if (pid) {
      pinned.delete(pid);
      applyFiltersAndSort();
    }
  }

  function exportCsv() {
    const cols = ["player", "team", "ab", "pa", "pa_percentile", "avg", "obp", "slg", "ops"];

    function csvCell(v) {
      const s = safeStr(v);
      if (s.includes(",") || s.includes("\n") || s.includes('"')) {
        return '"' + s.replaceAll('"', '""') + '"';
      }
      return s;
    }

    const lines = [];
    lines.push(cols.join(","));

    const pinnedRows = allRows.filter(function (r) {
      return pinned.has(r._id);
    });

    const exportRows = pinnedRows.length > 0 ? pinnedRows : viewRows;

    for (let i = 0; i < exportRows.length; i++) {
      const r = exportRows[i];
      const row = [
        r._name,
        r._team,
        r._ab === null ? "" : String(r._ab),
        r._pa === null ? "" : String(r._pa),
        r._paPct === null ? "" : String(Math.round(r._paPct * 100)),
        r._avg === null ? "" : String(r._avg),
        r._obp === null ? "" : String(r._obp),
        r._slg === null ? "" : String(r._slg),
        r._ops === null ? "" : String(r._ops)
      ];
      lines.push(row.map(csvCell).join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "players_export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  function wireEvents() {
    if (qEl) qEl.addEventListener("input", applyFiltersAndSort);
    if (minABEl) minABEl.addEventListener("input", applyFiltersAndSort);
    if (minPaPctEl) minPaPctEl.addEventListener("input", applyFiltersAndSort);
    if (sortByEl) sortByEl.addEventListener("change", applyFiltersAndSort);

    if (playersGridEl) playersGridEl.addEventListener("click", onGridClick);
    if (pinnedRowEl) pinnedRowEl.addEventListener("click", onPinnedClick);

    if (exportBtn) exportBtn.addEventListener("click", exportCsv);

    if (clearPinsBtn)
      clearPinsBtn.addEventListener("click", function () {
        pinned = new Set();
        applyFiltersAndSort();
      });

    if (clearAllBtn)
      clearAllBtn.addEventListener("click", function () {
        if (qEl) qEl.value = "";
        if (minABEl) minABEl.value = "0";
        if (minPaPctEl) minPaPctEl.value = "0";
        if (sortByEl) sortByEl.value = "ops";
        selectedId = null;
        applyFiltersAndSort();
      });
  }

  function renderErrorBox(msg) {
    return (
      '<div style="border:1px solid #fecaca; background:#fff1f2; padding:12px; border-radius:12px;">' +
      '<div style="font-weight:700; margin-bottom:6px;">Could not load players data</div>' +
      '<div style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px; color:#991b1b;">' +
      escHtml(msg) +
      "</div>" +
      "</div>"
    );
  }
    async function init() {
    setState("Loading…", false);

    let payload = null;
    try {
      payload = await fetchJsonOrThrow("players.json");
    } catch (e1) {
      try {
        payload = await fetchJsonOrThrow("./players.json");
      } catch (e2) {
        if (playersGridEl) playersGridEl.innerHTML = renderErrorBox(String(e2 && e2.message ? e2.message : e2));
        setState("Load failed", true);
        return;
      }
    }

    let rows = payload;
    let meta = null;

    if (payload && typeof payload === "object" && Array.isArray(payload.rows)) {
      rows = payload.rows;
      meta = payload.meta || null;
    }

    if (!Array.isArray(rows)) {
      if (playersGridEl) playersGridEl.innerHTML = renderErrorBox("players.json must be an array, or an object with a rows array.");
      setState("Bad data", true);
      return;
    }

    allRows = normalizeRows(rows);
    computePaPercentiles(allRows);

    if (meta && meta.generated_at) setLastGenerated(String(meta.generated_at));
    else setLastGenerated("");

    wireEvents();
    applyFiltersAndSort();

    setState("Ready", false);
  }

  try {
    await init();
  } catch (err) {
    if (playersGridEl) playersGridEl.innerHTML = renderErrorBox(String(err && err.message ? err.message : err));
    setState("Error", true);
  }
});
