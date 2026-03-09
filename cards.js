console.log("cards.js DEPLOY CHECK v6 (hash auto-select)");

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

  function normalizeName(s) {
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");
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

    const w = pickFirst(r, ["w", "W", "wins", "Wins"]);
    const l = pickFirst(r, ["l", "L", "losses", "Losses"]);
    const t = pickFirst(r, ["t", "T", "ties", "Ties"]);
    const pts = pickFirst(r, ["pts", "PTS", "points", "Points"]);
    const eraVal = pickFirst(r, ["era", "ERA"]);

    const gf = pickFirst(r, ["gf", "GF", "goals_for", "GoalsFor"]);
    const ga = pickFirst(r, ["ga", "GA", "goals_against", "GoalsAgainst"]);
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

    const tbl = document.createElement("table");
    tbl.className = "kv";

    function addRow(k, v) {
      if (v === null || v === undefined || v === "") return;
      const tr = document.createElement("tr");

      const tdK = document.createElement("td");
      tdK.className = "k";
      tdK.textContent = String(k);

      const tdV = document.createElement("td");
      tdV.className = "v";
      tdV.textContent = String(v);

      tr.appendChild(tdK);
      tr.appendChild(tdV);
      tbl.appendChild(tr);
    }

    addRow("Wins", w);
    addRow("Losses", l);
    addRow("Ties", t);
    addRow("Points", pts);

    if (gf !== null && gf !== undefined) addRow("Goals for", gf);
    if (ga !== null && ga !== undefined) addRow("Goals against", ga);
    if (gd !== null && gd !== undefined) addRow("Goal differential", gd);

    addRow("ERA", eraVal);

    sideEl.appendChild(tbl);

    const detailsEl = document.createElement("details");
    const summaryEl = document.createElement("summary");
    summaryEl.textContent = "Raw data";
    detailsEl.appendChild(summaryEl);

    const pre = document.createElement("pre");
    pre.textContent = JSON.stringify(r, null, 2);
    detailsEl.appendChild(pre);

    sideEl.appendChild(detailsEl);
  }

  function sortRows(rows, sortKey) {
    const sorted = rows.slice(0);

    function byStr(getter, dir) {
      sorted.sort(function (a, b) {
        const av = String(getter(a) || "").toLowerCase();
        const bv = String(getter(b) || "").toLowerCase();
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    function byNum(getter, dir) {
      sorted.sort(function (a, b) {
        const av = getter(a);
        const bv = getter(b);

        const aBad = av === null || av === undefined;
        const bBad = bv === null || bv === undefined;
        if (aBad && bBad) return 0;
        if (aBad) return 1;
        if (bBad) return -1;

        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    if (sortKey === "name_asc") byStr(getTeamName, 1);
    else if (sortKey === "name_desc") byStr(getTeamName, -1);
    else if (sortKey === "wins_desc") byNum(getWins, -1);
    else if (sortKey === "wins_asc") byNum(getWins, 1);
    else if (sortKey === "losses_asc") byNum(getLosses, 1);
    else if (sortKey === "losses_desc") byNum(getLosses, -1);
    else if (sortKey === "points_desc") byNum(getPoints, -1);
    else if (sortKey === "points_asc") byNum(getPoints, 1);
    else if (sortKey === "era_asc") byNum(getEra, 1);
    else if (sortKey === "era_desc") byNum(getEra, -1);

    return sorted;
  }

  function populateSortOptions(allRows) {
    if (!sortEl) return;

    sortEl.innerHTML = "";

    function addOpt(value, label) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = label;
      sortEl.appendChild(opt);
    }

    addOpt("name_asc", "Team name (A–Z)");
    addOpt("name_desc", "Team name (Z–A)");

    if (hasAnyNumeric(allRows, getWins)) {
      addOpt("wins_desc", "Wins (high)");
      addOpt("wins_asc", "Wins (low)");
    }

    if (hasAnyNumeric(allRows, getLosses)) {
      addOpt("losses_asc", "Losses (low)");
      addOpt("losses_desc", "Losses (high)");
    }

    if (hasAnyNumeric(allRows, getPoints)) {
      addOpt("points_desc", "Points (high)");
      addOpt("points_asc", "Points (low)");
    }

    if (hasAnyNumeric(allRows, getEra)) {
      addOpt("era_asc", "ERA (low)");
      addOpt("era_desc", "ERA (high)");
    }

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
      card.dataset.team = teamName;

      if (selectedName && normalizeName(selectedName) === normalizeName(teamName)) {
        card.classList.add("selected");
      }

      card.addEventListener("click", function () {
        const prevSel = document.querySelector(".card.selected");
        if (prevSel) prevSel.classList.remove("selected");
        card.classList.add("selected");

        selectedName = teamName;

        try {
          window.location.hash = encodeURIComponent(teamName);
        } catch (err) {
          // ignore
        }

        renderDetails(r);
      });

      gridEl.appendChild(card);
    });
  }

  function selectTeamByName(rows, targetName) {
    const targetNorm = normalizeName(targetName);
    if (!targetNorm) return false;

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      if (normalizeName(getTeamName(r)) === targetNorm) {
        selectedName = getTeamName(r);
        renderDetails(r);

        const cardEls = document.querySelectorAll(".card");
        for (let j = 0; j < cardEls.length; j++) {
          const cardEl = cardEls[j];
          if (normalizeName(cardEl.dataset.team) === targetNorm) {
            const prevSel = document.querySelector(".card.selected");
            if (prevSel) prevSel.classList.remove("selected");
            cardEl.classList.add("selected");
            try {
              cardEl.scrollIntoView({ block: "center" });
            } catch (err) {
              // ignore
            }
            break;
          }
        }

        return true;
      }
    }

    return false;
  }

  function getHashTeamName() {
    const raw = String(window.location.hash || "");
    if (!raw || raw === "#") return null;
    const trimmed = raw.slice(1);
    try {
      return decodeURIComponent(trimmed);
    } catch (err) {
      return trimmed;
    }
  }

  function applySearchAndSort(allRows) {
    const q = searchEl ? normalizeName(searchEl.value) : "";
    const sortKey = sortEl ? String(sortEl.value || "name_asc") : "name_asc";

    const filteredRows = allRows.filter(function (r) {
      return normalizeName(getTeamName(r)).indexOf(q) !== -1;
    });

    const sortedRows = sortRows(filteredRows, sortKey);
    renderCards(sortedRows);

    if (selectedName) {
      selectTeamByName(sortedRows, selectedName);
    }
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
  applySearchAndSort(allRows);

  if (sideEl) {
    sideEl.textContent = "Click a team to see details.";
  }

  const initialHashTeam = getHashTeamName();
  if (initialHashTeam) {
    selectTeamByName(allRows, initialHashTeam);
  }

  window.addEventListener("hashchange", function () {
    const hashTeam = getHashTeamName();
    if (hashTeam) {
      selectTeamByName(allRows, hashTeam);
    }
  });

  if (searchEl) {
    searchEl.addEventListener("input", function () {
      applySearchAndSort(allRows);
    });
  }

  if (sortEl) {
    sortEl.addEventListener("change", function () {
      applySearchAndSort(allRows);
    });
  }
});
