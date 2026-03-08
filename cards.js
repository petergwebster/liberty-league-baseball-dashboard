console.log("cards.js DEPLOY CHECK v4");

document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const gridEl = document.getElementById("grid");
  const sideEl = document.getElementById("side");
  const countEl = document.getElementById("count");
  const searchEl = document.getElementById("search");
  const sortEl = document.getElementById("sort");
  const lastGenEl = document.getElementById("lastGenerated");

  function setState(txt) {
    if (stateEl) stateEl.textContent = txt;
  }

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
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

  function asNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function computeGoalDiff(r) {
    const gf = asNum(pickFirst(r, ["gf", "GF", "goals_for", "GoalsFor"]));
    const ga = asNum(pickFirst(r, ["ga", "GA", "goals_against", "GoalsAgainst"]));
    if (gf === null || ga === null) return null;
    return gf - ga;
  }

  function getWins(r) {
    return asNum(pickFirst(r, ["w", "W", "wins", "Wins"]));
  }

  function getLosses(r) {
    return asNum(pickFirst(r, ["l", "L", "losses", "Losses"]));
  }

  function getPoints(r) {
    return asNum(pickFirst(r, ["pts", "PTS", "points", "Points"]));
  }

  function getEra(r) {
    return asNum(pickFirst(r, ["era", "ERA"]));
  }

  function hasAnyNumeric(rows, getterFn) {
    for (let idx = 0; idx < rows.length; idx++) {
      const v = getterFn(rows[idx]);
      if (v !== null && v !== undefined) return true;
    }
    return false;
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

  function renderDetails(r) {
    if (!sideEl) return;

    const name = getTeamName(r);
    const pts = pickFirst(r, ["pts", "PTS", "points", "Points"]);
    const w = pickFirst(r, ["w", "W", "wins", "Wins"]);
    const l = pickFirst(r, ["l", "L", "losses", "Losses"]);
    const t = pickFirst(r, ["t", "T", "ties", "Ties"]);
    const gp = pickFirst(r, ["gp", "GP", "games", "Games"]);
    const gf = pickFirst(r, ["gf", "GF", "goals_for", "GoalsFor"]);
    const ga = pickFirst(r, ["ga", "GA", "goals_against", "GoalsAgainst"]);
    const eraVal = pickFirst(r, ["era", "ERA"]);
    const gd = computeGoalDiff(r);

    sideEl.innerHTML = "";

    const titleEl = document.createElement("div");
    titleEl.className = "sideTitle";
    titleEl.textContent = String(name);
    sideEl.appendChild(titleEl);

    const subEl = document.createElement("div");
    subEl.className = "sideSub";
    subEl.textContent = "Team summary";
    sideEl.appendChild(subEl);

    const tableEl = document.createElement("table");
    tableEl.className = "kv";

    function addRow(label, value) {
      if (value === null || value === undefined || value === "") return;

      const trEl = document.createElement("tr");
      const kEl = document.createElement("td");
      kEl.className = "k";
      kEl.textContent = String(label);

      const vEl = document.createElement("td");
      vEl.className = "v";
      vEl.textContent = String(value);

      trEl.appendChild(kEl);
      trEl.appendChild(vEl);
      tableEl.appendChild(trEl);
    }

    addRow("Games played", gp);
    addRow("Wins", w);
    addRow("Losses", l);
    addRow("Ties", t);
    addRow("Points", pts);
    addRow("Goals for", gf);
    addRow("Goals against", ga);
    if (gd !== null) addRow("Goal differential", gd);
    addRow("ERA", eraVal);

    sideEl.appendChild(tableEl);

    const rawDetailsEl = document.createElement("details");
    rawDetailsEl.style.marginTop = "12px";

    const rawSummaryEl = document.createElement("summary");
    rawSummaryEl.textContent = "Raw data";
    rawDetailsEl.appendChild(rawSummaryEl);

    const preEl = document.createElement("pre");
    preEl.style.whiteSpace = "pre-wrap";
    preEl.style.margin = "8px 0 0 0";
    preEl.style.fontSize = "11px";
    preEl.style.opacity = "0.9";
    preEl.textContent = JSON.stringify(r, null, 2);

    rawDetailsEl.appendChild(preEl);
    sideEl.appendChild(rawDetailsEl);
  }

  function sortRows(rowsToSort, sortKey) {
    const copyRows = rowsToSort.slice(0);

    if (sortKey === "name_asc") {
      copyRows.sort(function (a, b) {
        return String(getTeamName(a)).localeCompare(String(getTeamName(b)));
      });
      return copyRows;
    }

    if (sortKey === "name_desc") {
      copyRows.sort(function (a, b) {
        return String(getTeamName(b)).localeCompare(String(getTeamName(a)));
      });
      return copyRows;
    }

    if (sortKey === "wins_desc") {
      copyRows.sort(function (a, b) {
        const av = getWins(a);
        const bv = getWins(b);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av;
      });
      return copyRows;
    }

    if (sortKey === "losses_asc") {
      copyRows.sort(function (a, b) {
        const av = getLosses(a);
        const bv = getLosses(b);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return av - bv;
      });
      return copyRows;
    }

    if (sortKey === "points_desc") {
      copyRows.sort(function (a, b) {
        const av = getPoints(a);
        const bv = getPoints(b);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return bv - av;
      });
      return copyRows;
    }

    if (sortKey === "era_asc") {
      copyRows.sort(function (a, b) {
        const av = getEra(a);
        const bv = getEra(b);
        if (av === null && bv === null) return 0;
        if (av === null) return 1;
        if (bv === null) return -1;
        return av - bv;
      });
      return copyRows;
    }

    return copyRows;
  }

  function populateSortOptions(rows) {
    if (!sortEl) return;

    sortEl.innerHTML = "";

    function addOpt(val, txt) {
      const optEl = document.createElement("option");
      optEl.value = val;
      optEl.textContent = txt;
      sortEl.appendChild(optEl);
    }

    addOpt("name_asc", "Team name (A-Z)");
    addOpt("name_desc", "Team name (Z-A)");

    if (hasAnyNumeric(rows, getWins)) addOpt("wins_desc", "Wins (high)");
    if (hasAnyNumeric(rows, getLosses)) addOpt("losses_asc", "Losses (low)");
    if (hasAnyNumeric(rows, getPoints)) addOpt("points_desc", "Points (high)");
    if (hasAnyNumeric(rows, getEra)) addOpt("era_asc", "ERA (low)");

    sortEl.value = "name_asc";
  }

  let selectedName = null;

  function renderCards(rowsToRender) {
    if (!gridEl) return;

    gridEl.innerHTML = "";
    if (countEl) countEl.textContent = String(rowsToRender.length);

    rowsToRender.forEach(function (r) {
      const teamName = String(getTeamName(r));

      const card = document.createElement("div");
      card.className = "card";
      card.textContent = teamName;

      if (selectedName && selectedName === teamName) {
        card.classList.add("selected");
      }

      card.addEventListener("click", function () {
        const prevSel = document.querySelector(".card.selected");
        if (prevSel) prevSel.classList.remove("selected");
        card.classList.add("selected");

        selectedName = teamName;
        renderDetails(r);
      });

      gridEl.appendChild(card);
    });
  }

  setState("Loading...");

  let resp;
  try {
    resp = await fetch("./live_team_stats.json", { cache: "no-store" });
  } catch (err) {
    setState("Fetch failed");
    if (gridEl) gridEl.textContent = String(err);
    return;
  }

  if (!resp.ok) {
    setState("HTTP " + String(resp.status));
    if (gridEl) gridEl.textContent = "live_team_stats.json HTTP " + String(resp.status);
    return;
  }

  let payload;
  try {
    payload = await resp.json();
  } catch (err) {
    setState("Bad JSON");
    if (gridEl) gridEl.textContent = String(err);
    return;
  }

  const rows = Array.isArray(payload) ? payload : (payload.rows || payload.data || []);
  const allRows = rows.slice(0);

  setState("Loaded " + String(allRows.length));

  if (lastGenEl) {
    const genVal = inferLastGenerated(payload, allRows);
    lastGenEl.textContent = genVal ? String(genVal) : "";
  }

  populateSortOptions(allRows);

  function applySearchAndSort() {
    const q = searchEl ? String(searchEl.value || "").toLowerCase().trim() : "";
    const sortKey = sortEl ? String(sortEl.value || "name_asc") : "name_asc";

    const filteredRows = allRows.filter(function (r) {
      return String(getTeamName(r)).toLowerCase().indexOf(q) !== -1;
    });

    const sortedRows = sortRows(filteredRows, sortKey);
    renderCards(sortedRows);
  }

  applySearchAndSort();

  if (searchEl) {
    searchEl.addEventListener("input", applySearchAndSort);
  }

  if (sortEl) {
    sortEl.addEventListener("change", applySearchAndSort);
  }

  if (sideEl) {
    sideEl.textContent = "Click a team to see details.";
  }
});
