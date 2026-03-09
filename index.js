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

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
  }

  function normalize(s) {
    return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
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
    const pts = asNum(pickFirst(r, ["pts", "PTS", "points", "Points"]));
    const era = asNum(pickFirst(r, ["era", "ERA"]));
    return { w: w, l: l, pts: pts, era: era };
  }

  function buildColumns(rows) {
    const haveW = rows.some(function (r) { return computeDerived(r).w !== null; });
    const haveL = rows.some(function (r) { return computeDerived(r).l !== null; });
    const havePts = rows.some(function (r) { return computeDerived(r).pts !== null; });
    const haveEra = rows.some(function (r) { return computeDerived(r).era !== null; });

    const cols = [{ key: "team", label: "Team" }];
    if (haveW) cols.push({ key: "w", label: "W" });
    if (haveL) cols.push({ key: "l", label: "L" });
    if (havePts) cols.push({ key: "pts", label: "PTS" });
    if (haveEra) cols.push({ key: "era", label: "ERA" });
    return cols;
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

  function populateSort(cols) {
    if (!sortEl) return;

    sortEl.innerHTML = "";

    function addOpt(val, txt) {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = txt;
      sortEl.appendChild(opt);
    }

    addOpt("team_asc", "Team name (A-Z)");
    addOpt("team_desc", "Team name (Z-A)");

    const colKeys = cols.map(function (c) { return c.key; });

    if (colKeys.indexOf("w") !== -1) addOpt("w_desc", "Wins (high)");
    if (colKeys.indexOf("pts") !== -1) addOpt("pts_desc", "Points (high)");
    if (colKeys.indexOf("era") !== -1) addOpt("era_asc", "ERA (low)");

    sortEl.value = "team_asc";
  }

  function sortRows(rows, sortKey) {
    const out = rows.slice(0);

    function cmpStr(a, b) {
      return normalize(a).localeCompare(normalize(b));
    }

    out.sort(function (ra, rb) {
      const aName = getTeamName(ra);
      const bName = getTeamName(rb);

      if (sortKey === "team_desc") return -cmpStr(aName, bName);
      if (sortKey === "team_asc") return cmpStr(aName, bName);

      const da = computeDerived(ra);
      const db = computeDerived(rb);

      if (sortKey === "w_desc") return (db.w || -1) - (da.w || -1);
      if (sortKey === "pts_desc") return (db.pts || -1) - (da.pts || -1);
      if (sortKey === "era_asc") return (da.era || 1e18) - (db.era || 1e18);

      return cmpStr(aName, bName);
    });

    return out;
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
          const val = Object.prototype.hasOwnProperty.call(d, c.key) ? d[c.key] : null;
          td.textContent = (val === null || val === undefined) ? "" : String(val);
          td.className = "num";
        }

        tr.appendChild(td);
      });

      tr.addEventListener("click", function () {
        window.location.href = "./cards.html#" + encodeURIComponent(teamName);
      });

      tbodyEl.appendChild(tr);
    });

    if (countEl) countEl.textContent = String(rows.length);
  }

  setState("Loading...");

  const jsonUrl = "./live_team_stats.json";
  console.log("Fetching: " + jsonUrl);

  let resp;
  try {
    resp = await fetch(jsonUrl, { cache: "no-store" });
  } catch (err) {
    setState("Fetch failed (are you on file:// ?)");
    if (tbodyEl) tbodyEl.innerHTML = "<tr><td>Fetch error: " + String(err) + "</td></tr>";
    return;
  }

  if (!resp.ok) {
    setState("HTTP " + String(resp.status));
    if (tbodyEl) tbodyEl.innerHTML = "<tr><td>Fetch failed: " + jsonUrl + " HTTP " + String(resp.status) + "</td></tr>";
    return;
  }

  let payload;
  try {
    payload = await resp.json();
  } catch (err) {
    setState("Bad JSON");
    if (tbodyEl) tbodyEl.innerHTML = "<tr><td>JSON parse error: " + String(err) + "</td></tr>";
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
  populateSort(cols);

  function applySearchAndSort() {
    const q = searchEl ? normalize(searchEl.value) : "";
    const sortKey = sortEl ? String(sortEl.value || "team_asc") : "team_asc";

    const filtered = allRows.filter(function (r) {
      return normalize(getTeamName(r)).indexOf(q) !== -1;
    });

    const sorted = sortRows(filtered, sortKey);
    renderBody(sorted, cols);
  }

  applySearchAndSort();

  if (searchEl) searchEl.addEventListener("input", applySearchAndSort);
  if (sortEl) sortEl.addEventListener("change", applySearchAndSort);
});
