console.log("index.js DEPLOY CHECK v6");

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

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
  }

  function inferLastGenerated(payload, rows) {
    const top = pickFirst(payload, ["lastGenerated", "last_generated", "generatedAt", "generated_at"]);
    if (top) return top;
    if (rows && rows.length > 0) {
      const v = pickFirst(rows[0], ["lastGenerated", "last_generated", "generatedAt", "generated_at"]);
      if (v) return v;
    }
    return "";
  }

  function buildCols(rows) {
    const seen = {};
    const cols = [];

    cols.push({ key: "team", label: "Team", numeric: false });

    const sample = rows && rows.length ? rows[0] : null;
    if (!sample) return cols;

    Object.keys(sample).forEach(function (k) {
      const lk = String(k || "").toLowerCase();
      if (lk === "team" || lk === "name" || lk === "school") return;
      if (lk.indexOf("lastgenerated") !== -1) return;

      if (!seen[k]) {
        seen[k] = true;
        cols.push({ key: k, label: k, numeric: true });
      }
    });

    return cols;
  }

  function renderHeader(cols) {
    if (!theadEl) return;
    const tr = document.createElement("tr");

    cols.forEach(function (c) {
      const th = document.createElement("th");
      th.textContent = c.label;
      if (c.numeric) th.className = "num";
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

      cols.forEach(function (c) {
        const td = document.createElement("td");

        if (c.key === "team") {
          td.textContent = getTeamName(r);
        } else {
          const v = pickFirst(r, [c.key, c.key.toUpperCase()]);
          td.textContent = (v === null || v === undefined) ? "" : String(v);

          const n = asNum(v);
          if (n !== null) td.className = "num";
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

  function populateSortOptions(cols) {
    if (!sortEl) return;

    sortEl.innerHTML = "";

    const opts = [];
    opts.push({ value: "team_asc", label: "Team (A-Z)" });

    cols.forEach(function (c) {
      if (c.key === "team") return;
      opts.push({ value: c.key + "_desc", label: c.label + " (high-low)" });
    });

    opts.forEach(function (o) {
      const opt = document.createElement("option");
      opt.value = o.value;
      opt.textContent = o.label;
      sortEl.appendChild(opt);
    });
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

    const parts = String(sortKey || "").split("_");
    const key = parts[0];
    const dir = parts.length > 1 ? parts[1] : "desc";

    tmp.sort(function (a, b) {
      const av = asNum(pickFirst(a, [key, key.toUpperCase()]));
      const bv = asNum(pickFirst(b, [key, key.toUpperCase()]));

      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;

      return dir === "asc" ? (av - bv) : (bv - av);
    });

    return tmp;
  }

  function apply(rows, cols) {
    const q = searchEl ? normalize(searchEl.value) : "";
    const sortKey = sortEl ? String(sortEl.value || "team_asc") : "team_asc";

    const filtered = rows.filter(function (r) {
      return normalize(getTeamName(r)).indexOf(q) !== -1;
    });

    const sorted = sortRows(filtered, sortKey);
    renderBody(sorted, cols);
  }

  if (!theadEl || !tbodyEl) {
    setState("Missing table IDs");
    console.log("theadEl", theadEl);
    console.log("tbodyEl", tbodyEl);
    return;
  }

  setState("Fetching…");

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
    lastGenEl.textContent = String(inferLastGenerated(payload, allRows) || "");
  }

  const cols = buildCols(allRows);
  renderHeader(cols);
  populateSortOptions(cols);
  apply(allRows, cols);

  if (searchEl) {
    searchEl.addEventListener("input", function () { apply(allRows, cols); });
  }

  if (sortEl) {
    sortEl.addEventListener("change", function () { apply(allRows, cols); });
  }
});
