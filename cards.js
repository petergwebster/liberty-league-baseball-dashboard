// --- helpers ---

function $(id) {
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

function setStatus(text, cls) {
  const pill = $("state");
  if (!pill) return;
  pill.textContent = text;
  pill.classList.remove("ok", "bad");
  if (cls) pill.classList.add(cls);
}

function toNum(v) {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

function percentile(arr, value) {
  const n = toNum(value);
  if (n == null) return 0;
  const clean = arr
    .map(toNum)
    .filter(function (x) { return x != null; })
    .sort(function (a, b) { return a - b; });
  if (!clean.length) return 0;
  let lo = 0, hi = clean.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (clean[mid] <= n) lo = mid + 1;
    else hi = mid;
  }
  return Math.round((lo / clean.length) * 100);
}

function barRow(label, pct) {
  const row = document.createElement("div");
  row.className = "barRow";

  const lab = document.createElement("div");
  lab.className = "barLabel";
  lab.textContent = label;

  const track = document.createElement("div");
  track.className = "barTrack";

  const fill = document.createElement("div");
  fill.className = "barFill";
  fill.style.width = Math.max(0, Math.min(100, pct)) + "%";

  track.appendChild(fill);
  row.appendChild(lab);
  row.appendChild(track);
  return row;
}

// --- core ---

async function loadData() {
  const resp = await fetch("./live_team_stats.json", { cache: "no-store" });
  if (!resp.ok) {
    throw new Error("Failed to fetch live_team_stats.json (HTTP " + resp.status + ")");
  }
  return await resp.json();
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
  return (
    payload.generated_at ||
    payload.generatedAt ||
    payload.last_generated ||
    ""
  );
}

function sortRows(rows, key) {
  const copy = rows.slice();
  copy.sort(function (a, b) {
    function g(r, k) {
      if (!r) return null;
      switch (k) {
        case "era": return toNum(r.era);
        case "so":  return toNum(r.so);
        case "bb":  return toNum(r.bb);
        case "ip":  return toNum(r.ip);
        case "w":   return toNum(r.wins || r.W);
        default:    return null;
      }
    }
    const av = g(a, key);
    const bv = g(b, key);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    // sort directions
    if (key === "era" || key === "bb") {
      // lower is better
      return av - bv;
    } else {
      // higher is better
      return bv - av;
    }
  });
  return copy;
}

function renderCards(rows, dists) {
  const grid = $("grid");
  const side = $("side");
  if (!grid) return;
  grid.innerHTML = "";

  rows.forEach(function (r) {
    const name =
      (r && (r.team || r.Team || r.school || r.name)) || "Unknown team";

    const era = toNum(r.era);
    const so  = toNum(r.so);
    const bb  = toNum(r.bb);
    const ip  = toNum(r.ip);
    const w   = r.wins != null ? r.wins : "";
    const l   = r.losses != null ? r.losses : "";

    const eraPct = era != null ? 100 - percentile(dists.era, era) : 0;
    const soPct  = percentile(dists.so, so);
    const bbPct  = bb != null ? 100 - percentile(dists.bb, bb) : 0;
    const ipPct  = percentile(dists.ip, ip);

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML =
      "<div class='title'>" + escapeHtml(name) + "</div>" +
      "<div class='sub'>W " + escapeHtml(w) + " | L " + escapeHtml(l) +
      (era != null ? " | ERA " + escapeHtml(era) : "") + "</div>" +
      "<div class='row4'>" +
        "<div class='kpi'><div class='lab'>SO</div><div class='val'>" + escapeHtml(so) + "</div></div>" +
        "<div class='kpi'><div class='lab'>BB</div><div class='val'>" + escapeHtml(bb) + "</div></div>" +
        "<div class='kpi'><div
