// Drill-down single-page app using hash routing, no framework.

const TEAM_URL = "./live_team_stats.json";
const PLAYERS_URL = "./live_players.json"; // optional; page will show a message if missing

function htmEscape(strVal) {
  return String(strVal || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setState(text, isError) {
  const stateEl = document.getElementById("state");
  if (!stateEl) return;
  stateEl.textContent = text;
  stateEl.style.background = isError ? "#ffe5e5" : "#e8f5e9";
  stateEl.style.border = "1px solid " + (isError ? "#ffb3b3" : "#b7e1bc");
  stateEl.style.padding = "2px 8px";
  stateEl.style.borderRadius = "999px";
  stateEl.style.display = "inline-block";
}

function setLastGenerated(textVal) {
  const lastGenEl = document.getElementById("lastGenerated");
  if (lastGenEl) lastGenEl.textContent = textVal || "";
}

function showMessage(msg) {
  const tableWrapEl = document.getElementById("tableWrap");
  if (!tableWrapEl) return;
  tableWrapEl.innerHTML = "";
  const preEl = document.createElement("pre");
  preEl.style.whiteSpace = "pre-wrap";
  preEl.style.padding = "10px";
  preEl.style.border = "1px solid #ddd";
  preEl.style.borderRadius = "8px";
  preEl.textContent = msg;
  tableWrapEl.appendChild(preEl);
}

function parseRoute() {
  const raw = (window.location.hash || "#/").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);

  if (parts.length === 0) return { name: "teams" };
  if (parts[0] === "team" && parts[1]) {
    return { name: "team", teamName: decodeURIComponent(parts.slice(1).join("/")) };
  }
  if (parts[0] === "players") return { name: "players" };
  if (parts[0] === "player" && parts[1]) {
    return { name: "player", playerName: decodeURIComponent(parts.slice(1).join("/")) };
  }
  return { name: "teams" };
}

async function fetchJson(urlVal) {
  const resp = await fetch(urlVal, { cache: "no-store" });
  if (!resp.ok) throw new Error("Failed to fetch " + urlVal + " (HTTP " + resp.status + ")");
  return await resp.json();
}

function renderNav() {
  const tableWrapEl = document.getElementById("tableWrap");
  if (!tableWrapEl) return;

  const navEl = document.createElement("div");
  navEl.style.marginTop = "6px";
  navEl.style.marginBottom = "10px";
  navEl.innerHTML =
    "<a href=\"#/\">Teams</a> | " +
    "<a href=\"#/players\">Players</a>";

  tableWrapEl.appendChild(navEl);
}

function renderTable(rows, opts) {
  const tableWrapEl = document.getElementById("tableWrap");
  if (!tableWrapEl) return;

  const options = opts || {};
  const linkKey = options.linkKey || null;
  const linkPrefix = options.linkPrefix || "#/";
  const preferredOrder = options.preferredOrder || ["team", "wins", "losses", "w-l", "era", "ip", "h", "r", "er", "bb", "so"];

  if (!rows || rows.length === 0) {
    showMessage("No rows yet");
    return;
  }

  const colSet = new Set();
  rows.forEach((r) => {
    if (r && typeof r === "object") {
      Object.keys(r).forEach((k) => colSet.add(k));
    }
  });

  const allCols = Array.from(colSet);
  const cols = [];
  preferredOrder.forEach((k) => {
    if (colSet.has(k)) cols.push(k);
  });
  allCols.forEach((k) => {
    if (!cols.includes(k)) cols.push(k);
  });

  const tableEl = document.createElement("table");
  tableEl.style.width = "100%";
  tableEl.style.borderCollapse = "collapse";
  tableEl.style.marginTop = "12px";

  const theadEl = document.createElement("thead");
  const headRowEl = document.createElement("tr");
  cols.forEach((c) => {
    const thEl = document.createElement("th");
    thEl.textContent = c;
    thEl.style.textAlign = "left";
    thEl.style.padding = "8px";
    thEl.style.borderBottom = "2px solid #ddd";
    thEl.style.fontSize = "14px";
    headRowEl.appendChild(thEl);
  });
  theadEl.appendChild(headRowEl);
  tableEl.appendChild(theadEl);

  const tbodyEl = document.createElement("tbody");
  rows.forEach((r) => {
    const trEl = document.createElement("tr");
    cols.forEach((c) => {
      const tdEl = document.createElement("td");
      const val = r && Object.prototype.hasOwnProperty.call(r, c) ? r[c] : "";

      tdEl.style.padding = "8px";
      tdEl.style.borderBottom = "1px solid #eee";
      tdEl.style.verticalAlign = "top";

      if (linkKey && c === linkKey) {
        const aEl = document.createElement("a");
        aEl.href = linkPrefix + encodeURIComponent(String(val || ""));
        aEl.textContent = val === null || val === undefined ? "" : String(val);
        tdEl.appendChild(aEl);
      } else {
        tdEl.textContent = val === null || val === undefined ? "" : String(val);
      }

      trEl.appendChild(tdEl);
    });
    tbodyEl.appendChild(trEl);
  });
  tableEl.appendChild(tbodyEl);

  tableWrapEl.appendChild(tableEl);
}

function renderTeamDetail(teamName, teamRows) {
  const tableWrapEl = document.getElementById("tableWrap");
  if (!tableWrapEl) return;

  tableWrapEl.innerHTML = "";
  renderNav();

  const headerEl = document.createElement("div");
  headerEl.innerHTML =
    "<h2 style=\"margin: 8px 0;\">" + htmEscape(teamName) + "</h2>" +
    "<div style=\"margin-bottom: 8px;\"><a href=\"#/\">← Back to Teams</a></div>";
  tableWrapEl.appendChild(headerEl);

  const match = (teamRows || []).find(r => String(r.team || "") === String(teamName || ""));
  if (!match) {
    showMessage("Team not found: " + teamName);
    return;
  }

  const preEl = document.createElement("pre");
  preEl.style.whiteSpace = "pre-wrap";
  preEl.style.padding = "10px";
  preEl.style.border = "1px solid #ddd";
  preEl.style.borderRadius = "8px";
  preEl.textContent = JSON.stringify(match, null, 2);
  tableWrapEl.appendChild(preEl);
}

function renderTeamsPage(teamPayload) {
  const tableWrapEl = document.getElementById("tableWrap");
  if (!tableWrapEl) return;

  const rows = teamPayload && Array.isArray(teamPayload.rows) ? teamPayload.rows : [];

  tableWrapEl.innerHTML = "";
  renderNav();

  const titleEl = document.createElement("h2");
  titleEl.textContent = "Teams";
  titleEl.style.margin = "8px 0";
  tableWrapEl.appendChild(titleEl);

  renderTable(rows, {
    linkKey: "team",
    linkPrefix: "#/team/",
    preferredOrder: ["team", "wins", "losses", "w-l", "era", "g", "ip", "h", "r", "er", "bb", "so", "hr", "wp"]
  });
}

function renderPlayersPage(playersPayload) {
  const tableWrapEl = document.getElementById("tableWrap");
  if (!tableWrapEl) return;

  const rows = playersPayload && Array.isArray(playersPayload.rows) ? playersPayload.rows : [];

  tableWrapEl.innerHTML = "";
  renderNav();

  const titleEl = document.createElement("h2");
  titleEl.textContent = "Players";
  titleEl.style.margin = "8px 0";
  tableWrapEl.appendChild(titleEl);

  if (!playersPayload) {
    showMessage("No live_players.json yet. Add it to enable player drilldowns.");
    return;
  }

  renderTable(rows, {
    linkKey: "name",
    linkPrefix: "#/player/",
    preferredOrder: ["name", "team", "gp", "ab", "avg", "obp", "slg", "ops", "h", "r", "rbi", "hr", "bb", "so"]
  });
}

function renderPlayerDetail(playerName, playersPayload) {
  const tableWrapEl = document.getElementById("tableWrap");
  if (!tableWrapEl) return;

  tableWrapEl.innerHTML = "";
  renderNav();

  const headerEl = document.createElement("div");
  headerEl.innerHTML =
    "<h2 style=\"margin: 8px 0;\">" + htmEscape(playerName) + "</h2>" +
    "<div style=\"margin-bottom: 8px;\"><a href=\"#/players\">← Back to Players</a></div>";
  tableWrapEl.appendChild(headerEl);

  if (!playersPayload || !Array.isArray(playersPayload.rows)) {
    showMessage("No live_players.json yet.");
    return;
  }

  const match = playersPayload.rows.find(r => String(r.name || "") === String(playerName || ""));
  if (!match) {
    showMessage("Player not found: " + playerName);
    return;
  }

  const preEl = document.createElement("pre");
  preEl.style.whiteSpace = "pre-wrap";
  preEl.style.padding = "10px";
  preEl.style.border = "1px solid #ddd";
  preEl.style.borderRadius = "8px";
  preEl.textContent = JSON.stringify(match, null, 2);
  tableWrapEl.appendChild(preEl);
}

async function loadAndRender() {
  try {
    setState("Loading...", false);
    setLastGenerated("");

    const teamPayload = await fetchJson(TEAM_URL);
    const generatedAt = teamPayload && teamPayload.generated_at ? teamPayload.generated_at : "(unknown)";
    setLastGenerated(generatedAt);

    let playersPayload = null;
    try {
      playersPayload = await fetchJson(PLAYERS_URL);
    } catch (e) {
      playersPayload = null;
    }

    function render() {
      const route = parseRoute();
      if (route.name === "team") {
        setState("Loaded teams", false);
        renderTeamDetail(route.teamName, teamPayload.rows || []);
        return;
      }
      if (route.name === "players") {
        setState("Loaded players", false);
        renderPlayersPage(playersPayload);
        return;
      }
      if (route.name === "player") {
        setState("Loaded players", false);
        renderPlayerDetail(route.playerName, playersPayload);
        return;
      }
      setState("Loaded teams", false);
      renderTeamsPage(teamPayload);
    }

    window.addEventListener("hashchange", render);
    render();

  } catch (e) {
    setState("Failed", true);
    setLastGenerated("(error)");
    showMessage(String(e));
  }
}

document.addEventListener("DOMContentLoaded", loadAndRender);
