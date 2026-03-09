console.log("index.js DEPLOY CHECK v5 (table render hardcheck)");

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

  function normalize(s) {
    return String(s || "").toLowerCase().trim().replace(/\s+/g, " ");
  }

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
  }

  function pickFirst(obj, keys) {
    for (let idx = 0; idx < keys.length; idx++) {
      const k = keys[idx];
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
    const direct = payload && (payload.generated_at || payload.generatedAt || payload.last_generated);
    if (direct) return direct;

    if (rows && rows.length > 0) {
      const r0 = rows[0];
      const fromRow = r0.generated_at || r0.generatedAt || r0.last_generated;
      if (fromRow) return fromRow;
    }

    return "";
  }

  function buildCols(rows) {
    const candidates = [
      { key: "team", label: "Team" },
      { key: "w", label: "W" },
      { key: "l", label: "L" },
      { key: "pts", label: "PTS" },
      { key: "gf", label: "GF" },
      { key: "ga", label: "GA" }
    ];

    if (!rows || rows.length === 0) return candidates;

    const sample = rows[0];
    const out = [];
    for (let idx = 0; idx < candidates.length; idx++) {
      const c = candidates[idx];
      if (c.key === "team") {
        out.push(c);
      } else {
        const v = pickFirst(sample, [c.key, c.key.toUpperCase()]);
        if (v !== null && v !== undefined) out.push(c);
      }
    }
    return out;
  }

  function renderHeader(cols) {
    if (!theadEl) return;
    theadEl.innerHTML = "";

    const tr = document.createElement("tr");
    cols.forEach(function (c) {
      const th = document.createElement("th");
      th.textContent = c.label;
      if (c.key !== "team") th.className = "num";
      tr.appendChild(th);
    });

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
        if (c.key === "team") {
          td.textContent = getTeamName(r);
        } else {
          const v = pickFirst(r, [c.key, c.key.toUpperCase()]);
          td.textContent = (v === null || v === undefined) ? "" : String(v);
          td.className = "num";
        }
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

  function populateSort() {
    if (!sortEl) return;

    sortEl.innerHTML = "";
    const opts = [
      { v: "team_asc", t: "Team (A–Z)" },
      { v: "w_desc", t: "W (high–low)" },
      { v: "pts_desc", t: "PTS (high–low)" }
    ];

    opts.forEach(function (o) {
      const op = document.createElement("option");
      op.value = o.v;
      op.textContent = o.t;
      sortEl.appendChild(op);
    });

    sortEl.value = "team_asc";
  }

  function sortRows(rows, sortKey) {
    const tmp = rows.slice(0);

    if (sortKey === "w_desc") {
      tmp.sort(function (a, b) {
        const aw = asNum(pickFirst(a, ["w", "W", "wins", "Wins"])) || 0;
        const bw = asNum(pickFirst(b, ["w", "W", "wins", "Wins"])) || 0;
        return bw - aw;
      });
      return tmp;
    }

    if (sortKey === "pts_desc") {
      tmp.sort(function (a, b) {
        const ap = asNum(pickFirst(a, ["pts", "PTS", "points", "Points"])) || 0;
        const bp = asNum(pickFirst(b, ["pts", "PTS", "points", "Points"])) || 0;
        return bp - ap;
      });
      return tmp;
    }

    tmp.sort(function (a, b) {
      const an = normalize(getTeamName(a));
      const bn = normalize(getTeamName(b));
      if (an < bn) return -1;
      if (an > bn) return 1;
      return 0;
    });
    return tmp;
  }

  function apply(allRows, cols) {
    const q = searchEl ? normalize(searchEl.value) : "";
    const sortKey = sortEl ? String(sortEl.value || "team_asc") : "team_asc";

    const filtered = allRows.filter(function (r) {
      return normalize(getTeamName(r)).indexOf(q) !== -1;
    });

    const sorted = sortRows(filtered, sortKey);
    renderBody(sorted, cols);
  }

  setState("Running…");

  if (!tbodyEl || !theadEl) {
    setState("Missing table IDs");
    console.log("theadEl", theadEl);
    console.log("tbodyEl", tbodyEl);
    return;
  }

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
  apply(allRows, cols);

  if (searchEl) searchEl.addEventListener("input", function () { apply(allRows, cols); });
  if (sortEl) sortEl.addEventListener("change", function () { apply(allRows, cols); });
});
