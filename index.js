console.log("index.js DEPLOY CHECK v1");

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

  function pickFirst(obj, keys) {
    for (let idx = 0; idx < keys.length; idx++) {
      const key = keys[idx];
      if (
        obj &&
        Object.prototype.hasOwnProperty.call(obj, key) &&
        obj[key] !== null &&
        obj[key] !== undefined
      ) return obj[key];
    }
    return null;
  }

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
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

    for (let idx = 0; idx < rows.length; idx++) {
      const rowVal = pickFirst(rows[idx], [
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

  function computeDerived(r) {
    const w = asNum(pickFirst(r, ["w", "W", "wins", "Wins"]));
    const l = asNum(pickFirst(r, ["l", "L", "losses", "Losses"]));
    const t = asNum(pickFirst(r, ["t", "T", "ties", "Ties"]));
    const pts = asNum(pickFirst(r, ["pts", "PTS", "points", "Points"]));
    const gf = asNum(pickFirst(r, ["gf", "GF", "goals_for", "GoalsFor"]));
    const ga = asNum(pickFirst(r, ["ga", "GA", "goals_against", "GoalsAgainst"]));
    const era = asNum(pickFirst(r, ["era", "ERA"]));
    const gd = (gf !== null && ga !== null) ? (gf - ga) : null;

    return { w, l, t, pts, gf, ga, gd, era };
  }

  function buildColumns(rows) {
    const hasW = rows.some(function (r) { return computeDerived(r).w !== null; });
    const hasL = rows.some(function (r) { return computeDerived(r).l !== null; });
    const hasT = rows.some(function (r) { return computeDerived(r).t !== null; });
    const hasPTS = rows.some(function (r) { return computeDerived(r).pts !== null; });
    const hasGF = rows.some(function (r) { return computeDerived(r).gf !== null; });
    const hasGA = rows.some(function (r) { return computeDerived(r).ga !== null; });
    const hasGD = rows.some(function (r) { return computeDerived(r).gd !== null; });
    const hasERA = rows.some(function (r) { return computeDerived(r).era !== null; });

    const cols = [];
    cols.push({ key: "team", label: "Team", type: "text" });
    if (hasW) cols.push({ key: "w", label: "W", type: "num" });
    if (hasL) cols.push({ key: "l", label: "L", type: "num" });
    if (hasT) cols.push({ key: "t", label: "T", type: "num" });
    if (hasPTS) cols.push({ key: "pts", label: "PTS", type: "num" });
    if (hasGF) cols.push({ key: "gf", label: "GF", type: "num" });
    if (hasGA) cols.push({ key: "ga", label: "GA", type: "num" });
    if (hasGD) cols.push({ key: "gd", label: "GD", type: "num" });
    if (hasERA) cols.push({ key: "era", label: "ERA", type: "num" });

    return cols;
  }

  function populateSortOptions(cols) {
    if (!sortEl) return;
    sortEl.innerHTML = "";

    function addOpt(val, label) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = label;
      sortEl.appendChild(opt);
    }

    addOpt("team_asc", "Team name (A-Z)");
    addOpt("team_desc", "Team name (Z-A)");

    cols.forEach(function (c) {
      if (c.type !== "num") return;
      addOpt(c.key + "_desc", c.label + " (high)");
      addOpt(c.key + "_asc", c.label + " (low)");
    });

    sortEl.value = "team_asc";
  }

  function sortRows(rows, sortKey) {
    const copyRows = rows.slice(0);

    function cmpText(a, b) {
      return String(a).localeCompare(String(b));
    }

    function cmpNum(a, b) {
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return a - b;
    }

    if (sortKey === "team_asc") {
      copyRows.sort(function (a, b) {
        return cmpText(getTeamName(a), getTeamName(b));
      });
      return copyRows;
    }

    if (sortKey === "team_desc") {
      copyRows.sort(function (a, b) {
        return cmpText(getTeamName(b), getTeamName(a));
      });
      return copyRows;
    }

    const parts = String(sortKey).split("_");
    const colKey = parts[0];
    const dir = parts[1] || "desc";

    copyRows.sort(function (a, b) {
      const da = computeDerived(a);
      const db = computeDerived(b);
      const va = (Object.prototype.hasOwnProperty.call(da, colKey)) ? da[colKey] : null;
      const vb = (Object.prototype.hasOwnProperty.call(db, colKey)) ? db[colKey] : null;

      const base = cmpNum(va, vb);
      return dir === "asc" ? base : (-base);
    });

    return copyRows;
  }

  function renderHeader(cols) {
    if (!theadEl) return;
    theadEl.innerHTML = "";

    const tr = document.createElement("tr");
    cols.forEach(function (c) {
      const th = document.createElement("th");
      th.textContent = c.label;
      tr.appendChild(th);
    });

    theadEl.appendChild(tr);
  }

  function renderBody(rows, cols) {
    if (!tbodyEl) return;
    tbodyEl.innerHTML = "";

    rows.forEach(function (r) {
      const tr = document.createElement("tr");
      const d = computeDerived(r);
      const teamName = String(getTeamName(r));

      cols.forEach(function (c) {
        const td = document.createElement("td");

        if (c.key === "team") {
          td.textContent = teamName;
        } else {
          const val = (Object.prototype.hasOwnProperty.call(d, c.key)) ? d[c.key] : null;
          td.textContent = (val === null || val === undefined) ? "" : String(val);
          td.className = "num";
        }

        tr.appendChild(td);
      });

      tr.addEventListener("click", function () {
        const url = "./cards.html";
        const hasHashSupport = true;

        if (hasHashSupport) {
          window.location.href = url + "#" + encodeURIComponent(teamName);
        } else {
          window.location.href = url;
        }
      });

      tbodyEl.appendChild(tr);
    });

    if (countEl) countEl.textContent = String(rows.length);
  }

  setState("Loading...");

  let resp;
  try {
    resp = await fetch("./live_team_stats.json", { cache: "no-store" });
  } catch (err) {
    setState("Fetch failed");
    if (tbodyEl) tbodyEl.textContent = String(err);
    return;
  }

  if (!resp.ok) {
    setState("HTTP " + String(resp.status));
    if (tbodyEl) tbodyEl.textContent = "live_team_stats.json HTTP " + String(resp.status);
    return;
  }

  let payload;
  try {
    payload = await resp.json();
  } catch (err) {
    setState("Bad JSON");
    if (tbodyEl) tbodyEl.textContent = String(err);
    return;
  }

  const rows = Array.isArray(payload) ? payload : (payload.rows || payload.data || []);
  const allRows = rows.slice(0);

  setState("Loaded " + String(allRows.length));

  if (lastGenEl) {
    const genVal = inferLastGenerated(payload, allRows);
    lastGenEl.textContent = genVal ? String(genVal) : "";
  }

  const cols = buildColumns(allRows);
  renderHeader(cols);
  populateSortOptions(cols);

  function applySearchAndSort() {
    const q = searchEl ? String(searchEl.value || "").toLowerCase().trim() : "";
    const sortKey = sortEl ? String(sortEl.value || "team_asc") : "team_asc";

    const filtered = allRows.filter(function (r) {
      return String(getTeamName(r)).toLowerCase().indexOf(q) !== -1;
    });

    const sorted = sortRows(filtered, sortKey);
    renderBody(sorted, cols);
  }

  applySearchAndSort();

  if (searchEl) {
    searchEl.addEventListener("input", applySearchAndSort);
  }
  if (sortEl) {
    sortEl.addEventListener("change", applySearchAndSort);
  }
});
