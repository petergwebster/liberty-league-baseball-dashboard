document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");

  const qEl = document.getElementById("q");
  const minABEl = document.getElementById("minAB");
  const minPaPctEl = document.getElementById("minPaPct");
  const paPctLabelEl = document.getElementById("paPctLabel");
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

  function setState(msg, isError) {
    if (!stateEl) return;
    stateEl.textContent = msg;
    stateEl.style.background = isError ? "#ffe5e5" : "#e8f5e9";
    stateEl.style.border = "1px solid " + (isError ? "#ffb3b3" : "#b7e1bc");
    stateEl.style.padding = "2px 8px";
    stateEl.style.borderRadius = "999px";
    stateEl.style.display = "inline-block";
    stateEl.style.fontSize = "12px";
  }

  function s(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  function n(v) {
    const x = Number(v);
    if (Number.isFinite(x)) return x;
    return null;
  }

  function pick(r, keys) {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (r && Object.prototype.hasOwnProperty.call(r, k) && r[k] !== null && r[k] !== undefined && r[k] !== "") {
        return r[k];
      }
    }
    return null;
  }

  function makeId(r, idx) {
    const name = s(pick(r, ["player", "name", "Player"]));
    const team = s(pick(r, ["team", "Team"]));
    return team + "||" + name + "||" + String(idx);
  }

  function computePercentiles(rows, keyName) {
    const vals = rows
      .map((r) => n(r[keyName]))
      .filter((v) => v !== null)
      .sort((a, b) => a - b);

    function pct(v) {
      if (v === null || vals.length === 0) return null;
      let lo = 0;
      let hi = vals.length - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (vals[mid] <= v) lo = mid + 1;
        else hi = mid - 1;
      }
      const rank = Math.max(0, Math.min(vals.length - 1, hi));
      return Math.round((rank / Math.max(1, vals.length - 1)) * 100);
    }

    rows.forEach((r) => {
      const v = n(r[keyName]);
      r[keyName + "_pct"] = pct(v);
    });
  }

  function barHtml(pct) {
    const p = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
    return (
      "<div style='height:8px; background:#e8edf5; border-radius:999px; overflow:hidden; flex:1; min-width:90px;'>" +
      "<div style='height:8px; width:" + p + "%; background:#1b2640;'></div>" +
      "</div>" +
      "<div style='width:38px; text-align:right; opacity:.7; font-size:12px;'>" + String(p) + "%</div>"
    );
  }

  function getMetric(r, k) {
    const v = n(r[k]);
    if (v === null) return "";
    if (k === "avg" || k === "obp" || k === "slg" || k === "ops" || k === "iso") return v.toFixed(3);
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(1);
  }

  function renderPinnedRow() {
    pinnedRowEl.innerHTML = "";
    if (pinned.size === 0) return;

    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.gap = "8px";
    wrap.style.flexWrap = "wrap";

    Array.from(pinned).forEach((id) => {
      const r = allRows.find((x) => x._id === id);
      if (!r) return;
      const pill = document.createElement("div");
      pill.className = "pill";
      pill.style.background = "#1b2640";
      pill.style.color = "#fff";
      pill.textContent = s(r.player) + " (" + s(r.team) + ")";
      wrap.appendChild(pill);
    });

    pinnedRowEl.appendChild(wrap);
  }

  function renderDetail(r) {
    if (!r) {
      detailEl.innerHTML =
        "<div style='font-weight:700; font-size:16px; margin-bottom:6px;'>Pick a player</div>" +
        "<div class='muted'>Click any card to see details and pin for comparison.</div>";
      return;
    }

    const name = s(pick(r, ["player", "name", "Player"])) || "Unknown";
    const team = s(pick(r, ["team", "Team"])) || "";
    const pos = s(pick(r, ["pos", "position", "Pos"])) || "";

    detailEl.innerHTML =
      "<div style='font-weight:800; font-size:18px;'>" + name + "</div>" +
      "<div class='muted' style='margin-top:2px;'>" + team + (pos ? " • " + pos : "") + "</div>" +
      "<div style='margin-top:12px; display:grid; grid-template-columns: 1fr 1fr; gap:8px; font-size:14px;'>" +
        "<div><strong>AB</strong> " + s(r.ab) + "</div>" +
        "<div><strong>H</strong> " + s(r.h) + "</div>" +
        "<div><strong>HR</strong> " + s(r.hr) + "</div>" +
        "<div><strong>RBI</strong> " + s(r.rbi) + "</div>" +
        "<div><strong>AVG</strong> " + s(r.avg) + "</div>" +
        "<div><strong>OPS</strong> " + s(r.ops) + "</div>" +
      "</div>";
  }

  function renderGrid(rows) {
    playersGridEl.innerHTML = "";

    rows.forEach((r) => {
      const card = document.createElement("div");
      card.style.border = "1px solid #1b2640";
      card.style.borderRadius = "16px";
      card.style.padding = "14px";
      card.style.background = "#fff";
      card.style.cursor = "pointer";
      card.style.color = "#111";
      card.style.boxShadow = selectedId === r._id ? "0 0 0 3px rgba(27,38,64,0.25)" : "none";

      const name = s(pick(r, ["player", "name", "Player"])) || "Unknown";
      const team = s(pick(r, ["team", "Team"])) || "";
      const ab = s(pick(r, ["ab", "AB"])) || "";
      const h = s(pick(r, ["h", "H"])) || "";
      const hr = s(pick(r, ["hr", "HR"])) || "";
      const rbi = s(pick(r, ["rbi", "RBI"])) || "";

      const ops = getMetric(r, "ops");
      const obp = getMetric(r, "obp");
      const slg = getMetric(r, "slg");
      const avg = getMetric(r, "avg");

      const isPinned = pinned.has(r._id);

      card.innerHTML =
        "<div style='display:flex; justify-content:space-between; gap:10px; align-items:baseline;'>" +
          "<div style='font-weight:800;'>" + name + "</div>" +
          "<button data-pin='1' style='border:1px solid #ddd; background:" + (isPinned ? "#1b2640" : "#fff") + "; color:" + (isPinned ? "#fff" : "#111") + "; padding:6px 10px; border-radius:999px; cursor:pointer;'>" +
            (isPinned ? "Pinned" : "Pin") +
          "</button>" +
        "</div>" +
        "<div class='muted' style='margin-top:2px;'>" + team + "</div>" +
        "<div class='muted' style='margin-top:6px; font-size:13px;'>AB " + ab + " | H " + h + " | HR " + hr + " | RBI " + rbi + "</div>" +
        "<div style='display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin-top:10px; font-size:13px;'>" +
          "<div><div class='muted'>OPS</div><div style='font-weight:700;'>" + ops + "</div></div>" +
          "<div><div class='muted'>OBP</div><div style='font-weight:700;'>" + obp + "</div></div>" +
          "<div><div class='muted'>SLG</div><div style='font-weight:700;'>" + slg + "</div></div>" +
          "<div><div class='muted'>AVG</div><div style='font-weight:700;'>" + avg + "</div></div>" +
        "</div>" +
        "<div style='margin-top:10px; display:grid; gap:8px; font-size:13px;'>" +
          "<div style='display:flex; align-items:center; gap:10px;'><div style='width:40px;'>OPS</div>" + barHtml(r.ops_pct) + "</div>" +
          "<div style='display:flex; align-items:center; gap:10px;'><div style='width:40px;'>OBP</div>" + barHtml(r.obp_pct) + "</div>" +
          "<div style='display:flex; align-items:center; gap:10px;'><div style='width:40px;'>SLG</div>" + barHtml(r.slg_pct) + "</div>" +
          "<div style='display:flex; align-items:center; gap:10px;'><div style='width:40px;'>ISO</div>" + barHtml(r.iso_pct) + "</div>" +
          "<div style='display:flex; align-items:center; gap:10px;'><div style='width:40px;'>RBI</div>" + barHtml(r.rbi_pct) + "</div>" +
        "</div>";

      card.addEventListener("click", function (evt) {
        const pinBtn = evt.target && evt.target.getAttribute && evt.target.getAttribute("data-pin");
        if (pinBtn) return;
        selectedId = r._id;
        renderAll();
      });

      card.querySelector("[data-pin='1']").addEventListener("click", function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        if (pinned.has(r._id)) pinned.delete(r._id);
        else pinned.add(r._id);
        renderAll();
      });

      playersGridEl.appendChild(card);
    });
  }

  function applyFilters() {
    const q = (qEl.value || "").trim().toLowerCase();
    const minAB = Math.max(0, Number(minABEl.value || 0));
    const minPaPct = Math.max(0, Math.min(100, Number(minPaPctEl.value || 0)));

    paPctLabelEl.textContent = "(" + String(minPaPct) + "%)";

    let rows = allRows.slice();

    if (q) {
      rows = rows.filter((r) => {
        const name = s(pick(r, ["player", "name", "Player"])).toLowerCase();
        const team = s(pick(r, ["team", "Team"])).toLowerCase();
        return name.includes(q) || team.includes(q);
      });
    }

    rows = rows.filter((r) => {
      const ab = n(pick(r, ["ab", "AB"])) || 0;
      const paPct = n(r.pa_pct);
      const okPa = paPct === null ? true : paPct >= minPaPct;
      return ab >= minAB && okPa;
    });

    const sortVal = sortByEl.value || "ops_desc";

    function numOrNegInf(v) {
      const x = n(v);
      if (x === null) return -Infinity;
      return x;
    }

    rows.sort((a, b) => {
      if (sortVal === "name_asc") {
        const an = s(pick(a, ["player", "name", "Player"])).toLowerCase();
        const bn = s(pick(b, ["player", "name", "Player"])).toLowerCase();
        return an.localeCompare(bn);
      }
      if (sortVal === "ab_desc") return numOrNegInf(pick(b, ["ab", "AB"])) - numOrNegInf(pick(a, ["ab", "AB"]));
      if (sortVal === "hr_desc") return numOrNegInf(pick(b, ["hr", "HR"])) - numOrNegInf(pick(a, ["hr", "HR"]));
      if (sortVal === "rbi_desc") return numOrNegInf(pick(b, ["rbi", "RBI"])) - numOrNegInf(pick(a, ["rbi", "RBI"]));
      if (sortVal === "avg_desc") return numOrNegInf(a.avg) < numOrNegInf(b.avg) ? 1 : -1;
      if (sortVal === "obp_desc") return numOrNegInf(a.obp) < numOrNegInf(b.obp) ? 1 : -1;
      if (sortVal === "slg_desc") return numOrNegInf(a.slg) < numOrNegInf(b.slg) ? 1 : -1;
      return numOrNegInf(a.ops) < numOrNegInf(b.ops) ? 1 : -1;
    });

    viewRows = rows;

    countPillEl.textContent = String(rows.length);
  }

  function exportFilteredCsv() {
    const rows = viewRows;
    if (!rows.length) return;

    const cols = ["team", "player", "ab", "h", "hr", "rbi", "avg", "obp", "slg", "ops"];
    const lines = [];
    lines.push(cols.join(","));

    rows.forEach((r) => {
      const vals = cols.map((c) => {
        const v = r[c] !== undefined ? r[c] : pick(r, [c.toUpperCase(), c]);
        const txt = s(v).replaceAll('"', '""');
        return '"' + txt + '"';
      });
      lines.push(vals.join(","));
    });

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "liberty_league_players_filtered.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  }

  function renderAll() {
    applyFilters();
    renderPinnedRow();

    const selected = allRows.find((r) => r._id === selectedId) || null;
    renderDetail(selected);

    renderGrid(viewRows);
  }

  try {
    setState("Loading...", false);

    try {
      const manifest = await fetch("/data/manifest.json", { cache: "no-store" }).then((r) => r.json());
      if (lastGenEl) lastGenEl.textContent = manifest.generated_at ? manifest.generated_at : "";
    } catch (e) {
      if (lastGenEl) lastGenEl.textContent = "";
    }

    const payload = await fetch("/data/live_player_stats.json", { cache: "no-store" }).then((r) => r.json());
    const rows = payload && Array.isArray(payload.rows) ? payload.rows : [];

    rows.forEach((r, idx) => {
      r._id = makeId(r, idx);
      r.player = s(pick(r, ["player", "name", "Player"]));
      r.team = s(pick(r, ["team", "Team"]));
      r.ab = n(pick(r, ["ab", "AB"])) || 0;
      r.h = n(pick(r, ["h", "H"])) || 0;
      r.hr = n(pick(r, ["hr", "HR"])) || 0;
      r.rbi = n(pick(r, ["rbi", "RBI"])) || 0;

      r.avg = n(pick(r, ["avg", "AVG"]));
      r.obp = n(pick(r, ["obp", "OBP"]));
      r.slg = n(pick(r, ["slg", "SLG"]));
      r.ops = n(pick(r, ["ops", "OPS"]));
      r.iso = n(pick(r, ["iso", "ISO"]));
      r.pa = n(pick(r, ["pa", "PA"]));
    });

    allRows = rows;

    computePercentiles(allRows, "ops");
    computePercentiles(allRows, "obp");
    computePercentiles(allRows, "slg");
    computePercentiles(allRows, "iso");
    computePercentiles(allRows, "rbi");
    computePercentiles(allRows, "pa");

    setState("Loaded player cards", false);

    qEl.addEventListener("input", renderAll);
    minABEl.addEventListener("input", renderAll);
    minPaPctEl.addEventListener("input", renderAll);
    sortByEl.addEventListener("change", renderAll);

    exportBtn.addEventListener("click", exportFilteredCsv);

    clearPinsBtn.addEventListener("click", function () {
      pinned = new Set();
      renderAll();
    });

    clearAllBtn.addEventListener("click", function () {
      pinned = new Set();
      selectedId = null;
      qEl.value = "";
      minABEl.value = "10";
      minPaPctEl.value = "0";
      sortByEl.value = "ops_desc";
      renderAll();
    });

    renderAll();
  } catch (err) {
    console.error(err);
    setState("Failed", true);
    if (detailEl) detailEl.textContent = String(err);
  }
});
