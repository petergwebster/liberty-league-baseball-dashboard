function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setPill(text, cls) {
  const el = qs("state");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("ok");
  el.classList.remove("bad");
  if (cls) el.classList.add(cls);
}

function normalizeRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

async function loadTeams() {
  const resp = await fetch("./live_team_stats.json", { cache: "no-store" });
  if (!resp.ok) throw new Error("Fetch live_team_stats.json failed (HTTP " + resp.status + ")");
  return await resp.json();
}

function render(rows) {
  const gridEl = qs("grid");
  const sideEl = qs("side");
  const countEl = qs("count");
  if (!gridEl) return;

  gridEl.innerHTML = "";
  if (countEl) countEl.textContent = String(rows.length) + " teams";

  rows.forEach(function (r) {
    const teamName = r && (r.team || r.Team || r.school || r.name) ? String(r.team || r.Team || r.school || r.name) : "Unknown";

    const w = r && r.wins != null ? r.wins : "";
    const l = r && r.losses != null ? r.losses : "";
    const era = r && r.era != null ? r.era : "";
    const so = r && r.so != null ? r.so : "";
    const bb = r && r.bb != null ? r.bb : "";
    const ip = r && r.ip != null ? r.ip : "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      "<div class='title'>" + escapeHtml(teamName) + "</div>" +
      "<div class='sub'>W " + escapeHtml(w) + " | L " + escapeHtml(l) + " | ERA " + escapeHtml(era) + "</div>" +
      "<div class='row4'>" +
        "<div class='kpi'><div class='lab'>SO</div><div class='val'>" + escapeHtml(so) + "</div></div>" +
        "<div class='kpi'><div class='lab'>BB</div><div class='val'>" + escapeHtml(bb) + "</div></div>" +
        "<div class='kpi'><div class='lab'>IP</div><div class='val'>" + escapeHtml(ip) + "</div></div>" +
        "<div class='kpi'><div class='lab'>ERA</div><div class='val'>" + escapeHtml(era) + "</div></div>" +
      "</div>";

    card.addEventListener("click", function () {
      if (!sideEl) return;
      sideEl.innerHTML =
        "<div class='title'>" + escapeHtml(teamName) + "</div>" +
        "<div class='sub'>Raw row</div>" +
        "
