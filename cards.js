console.log("cards.js DEPLOY CHECK v2");

document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const gridEl = document.getElementById("grid");
  const sideEl = document.getElementById("side");
  const countEl = document.getElementById("count");

  function setState(txt) {
    if (stateEl) stateEl.textContent = txt;
  }

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
  }

  function pickFirst(obj, keys) {
    for (let idx = 0; idx < keys.length; idx++) {
      const key = keys[idx];
      if (obj && Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== null && obj[key] !== undefined) return obj[key];
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

    sideEl.appendChild(tableEl);

    const preEl = document.createElement("pre");
    preEl.style.whiteSpace = "pre-wrap";
    preEl.style.marginTop = "12px";
    preEl.textContent = JSON.stringify(r, null, 2);
    sideEl.appendChild(preEl);
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
  setState("Loaded " + String(rows.length));
  if (countEl) countEl.textContent = String(rows.length);

  if (!gridEl) return;
  gridEl.innerHTML = "";

  rows.forEach(function (r) {
    const card = document.createElement("div");
    card.className = "card";
    card.textContent = String(getTeamName(r));
    card.addEventListener("click", function () {
      renderDetails(r);
    });
    gridEl.appendChild(card);
  });

  if (sideEl) {
    sideEl.textContent = "Click a team to see details.";
  }
});
