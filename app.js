// Simple drill-down stat dashboard using hash routes
// Routes:
//   #/                 Teams list
//   #/team/<teamName>  Team detail
//   #/players          Player list
//   #/player/<name>    Player detail
//
// Data files expected at site root:
//   /live_team_stats.json
//   /live_players.json   (optional but strongly recommended)

const state_obj = {
  teamData: null,
  playersData: null,
  loaded: false,
  sortKey: null,
  sortDir: "desc"
};

function qs(sel) {
  return document.querySelector(sel);
}

function htmEscape(str_val) {
  return (str_val || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadJson(url_val) {
  const resp = await fetch(url_val, { cache: "no-store" });
  if (!resp.ok) {
    throw new Error("Failed to fetch " + url_val + " status " + resp.status);
  }
  return await resp.json();
}

async function loadAllData() {
  const teamPromise = loadJson("live_team_stats.json");
  const playersPromise = loadJson("live_players.json").catch(() => null);

  const teamJson = await teamPromise;
  const playersJson = await playersPromise;

  state_obj.teamData = teamJson;
  state_obj.playersData = playersJson;
  state_obj.loaded = true;

  const updatedEl = qs("#lastUpdated");
  if (updatedEl && teamJson && teamJson.generated_at) {
    updatedEl.textContent = "Updated " + teamJson.generated_at;
  }
}

function parseRoute() {
  const hashVal = window.location.hash || "#/";
  const cleanVal = hashVal.replace(/^#/, "");
  const parts = cleanVal.split("/").filter(p => p.length > 0);

  if (parts.length === 0) {
    return { name: "teams" };
  }

  if (parts[0] === "team" && parts.length >= 2) {
    return { name: "team", teamName: decodeURIComponent(parts.slice(1).join("/")) };
  }

  if (parts[0] === "players") {
    return { name: "players" };
  }

  if (parts[0] === "player" && parts.length >= 2) {
    return { name: "player", playerName: decodeURIComponent(parts.slice(1).join("/")) };
  }

  return { name: "teams" };
}

function setSort(keyVal) {
  if (state_obj.sortKey === keyVal) {
    state_obj.sortDir = state_obj.sortDir === "asc" ? "desc" : "asc";
  } else {
    state_obj.sortKey = keyVal;
    state_obj.sortDir = "desc";
  }
  renderApp();
}

function sortRows(rowsArr) {
  const keyVal = state_obj.sortKey;
  if (!keyVal) return rowsArr;

  const dirMult = state_obj.sortDir === "asc" ? 1 : -1;

  const copyArr = rowsArr.slice();
  copyArr.sort((a, b) => {
    const av = a[keyVal];
    const bv = b[keyVal];

    const an = Number(av);
    const bn = Number(bv);

    const aIsNum = !Number.isNaN(an) && av !== "" && av !== null && av !== undefined;
    const bIsNum = !Number.isNaN(bn) && bv !== "" && bv !== null && bv !== undefined;

    if (aIsNum && bIsNum) {
      return (an - bn) * dirMult;
    }

    const as = String(av || "");
    const bs = String(bv || "");
    return as.localeCompare(bs) * dirMult;
  });

  return copyArr;
}

function renderTable(containerEl, rowsArr, columnsArr, rowLinkFn) {
  const sortKeyVal = state_obj.sortKey;
  const sortDirVal = state_obj.sortDir;

  const headerHtml = columnsArr.map(c => {
    const label = htmEscape(c.label);
    const sortMark = sortKeyVal === c.key ? (sortDirVal === "asc" ? " ▲" : " ▼") : "";
    return "<th data-key=\"" + htmEscape(c.key) + "\">" + label + sortMark + "</th>";
  }).join("");

  const bodyHtml = rowsArr.map(r => {
    const tds = columnsArr.map(c => {
      const rawVal = r[c.key];
      const shownVal = rawVal === undefined || rawVal === null ? "" : String(rawVal);
      const cellVal = htmEscape(shownVal);

      if (c.key === "team" && rowLinkFn) {
        const hrefVal = rowLinkFn(r);
        return "<td><a class=\"link\" href=\"" + htmEscape(hrefVal) + "\">" + cellVal + "</a></td>";
      }
      return "<td>" + cellVal + "</td>";
    }).join("");

    return "<tr>" + tds + "</tr>";
  }).join("");

  containerEl.innerHTML =
    "
