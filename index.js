console.log("index.js DEPLOY CHECK v4");

document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const searchEl = document.getElementById("search");
  const sortEl = document.getElementById("sort");
  const countEl = document.getElementById("count");
  const theadEl = document.getElementById("thead");
  const tbodyEl = document.getElementById("tbody");

  function setState(txt) {
    if (stateEl) stateEl.textContent = txt;
  }

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
  }

  function normalize(s) {
    return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
  }

  function pickFirst(obj, keys) {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (
        obj &&
        Object.prototype.hasOwnProperty.call(obj, k) &&
        obj[k] !== null &&
        obj[k] !== undefined
      ) return obj[k];
    }
    return null;
  }

  function asNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function inferLastGenerated(payload, rows) {
    const topVal = pickFirst(payload, [
      "lastGenerated",
      "last_generated",
      "generatedAt",
      "generated_at",
      "updatedAt",
      "updated_at"
    ]);
    if (topVal) return topVal;

    for (let i = 0; i < rows.length; i++) {
      const rowVal = pickFirst(rows[i], [
        "lastGenerated",
        "last_generated",
        "generatedAt",
        "generated_at",
        "updatedAt",
        "updated_at"
      ]);
      if (rowVal) return rowVal;
    }
    return null;
  }

  function computeGD(r) {
    const gf = asNum(pickFirst(r, ["gf", "GF", "goals_for", "GoalsFor"]));
    const ga = asNum(pickFirst(r, ["ga", "GA", "goals_against", "GoalsAgainst"]));
    if (gf === null || ga === null) return null;
    return gf - ga;
  }

  function buildCols(rows) {
    const cols = [];

    cols.push({ key: "team", label: "Team", numeric: false });
    cols.push({ key: "w", label: "W", numeric: true });
    cols.push({ key: "l", label: "L", numeric: true });
    cols.push({ key: "t", label: "T", numeric: true });
    cols.push({ key: "pct", label: "PCT", numeric: true });
    cols.push({ key: "pts", label: "PTS", numeric: true });
    cols.push({ key: "gf", label: "GF", numeric: true });
    cols.push({ key: "ga", label: "GA", numeric: true });
    cols.push({ key: "gd", label: "GD", numeric: true });

    const hasAny = function (getter) {
      for (let i = 0; i < rows.length; i++) {
        const v = getter(rows[i]);
        if (v !== null && v !== undefined) return true;
      }
      return false;
    };

    const hasW = hasAny(function (r) { return asNum(pickFirst(r, ["w","W","wins","Wins"])); });
    const hasL = hasAny(function (r) { return asNum(pickFirst(r, ["l","L","losses","Losses"])); });
    const hasT = hasAny(function (r) { return asNum(pickFirst(r, ["t","T","ties","Ties"])); });
    const hasPCT = hasAny(function (r) { return asNum(pickFirst(r, ["pct","PCT","win_pct","WinPct"])); });
    const hasPTS = hasAny(function (r) { return asNum(pickFirst(r, ["pts","PTS","points","Points"])); });
    const hasGF = hasAny(function (r) { return asNum(pickFirst(r, ["gf","GF","goals_for","GoalsFor"])); });
    const hasGA = hasAny(function (r) { return asNum(pickFirst(r, ["ga","GA","goals_against","GoalsAgainst"])); });
    const hasGD = hasAny(function (r) { return computeGD(r); });

    const filtered = [];
    for (let i = 0; i < cols.length; i++) {
      const c = cols[i];
      if (c.key === "team") filtered.push(c);
      if (c.key === "w" && hasW) filtered.push(c);
      if (c.key === "l" && hasL) filtered.push(c);
      if (c.key === "t" && hasT) filtered.push(c);
      if (c.key === "pct" && hasPCT) filtered.push(c);
      if (c.key === "pts" && hasPTS) filtered.push(c);
      if (c.key === "gf" && hasGF) filtered.push(c);
      if (c.key === "ga" && hasGA) filtered.push(c);
      if (c.key === "gd" && hasGD) filtered.push(c);
    }

    return filtered;
  }

  function getCellValue(r, colKey) {
    if (colKey === "team") return getTeamName(r);

    if (colKey === "gd") {
      const gd = computeGD(r);
      return gd === null ? null : gd;
    }

    const v = pickFirst(r, [colKey, colKey.toUpperCase()]);
    const n = asNum(v);
    return n === null ? v : n;
  }

  function renderHeader(cols) {
    if (!theadEl) return;

    const tr = document.createElement("tr");
    cols.forEach(function (c) {
      const th = document.createElement("th");
      th.textContent = c.label;
      tr.appendChild(th);
    });

    theadEl.innerHTML = "";
    theadEl.appendChild(tr);
  }

  function renderBody(rows, cols) {
    if (!tbodyEl) return;

    tbodyEl.innerHTML = "";

    rows.forEach(function (r) {
      const tr = document.createElement("tr");
      tr.style.cursor = "pointer";

      cols.forEach(function (c) {
        const td = document.createElement("td");
        const v = getCellValue(r, c.key);
        td.textContent = (v === null || v === undefined) ? "" : String(v);
        if (c.numeric) td.className = "num";
        tr.appendChild(td);
      });

      tr.addEventListener("click", function () {
        const teamName = getTeamName(r);
        window.location.href = "/cards#" + encodeURIComponent(teamName);
      });

      tbodyEl.appendChild(tr);
    });

    if (countEl) countEl.textContent = String(rows.length);
  }

  function sortRows(rows, sortKey) {
    const tmp = rows.slice(0);

    if (sortKey === "team_asc") {
      tmp.sort(function (a, b) {
        const an = normalize(getTeamName(a));
        const bn = normalize(getTeamName(b));
        if (an < bn) return -1;
        if (an > bn) return 1;
        return 0;
      });
      return tmp;
    }

    if (sortKey === "pts_desc") {
      tmp.sort(function (a, b) {
        const ap = asNum(pickFirst(a, ["pts","PTS","points","Points"])) || 0;
        const bp = asNum(pickFirst(b, ["pts","PTS","points","Points"])) || 0;
        return bp - ap;
      });
      return tmp;
    }

    if (sortKey === "w_desc") {
      tmp.sort(function (a, b) {
        const aw = asNum(pickFirst(a, ["w","W","wins","Wins"])) || 0;
        const bw = asNum(pickFirst(b, ["w","W","wins","Wins"])) || 0;
        return bw - aw;
      });
      return tmp;
    }

    if (sortKey === "gd_desc") {
      tmp.sort(function (a, b) {
        const agd = computeGD(a) || 0;
        const bgd = computeGD(b) || 0;
        return bgd - agd;
      });
      return tmp;
    }

    return tmp;
  }

  function populateSort() {
    if (!sortEl) return;

    sortEl.innerHTML = "";

    const opts = [
      { value: "team_asc", label: "Team (A-Z)" },
      { value: "w_desc", label: "Wins (high-low)" },
      { value: "pts_desc", label: "Points (high-low)" },
      { value: "gd_desc", label: "Goal diff (high-low)" }
    ];

    opts.forEach(function (o) {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      sortEl.appendChild(opt);
    });
  }

  setState("index.js running");

  const jsonUrl = "./live_team_stats.json";
  let resp;
  try {
    resp = await fetch(jsonUrl, { cache: "no-store" });
  } catch (err) {
    setState("Fetch failed");
    return;
  }

  if (!resp.ok) {
    setState("HTTP " + String(resp.status));
    return;
  }

  let payload;
  try {
    payload = await resp.json();
  } catch (err) {
    setState("Bad JSON");
    return;
  }

  const rows = Array.isArray(payload) ? payload : (payload.rows || payload.data || []);
  const allRows = rows.slice(0);

  setState("Loaded " + String(allRows.length));

  if (lastGenEl) {
    const genVal = inferLastGenerated(payload, allRows);
    lastGenEl.textContent = genVal ? String(genVal) : "";
  }

  const cols = buildCols(allRows);
  renderHeader(cols);
  populateSort();

  function apply() {
    const q = searchEl ? normalize(searchEl.value) : "";
    const sortKey = sortEl ? String(sortEl.value || "team_asc") : "team_asc";

    const filtered = allRows.filter(function (r) {
      return normalize(getTeamName(r)).indexOf(q) !== -1;
    });

    const sorted = sortRows(filtered, sortKey);
    renderBody(sorted, cols);
  }

  apply();

  if (searchEl) searchEl.addEventListener("input", apply);
  if (sortEl) sortEl.addEventListener("change", apply);
});
