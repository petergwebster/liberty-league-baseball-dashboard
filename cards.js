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

function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v).replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeRows(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.rows)) return payload.rows;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

function getGeneratedAt(payload) {
  if (!payload) return "";
  if (payload.generated_at) return String(payload.generated_at);
  if (payload.generatedAt) return String(payload.generatedAt);
  if (payload.last_generated) return String(payload.last_generated);
  return "";
}

async function loadTeamsJson() {
  const resp = await fetch("./live_team_stats.json", { cache: "no-store" });
  if (!resp.ok) throw new Error("Failed to fetch live_team_stats.json (HTTP " + resp.status + ")");
  return await resp.json();
}

function percentileWithin(vals, v) {
  const num = toNum(v);
  if (num == null) return 0;

  const cleaned = vals
    .map(function (x) { return toNum(x); })
    .filter(function (x) { return x != null; })
    .sort(function (a, b) { return a - b; });

  if (!cleaned.length) return 0;

  let lo = 0;
  let hi = cleaned.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (cleaned[mid] <= num) lo = mid + 1;
    else hi = mid;
  }
  const rank = lo;
  return Math.round((rank / cleaned.length) * 100);
}

function makeBarRow(label, pct) {
  const row = document.createElement("div");
  row.className = "barRow";

  const left = document.createElement("div");
  left.className = "barLabel";
  left.textContent = label;

  const track = document.createElement("div");
  track.className = "barTrack";

  const fill = document.createElement("div");
  fill.className = "barFill";
  fill.style.width = String(Math.max(0, Math.min(100, pct))) + "%";

  track.appendChild(fill);
  row.appendChild(left);
  row.appendChild(track);
  return row;
}

function sortRows(rows, sortKey) {
  const copy = rows.slice();
  const asc = (sortKey === "era" || sortKey === "bb");
  copy.sort(function (a, b) {
    const av = toNum(a && (a[sortKey]));
    const bv = toNum(b && (b[sortKey]));
    const ax = av == null ? (asc ? 9e15 : -9e15) : av;
    const bx = bv == null ? (asc ? 9e15 : -9e15) : bv;
    if (ax === bx) return 0;
    if (asc) return ax < bx ? -1 : 1;
    return ax > bx ? -1 : 1;
  });
  return copy;
}

function renderCards(rows, dist) {
  const gridEl = qs("grid");
  const sideEl = qs("side");
  if (!gridEl) return;
  gridEl.innerHTML = "";

  const eraVals = dist.era || [];
  const soVals = dist.so || [];
  const bbVals = dist.bb || [];
  const ipVals = dist.ip || [];

  rows.forEach(function (r) {
    const teamName = (r && (r.team || r.Team || r.school || r.name)) ? String(r.team || r.Team || r.school || r.name) : "(team)";

    const w = r && (r.wins != null ? r.wins : (r.w != null ? r.w : ""));
    const l = r && (r.losses != null ? r.losses : (r.l != null ? r.l : ""));
    const era = r && (r.era != null ? r.era : "");
    const ip = r && (r.ip != null ? r.ip : "");
    const so = r && (r.so != null ? r.so : "");
    const bb = r && (r.bb != null ? r.bb : "");

    const eraPct = 100 - percentileWithin(eraVals, era);
    const soPct = percentileWithin(soVals, so);
    const bbPct = 100 - percentileWithin(bbVals, bb);
    const ipPct = percentileWithin(ipVals, ip);

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

    const bars = document.createElement("div");
    bars.className = "bars";
    bars.appendChild(makeBarRow("ERA", eraPct));
    bars.appendChild(makeBarRow("SO", soPct));
    bars.appendChild(makeBarRow("BB", bbPct));
    bars.appendChild(makeBarRow("IP", ipPct));
    card.appendChild(bars);

    card.addEventListener("click", function () {
      if (!sideEl) return;
      sideEl.innerHTML =
        "<div class='title'>" + escapeHtml(teamName) + "</div>" +
        "<div class='sub'>Raw row</div>" +
        "
