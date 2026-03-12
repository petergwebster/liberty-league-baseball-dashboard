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
    stateEl.className = "pill" + (isBad ? " pillBad" : "");
  }

  function s(v) {
    if (v === null || v === undefined) return "";
    return String(v).trim();
  }

  function n(v) {
    if (v === null || v === undefined) return null;
    const x = Number(v);
    if (!Number.isFinite(x)) return null;
    return x;
  }

  function pick(obj, keys) {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== "") return obj[k];
    }
    return null;
  }

  function round3(x) {
    if (!Number.isFinite(x)) return null;
    return Math.round(x * 1000) / 1000;
  }

  function fmt3(x) {
    if (!Number.isFinite(x)) return "—";
    const v = round3(x);
    let t = String(v);
    if (t.indexOf(".") === -1) t = t + ".000";
    const parts = t.split(".");
    const dec = parts[1] || "";
    return parts[0] + "." + (dec + "000").slice(0, 3);
  }

  function makeId(r, idx) {
    const a = s(r.player || r.name || "");
    const b = s(r.team || "");
    const base = (a + "|" + b + "|" + String(idx)).toLowerCase();
    return base.replace(/[^a-z0-9|]+/g, "-");
  }

  function pctRank(sortedValsAsc, x) {
    if (!Number.isFinite(x)) return null;
    const nVals = sortedValsAsc.length;
    if (nVals === 0) return null;
    let lo = 0;
    let hi = nVals - 1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (sortedValsAsc[mid] <= x) lo = mid + 1;
      else hi = mid - 1;
    }
    const countLE = lo;
    return Math.round((countLE / nVals) * 100);
  }

  function computePercentiles(rows, field) {
    const vals = [];
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i][field];
      if (Number.isFinite(v)) vals.push(v);
    }
    vals.sort(function (a, b) { return a - b; });
    for (let i = 0; i < rows.length; i++) {
      const v = rows[i][field];
      rows[i]["pct_" + field] = pctRank(vals, v);
    }
  }

  function clampPct(p) {
    if (!Number.isFinite(p)) return 0;
    return Math.max(0, Math.min(100, p));
  }

  function renderBar(label, pct) {
    const p = clampPct(pct);
    const pctTxt = Number.isFinite(pct) ? String(p) + "%" : "—";
    return (
      '<div class="barRow">' +
      '<div class="barLabel">' + label + '</div>' +
      '<div class="barWrap"><div class="barFill" style="width:' + String(p) + '%;"></div></div>' +
      '<div class="barPct">' + pctTxt + "</div>" +
      "</div>"
    );
  }

  function escapeHtml(t) {
    return s(t)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function sortRows(rows) {
    const mode = s(sortByEl.value);
    const get = function (r, key) {
      const v = r[key];
      if (!Number.isFinite(v)) return -1e18;
      return v;
    };

    const rowsCopy = rows.slice();
    rowsCopy.sort(function (a, b) {
      if (mode === "avg_desc") return get(b, "avg") - get(a, "avg");
      if (mode === "obp_desc") return get(b, "obp") - get(a, "obp");
      if (mode === "slg_desc") return get(b, "slg") - get(a, "slg");
      if (mode === "hr_desc") return get(b, "hr") - get(a, "hr");
      if (mode === "rbi_desc") return get(b, "rbi") - get(a, "rbi");
      if (mode === "pa_desc") return get(b, "pa") - get(a, "pa");
      return get(b, "ops") - get(a, "ops");
    });
    return rowsCopy;
  }

  function applyFilters() {
    const q = s(qEl.value).toLowerCase();
    const minAB = n(minABEl.value);
    const minPaPct = n(minPaPctEl.value) || 0;

    if (pctPaLabelEl) pctPaLabelEl.textContent = String(minPaPct);

    const out = [];
    for (let i = 0; i < allRows.length; i++) {
      const r = allRows[i];
      if (Number.isFinite(minAB) && r.ab < minAB) continue;
      if (Number.isFinite(r.pct_pa) && r.pct_pa < minPaPct) continue;

      if (q) {
        const hay = (s(r.player) + " " + s(r.team)).toLowerCase();
        if (hay.indexOf(q) === -1) continue;
      }
      out.push(r);
    }
    return sortRows(out);
  }

  function renderPinned() {
    if (!pinnedRowEl) return;
    if (pinned.size === 0) {
      pinnedRowEl.innerHTML = "";
      return;
    }

    const pinnedRows = [];
    for (let i = 0; i < allRows.length; i++) {
      const r = allRows[i];
      if (pinned.has(r._id)) pinnedRows.push(r);
    }

    const blocks = [];
    for (let i = 0; i < pinnedRows.length; i++) {
      const r = pinnedRows[i];
      blocks.push(
        '<div class="card" style="min-width:240px; max-width:320px; cursor:default;">' +
        '<div class="cardHeader">' +
        '<div>' +
        '<div class="name">' + escapeHtml(r.player) + "</div>" +
        '<div class="team">' + escapeHtml(r.team) + "</div>" +
        "</div>" +
        '<button class="pinBtn pinBtnOn" data-pin="' + escapeHtml(r._id) + '">Pinned</button>' +
        "</div>" +
        '<div class="smallStatRow">' +
        "<span>OPS " + fmt3(r.ops) + "</span>" +
        "<span>OBP " + fmt3(r.obp) + "</span>" +
        "<span>SLG " + fmt3(r.slg) + "</span>" +
        "<span>AVG " + fmt3(r.avg) + "</span>" +
        "</div>" +
        "</div>"
      );
    }

    pinnedRowEl.innerHTML = blocks.join("");
    const btns = pinnedRowEl.querySelectorAll("button[data-pin]");
    for (let i = 0; i < btns.length; i++) {
      btns[i].addEventListener("click", function (ev) {
        const id = ev.currentTarget.getAttribute("data-pin");
        pinned.delete(id);
        renderAll();
      });
    }
  }

  function renderDetail(r) {
    if (!detailEl) return;

    if (!r) {
      detailEl.innerHTML =
        '<div class="muted" style="font-weight:900;">Pick a player to see details.</div>' +
        '<div class="help">Tip: click the card. Use Pin to keep a few players at the top for comparisons.</div>';
      return;
    }

    const kv = function (k, v) {
      return (
        '<div class="kv">' +
        '<div class="kvK">' + escapeHtml(k) + "</div>" +
        '<div class="kvV">' + escapeHtml(v) + "</div>" +
        "</div>"
      );
    };

    const opsPct = Number.isFinite(r.pct_ops) ? String(r.pct_ops) + "%" : "—";
    const paPct = Number.isFinite(r.pct_pa) ? String(r.pct_pa) + "%" : "—";

    detailEl.innerHTML =
      '<div class="detailTitle">' + escapeHtml(r.player) + "</div>" +
      '<div class="detailTeam">' + escapeHtml(r.team) + "</div>" +
      '<div class="detailBig">' +
      "<span>OPS " + fmt3(r.ops) + " (" + opsPct + ")</span>" +
      "<span>PA " + (Number.isFinite(r.pa) ? String(r.pa) : "—") + " (" + paPct + ")</span>" +
      "</div>" +
      '<div class="detailGrid">' +
      kv("AVG", fmt3(r.avg)) +
      kv("OBP", fmt3(r.obp)) +
      kv("SLG", fmt3(r.slg)) +
      kv("ISO", Number.isFinite(r.iso) ? fmt3(r.iso) : "—") +
      kv("AB", Number.isFinite(r.ab) ? String(r.ab) : "—") +
      kv("H", Number.isFinite(r.h) ? String(r.h) : "—") +
      kv("HR", Number.isFinite(r.hr) ? String(r.hr) : "—") +
      kv("RBI", Number.isFinite(r.rbi) ? String(r.rbi) : "—") +
      "</div>" +
      '<div class="help">Next upgrade: add game logs and splits into this panel.</div>';
  }

  function renderGrid(rows) {
    if (!playersGridEl) return;
    const cards = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const isPinned = pinned.has(r._id);
      const pinClass = isPinned ? "pinBtn pinBtnOn" : "pinBtn";
      const pinText = isPinned ? "Pinned" : "Pin";

      cards.push(
        '<div class="card" data-id="' + escapeHtml(r._id) + '">' +
        '<div class="cardHeader">' +
        '<div>' +
        '<div class="name">' + escapeHtml(r.player) + "</div>" +
        '<div class="team">' + escapeHtml(r.team) + "</div>" +
        "</div>" +
        '<button class="' + pinClass + '" data-pin="' + escapeHtml(r._id) + '">' + pinText + "</button>" +
        "</div>" +
        '<div class="smallStatRow">' +
        "<span>OPS " + fmt3(r.ops) + "</span>" +
        "<span>OBP " + fmt3(r.obp) + "</span>" +
        "<span>SLG " + fmt3(r.slg) + "</span>" +
        "<span>AVG " + fmt3(r.avg) + "</span>" +
        "</div>" +
        '<div class="bars">' +
        renderBar("OPS", r.pct_ops) +
        renderBar("OBP", r.pct_obp) +
        renderBar("SLG", r.pct_slg) +
        renderBar("ISO", r.pct_iso) +
        renderBar("RBI", r.pct_rbi) +
        renderBar("PA", r.pct_pa) +
        "</div>" +
        "</div>"
      );
    }

    playersGridEl.innerHTML = cards.join("");

    const cardEls = playersGridEl.querySelectorAll(".card[data-id]");
    for (let i = 0; i < cardEls.length; i++) {
      cardEls[i].addEventListener("click", function (ev) {
        const id = ev.currentTarget.getAttribute("data-id");
        selectedId = id;
        const row = allRows.find(function (x) { return x._id === id; });
        renderDetail(row);
      });
    }

    const pinEls = playersGridEl.querySelectorAll("button[data-pin]");
    for (let i = 0; i < pinEls.length; i++) {
      pinEls[i].addEventListener("click", function (ev) {
        ev.stopPropagation();
        const id = ev.currentTarget.getAttribute("data-pin");
        if (pinned.has(id)) pinned.delete(id);
        else pinned.add(id);
        renderAll();
      });
    }
  }

  function exportFilteredCsv() {
    const rows = viewRows;
    const keys = ["player", "team", "pa", "ab", "h", "hr", "rbi", "avg", "obp", "slg", "ops", "iso"];
    const lines = [];
    lines.push(keys.join(","));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const vals = [];
      for (let k = 0; k < keys.length; k++) {
        const key = keys[k];
        let v = r[key];
        if (v === null || v === undefined) v = "";
        if (Number.isFinite(v)) v = String(v);
        v = String(v);
        if (v.indexOf('"') !== -1 || v.indexOf(",") !== -1 || v.indexOf("\n") !== -1) {
          v = '"' + v.replace(/"/g, '""') + '"';
        }
        vals.push(v);
      }
      lines.push(vals.join(","));
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "filtered_players.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function fetchJsonOrThrow(urlPath) {
    const resp = await fetch(urlPath, { cache: "no-store" });
    const ct = resp.headers.get("content-type") || "";
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error("Fetch failed " + urlPath + " HTTP "
