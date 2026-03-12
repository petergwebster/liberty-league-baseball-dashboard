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
    if (trimmed.startsWith("<")) {
      throw new Error("Expected JSON but got HTML from " + urlPath + " Head " + trimmed.slice(0, 140));
    }

    return JSON.parse(trimmed);
  }

  function normalizeRow(r, idx) {
    const out = Object.assign({}, r || {});
    out._id = pickId(r, idx);
    out._name = safeStr((r && (r.player || r.name)) || "Unknown").trim();
    out._team = safeStr((r && r.team) || "").trim();

    out._ab = safeNum(r && (r.ab !== undefined ? r.ab : r.AB));
    out._h = safeNum(r && (r.h !== undefined ? r.h : r.H));
    out._hr = safeNum(r && (r.hr !== undefined ? r.hr : r.HR));
    out._rbi = safeNum(r && (r.rbi !== undefined ? r.rbi : r.RBI));
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
      '<div class="cardName">' + escHtml(r._name) + '</div>' +
      '<div class="cardTeam">' + escHtml(r._team) + '</div>' +
      '<button class="pinBtn" data-id="' + escHtml(r._id) + '">' + (isPinned ? "Unpin" : "Pin") + '</button>' +
      '</div>' +
      '<div class="cardStats">' +
      '<div class="stat"><div class="k">OPS</div><div class="v">' + escHtml(fmt3(r._ops)) + '</div></div>' +
      '<div class="stat"><div class="k">AVG</div><div class="v">' + escHtml(fmt3(r._avg)) + '</div></div>' +
      '<div class="stat"><div class="k">OBP</div><div class="v">' + escHtml(fmt3(r._obp)) + '</div></div>' +
      '<div class="stat"><div class="k">SLG</div><div class="v">' + escHtml(fmt3(r._slg)) + '</div></div>' +
      '<div class="stat"><div class="k">AB</div><div class="v">' + escHtml(abTxt) + '</div></div>' +
      '<div class="stat"><div class="k">PA</div><div class="v">' + escHtml(paTxt) + '</div></div>' +
      '<div class="stat"><div class="k">PA %tile</div><div class="v">' + escHtml(paPctTxt) + '</div></div>' +
      '</div>' +
      '</div>'
    );
  }

  function renderPinnedRow() {
    if (!pinnedRowEl) return;
    const pinnedIds = Array.from(pinned.values());

    if (pinnedIds.length === 0) {
      pinnedRowEl.innerHTML = "";
      pinnedRowEl.style.display = "none";
      return;
    }

    const pinnedRows = allRows.filter(function (r) {
      return pinned.has(r._id);
    });

    const html = pinnedRows
      .map(function (r) {
        return '<div class="pinnedCardWrap">' + cardHtml(r) + "</div>";
      })
      .join("");

    pinnedRowEl.style.display = "block";
    pinnedRowEl.innerHTML = '<div class="pinnedTitle">Pinned</div><div class="pinnedGrid">' + html + "</div>";
  }

  function renderDetailById(id) {
    if (!detailEl) return;

    if (!id) {
      detailEl.innerHTML =
        '<div class="detailEmpty">Pick a player to see details.<br><span class="muted">Tip: click the card. Use Pin to keep a few players at the top for comparisons.</span></div>';
      return;
    }

    const r = allRows.find(function (x) {
      return x._id === id;
    });

    if (!r) {
      detailEl.innerHTML = '<div class="detailEmpty">Player not found.</div>';
      return;
    }

    const paPctTxt = r._paPct === null ? "—" : String(Math.round(r._paPct * 100)) + "%";
    const raw = escHtml(JSON.stringify(r, null, 2));

    detailEl.innerHTML =
      '<div class="detailTitle">' + escHtml(r._name) + '</div>' +
      '<div class="detailSub">' + escHtml(r._team) + '</div>' +
      '<div class="detailGrid">' +
      '<div class="detailCell"><div class="detailK">OPS</div><div class="detailV">' + escHtml(fmt3(r._ops)) + '</div></div>' +
      '<div class="detailCell"><div class="detailK">AVG</div><div class="detailV">' + escHtml(fmt3(r._avg)) + '</div></div>' +
      '<div class="detailCell"><div class="detailK">OBP</div><div class="detailV">' + escHtml(fmt3(r._obp)) + '</div></div>' +
      '<div class="detailCell"><div class="detailK">SLG</div><div class="detailV">' + escHtml(fmt3(r._slg)) + '</div></div>' +
      '<div class="detailCell"><div class="detailK">AB</div><div class="detailV">' + escHtml(r._ab === null ? "—" : String(r._ab)) + '</div></div>' +
      '<div class="detailCell"><div class="detailK">PA</div><div class="detailV">' + escHtml(r._pa === null ? "—" : String(r._pa)) + '</div></div>' +
      '<div class="detailCell"><div class="detailK">PA %tile</div><div class="detailV">' + escHtml(paPctTxt) + '</div></div>' +
      '</div>' +
      '<div class="detailRaw"><h4>Raw row</h4><pre>' + raw + '</pre></div>';
  }

  function renderGrid() {
    if (!playersGridEl) return;
    playersGridEl.innerHTML = viewRows.map(function (r) { return cardHtml(r); }).join("");
  }

  function applyFilters() {
    const q = qEl ? safeStr(qEl.value).trim().toLowerCase() : "";
    const minAb = minABEl ? Math.max(0, Number(minABEl.value || 0) || 0) : 0;

    const minPaPctInput = minPaPctEl ? asPct01(minPaPctEl.value) : 0;
    const minPaPct = minPaPctInput === null ? 0 : minPaPctInput;

    const sortBy = sortByEl ? safeStr(sortByEl.value || "ops") : "ops";

    if (pctPaLabelEl) pctPaLabelEl.textContent = String(Math.round(minPaPct * 100)) + "%";

    let rows = allRows.slice();

    if (q !== "") {
      rows = rows.filter(function (r) {
        return safeStr(r._name).toLowerCase().includes(q) || safeStr(r._team).toLowerCase().includes(q);
      });
    }

    rows = rows.filter(function (r) {
      const ab = r._ab === null ? 0 : r._ab;
      return ab >= minAb;
    });

    rows = rows.filter(function (r) {
      if (minPaPct <= 0) return true;
      if (r._paPct === null) return false;
      return r._paPct >= minPaPct;
    });

    function sortVal(r) {
      if (sortBy === "avg") return r._avg;
      if (sortBy === "obp") return r._obp;
      if (sortBy === "slg") return r._slg;
      if (sortBy === "pa") return r._pa;
      return r._ops;
    }

    rows.sort(function (a, b) {
      const av = sortVal(a);
      const bv = sortVal(b);
      const an = av === null ? -Infinity : av;
      const bn = bv === null ? -Infinity : bv;
      return bn - an;
    });

    viewRows = rows;
    pillCount(viewRows.length);
  }

  function exportCsv() {
    const cols = ["player","team","ab","h","hr","rbi","avg","obp","slg","ops","pa","pa_pct"];

    function csvCell(v) {
      const s = safeStr(v);
      const needs = s.includes(",") || s.includes("\n") || s.includes('"');
      if (!needs) return s;
      return '"' + s.replaceAll('"', '""') + '"';
    }

    const lines = [];
    lines.push(cols.join(","));

    for (let i = 0; i < viewRows.length; i++) {
      const r = viewRows[i];
      const base = {
        player: r._name,
        team: r._team,
        ab: r._ab,
        h: r._h,
        hr: r._hr,
        rbi: r._rbi,
        avg: r._avg,
        obp: r._obp,
        slg: r._slg,
        ops: r._ops,
        pa: r._pa,
        pa_pct: r._paPct
      };

      const rowLine = cols
        .map(function (c) {
          const v = base[c] === null || base[c] === undefined ? "" : base[c];
          return csvCell(v);
        })
        .join(",");

      lines.push(rowLine);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_players.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function bindEvents() {
    function onChanged() {
      applyFilters();
      renderGrid();
    }

    if (qEl) qEl.addEventListener("input", onChanged);
    if (minABEl) minABEl.addEventListener("input", onChanged);
    if (minPaPctEl) minPaPctEl.addEventListener("input", onChanged);
    if (sortByEl) sortByEl.addEventListener("change", onChanged);

    if (exportBtn) exportBtn.addEventListener("click", exportCsv);

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
        selectedId = null;
        applyFilters();
        renderPinnedRow();
        renderGrid();
        renderDetailById(null);
      });
    }

    if (playersGridEl) {
      playersGridEl.addEventListener("click", function (evt) {
        const t = evt.target;

        if (t && t.classList && t.classList.contains("pinBtn")) {
          const id = t.getAttribute("data-id");
          if (id) {
            if (pinned.has(id)) pinned.delete(id);
            else pinned.add(id);
            renderPinnedRow();
            renderGrid();
          }
          return;
        }

        let el = t;
        while (el && el !== playersGridEl && !(el.classList && el.classList.contains("playerCard"))) {
          el = el.parentElement;
        }

        if (el && el.classList && el.classList.contains("playerCard")) {
          const id = el.getAttribute("data-id");
          if (id) {
            selectedId = id;
            renderGrid();
            renderDetailById(id);
          }
        }
      });
    }
  }

  async function loadAll() {
    setState("Loading...", false);

    try {
      const manifest = await fetchJsonOrThrow("/data/manifest.json");
      if (manifest && manifest.generated_at) setLastGenerated(safeStr(manifest.generated_at));
      else setLastGenerated("—");
    } catch (e) {
      setLastGenerated("—");
    }

    const payload = await fetchJsonOrThrow("/data/live_player_stats.json");
    const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];

    allRows = normalizeRows(rows);
    computePaPercentiles(allRows);

    if (minABEl && !minABEl.value) minABEl.value = "0";
    if (minPaPctEl && !minPaPctEl.value) minPaPctEl.value = "0";
    if (sortByEl && !sortByEl.value) sortByEl.value = "ops";

    applyFilters();
    renderPinnedRow();
    renderGrid();
    renderDetailById(null);

    setState("Loaded player cards", false);
  }

  try {
    bindEvents();
    await loadAll();
  } catch (err) {
    console.error(err);
    setState("Failed", true);
    pillCount(0);

    if (detailEl) {
      const msg = err && err.stack ? err.stack : String(err);
      detailEl.innerHTML =
        '<div style="white-space:pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size:12px; color:#991b1b;">' +
        escHtml(msg) +
        "</div>";
    }
  }
});
