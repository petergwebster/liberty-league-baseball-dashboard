console.log("index.js DEPLOY CHECK v2 (diagnostic + table)");

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

  function safeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  function derivedRow(r) {
    const w = asNum(pickFirst(r, ["w", "W", "wins", "Wins"]));
    const l = asNum(pickFirst(r, ["l", "L", "losses", "Losses"]));
    const t = asNum(pickFirst(r, ["t", "T", "ties", "Ties", "draws", "Draws"]));
    const pts = asNum(pickFirst(r, ["pts", "PTS", "points", "Points"]));
    const gf = asNum(pickFirst(r, ["gf", "GF"]));
    const ga = asNum(pickFirst(r, ["ga", "GA"]));
    const gd = computeGD(r);
    const era = asNum(pickFirst(r, ["era", "ERA"]));

    return {
      team: getTeamName(r),
      w: w,
      l: l,
      t: t,
      pts: pts,
      gf: gf,
      ga: ga,
      gd: gd,
      era: era
    };
  }

  function buildColumns(rows) {
    const anyT = rows.some(function (r) { return derivedRow(r).t !== null; });
    const anyPts = rows.some(function (r) { return derivedRow(r).pts !== null; });
    const anyGF = rows.some(function (r) { return derivedRow(r).gf !== null; });
    const anyGA = rows.some(function (r) { return derivedRow(r).ga !== null; });
    const anyGD = rows.some(function (r) { return derivedRow(r).gd !== null; });
    const anyERA = rows.some(function (r) { return derivedRow(r).era !== null; });

    const cols = [];
    cols.push({ key: "team", label: "Team" });
    cols.push({ key: "w", label: "W" });
    cols.push({ key: "l", label: "L" });
    if (anyT) cols.push({ key: "t", label: "T" });
    if (anyPts) cols.push({ key: "pts", label: "PTS" });
    if (anyGF) cols.push({ key: "gf", label: "GF" });
    if (anyGA) cols.push({ key: "ga", label: "GA" });
    if (anyGD) cols.push({ key: "gd", label: "GD" });
    if (anyERA) cols.push({ key: "era", label: "ERA" });

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

    const opts = [
      { value: "team_asc", label: "Team name (A–Z)" },
      { value: "team_desc", label: "Team name (Z–A)" },
      { value: "w_desc", label: "Wins (high → low)" },
      { value: "l_asc", label: "Losses (low → high)" }
    ];

    const hasPts = cols.some(function (c) { return c.key === "pts"; });
    const hasGD = cols.some(function (c) { return c.key === "gd"; });
    const hasERA = cols.some(function (c) { return c.key === "era"; });

    if (hasPts) opts.push({ value: "pts_desc", label: "Points (high → low)" });
    if (hasGD) opts.push({ value: "gd_desc", label: "Goal diff (high → low)" });
    if (hasERA) opts.push({ value: "era_asc", label: "ERA (low → high)" });

    opts.forEach(function (o) {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      sortEl.appendChild(opt);
    });

    sortEl.value = "team_asc";
  }

  function sortRows(rows, sortKey) {
    const rowsCopy = rows.slice(0);

    function cmpStr(a, b) {
      return String(a).localeCompare(String(b));
    }

    function cmpNum(a, b, dir) {
      const aa = (a === null || a === undefined) ? -Infinity : Number(a);
      const bb = (b === null || b === undefined) ? -Infinity : Number(b);
      if (dir === "asc") return aa - bb;
      return bb - aa;
    }

    rowsCopy.sort(function (ra, rb) {
      const a = derivedRow(ra);
      const b = derivedRow(rb);

      if (sortKey === "team_asc") return cmpStr(a.team, b.team);
      if (sortKey === "team_desc") return cmpStr(b.team, a.team);
      if (sortKey === "w_desc") return cmpNum(a.w, b.w, "desc");
      if (sortKey === "l_asc") return cmpNum(a.l, b.l, "asc");
      if (sortKey === "pts_desc") return cmpNum(a.pts, b.pts, "desc");
      if (sortKey === "gd_desc") return cmpNum(a.gd, b.gd, "desc");
      if (sortKey === "era_asc") {
        const aa = (a.era === null || a.era === undefined) ? Infinity : Number(a.era);
        const bb = (b.era === null || b.era === undefined) ? Infinity : Number(b.era);
        return aa - bb;
      }
      return cmpStr(a.team, b.team);
    });

    return rowsCopy;
  }

  function renderBody(rows, cols) {
    if (!tbodyEl) return;
    tbodyEl.innerHTML = "";

    rows.forEach(function (r) {
      const d = derivedRow(r);
      const tr = document.createElement("tr");

      cols.forEach(function (c) {
        const td = document.createElement("td");
        if (c.key === "team") {
          td.textContent = String(d.team);
          td.className = "team";
        } else {
          const v = d[c.key];
          td.textContent = (v === null || v === undefined) ? "" : String(v);
          td.className = "num";
        }
        tr.appendChild(td);
      });

      tr.addEventListener("click", function () {
        window.location.href = "./cards.html#" + encodeURIComponent(String(d.team));
      });

      tbodyEl.appendChild(tr);
    });

    if (countEl) countEl.textContent = String(rows.length);
  }

  setState("Loading...");

  const jsonUrl = "./live_team_stats.json";
  console.log("Fetching " + jsonUrl);

  let resp;
  try {
    resp = await fetch(jsonUrl, { cache: "no-store" });
  } catch (err) {
    setState("Fetch failed (check console)");
    if (tbodyEl) tbodyEl.innerHTML = "<tr><td>" + safeHtml(String(err)) + "</td></tr>";
    return;
  }

  if (!resp.ok) {
    setState("HTTP " + String(resp.status));
    if (tbodyEl) {
      tbodyEl.innerHTML = "<tr><td>Failed to load " + safeHtml(jsonUrl) + " HTTP " + safeHtml(String(resp.status)) + "</td></tr>";
    }
    return;
  }

  let payload;
  try {
    payload = await resp.json();
  } catch (err) {
    setState("Bad JSON");
    if (tbodyEl) tbodyEl.innerHTML = "<tr><td>" + safeHtml(String(err)) + "</td></tr>";
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
