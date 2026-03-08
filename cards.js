console.log("cards.js version 1 functional");

document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const gridEl = document.getElementById("grid");
  const sideEl = document.getElementById("side");
  const countEl = document.getElementById("count");

  const searchEl = document.getElementById("search");
  const sortEl = document.getElementById("sort");

  function setState(txt, cls) {
    if (!stateEl) return;
    stateEl.textContent = txt;
    stateEl.classList.remove("ok");
    stateEl.classList.remove("bad");
    if (cls) stateEl.classList.add(cls);
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function getTeamName(r) {
    return r.team || r.Team || r.school || r.School || r.name || r.Name || "Unknown";
  }

  function asNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function pickFirst(obj, keys) {
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (obj && Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== null && obj[k] !== undefined) return obj[k];
    }
    return null;
  }

  function computeGoalDiff(r) {
    const gf = asNum(pickFirst(r, ["gf", "GF", "goals_for", "GoalsFor", "goalsFor"]));
    const ga = asNum(pickFirst(r, ["ga", "GA", "goals_against", "GoalsAgainst", "goalsAgainst"]));
    if (gf === null || ga === null) return null;
    return gf - ga;
  }

  function buildSortOptions(rows) {
    const options = [];
    options.push({ value: "name_asc", label: "Team name (A-Z)" });
    options.push({ value: "name_desc", label: "Team name (Z-A)" });

    function anyHas(keys) {
      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < keys.length; j++) {
          const v = pickFirst(rows[i], [keys[j]]);
          const n = asNum(v);
          if (n !== null) return true;
        }
      }
      return false;
    }

    const candidates = [
      { id: "pts", label: "Points", keys: ["pts", "PTS", "points", "Points"] },
      { id: "w", label: "Wins", keys: ["w", "W", "wins", "Wins"] },
      { id: "gp", label: "Games played", keys: ["gp", "GP", "games", "Games"] },
      { id: "gf", label: "Goals for", keys: ["gf", "GF", "goals_for", "GoalsFor"] },
      { id: "ga", label: "Goals against", keys: ["ga", "GA", "goals_against", "GoalsAgainst"] }
    ];

    candidates.forEach(function (c) {
      let present = false;
      for (let i = 0; i < c.keys.length; i++) {
        if (anyHas([c.keys[i]])) present = true;
      }
      if (present) options.push({ value: c.id + "_desc", label: c.label + " (high to low)" });
    });

    options.push({ value: "gd_desc", label: "Goal diff (high to low)" });
    return options;
  }

  function sortRows(rows, sortValue) {
    const cloned = rows.slice();

    function numFromRow(r, keyId) {
      if (keyId === "gd") {
        const gd = computeGoalDiff(r);
        return gd === null ? -Infinity : gd;
      }

      const map = {
        pts: ["pts", "PTS", "points", "Points"],
        w: ["w", "W", "wins", "Wins"],
        gp: ["gp", "GP", "games", "Games"],
        gf: ["gf", "GF", "goals_for", "GoalsFor"],
        ga: ["ga", "GA", "goals_against", "GoalsAgainst"]
      };

      const keys = map[keyId] || [];
      for (let i = 0; i < keys.length; i++) {
        const n = asNum(r[keys[i]]);
        if (n !== null) return n;
      }
      return -Infinity;
    }

    cloned.sort(function (a, b) {
      const nameA = getTeamName(a).toLowerCase();
      const nameB = getTeamName(b).toLowerCase();

      if (sortValue === "name_asc") return nameA.localeCompare(nameB);
      if (sortValue === "name_desc") return nameB.localeCompare(nameA);

      const parts = String(sortValue).split("_");
      const keyId = parts[0];
      const direction = parts[1] || "desc";

      const na = numFromRow(a, keyId);
      const nb = numFromRow(b, keyId);

      if (na !== nb) {
        return direction === "asc" ? (na - nb) : (nb - na);
      }

      return nameA.localeCompare(nameB);
    });

    return cloned;
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

    let html = "";
    html += "<div class='sideTitle'>" + esc(name) + "</div>";
    html += "<div class='sideSub'>Team summary</div>";

    html += "
