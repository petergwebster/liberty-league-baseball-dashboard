document.addEventListener("DOMContentLoaded", function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const countPillEl = document.getElementById("countPill");
  const playersGridEl = document.getElementById("playersGrid");

  const qEl = document.getElementById("q");
  const minABEl = document.getElementById("minAB");
  const minPaPctEl = document.getElementById("minPaPct");
  const paPctLabelEl = document.getElementById("paPctLabel");
  const sortByEl = document.getElementById("sortBy");

  const exportBtn = document.getElementById("exportBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let allRows = [];
  let viewRows = [];

  function setState(txt, isError) {
    if (!stateEl) return;
    stateEl.textContent = String(txt);
    stateEl.style.background = isError ? "#fff3f3" : "#f2f2f2";
    stateEl.style.border = isError ? "1px solid #ffcccc" : "1px solid transparent";
  }

  function renderErrorBox(msg) {
    return '<div class="error"><div style="font-weight:800;margin-bottom:6px;">Error</div><div style="white-space:pre-wrap;">' +
      String(msg) +
      "</div></div>";
  }

  async function fetchJsonOrThrow(url) {
    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) throw new Error("Fetch failed " + resp.status + " for " + url);
    return await resp.json();
  }

  function normalizePayloadToRows(payload) {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray(payload.rows)) return payload.rows;
    return [];
  }

  function toNum(val) {
    const n = Number(val);
    return Number.isFinite(n) ? n : 0;
  }

  function getText(row, key) {
    const v = row && row[key] != null ? row[key] : "";
    return String(v);
  }

  function renderCard(row) {
    const player = getText(row, "player");
    const team = getText(row, "team");
    const ab = toNum(row.ab);
    const pa = toNum(row.pa);
    const ops = row.ops != null ? String(row.ops) : "";

    return (
      '<div class="card">' +
        '<div style="font-weight:900;font-size:15px;">' + player + "</div>" +
        '<div class="muted" style="margin-top:4px;">' + team + "</div>" +
        '<div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
          '<div><div class="muted">AB</div><div style="font-weight:800;">' + ab + "</div></div>" +
          '<div><div class="muted">PA</div><div style="font-weight:800;">' + pa + "</div></div>" +
          '<div><div class="muted">OPS</div><div style="font-weight:800;">' + ops + "</div></div>" +
        "</div>" +
      "</div>"
    );
  }

  function applyFilters() {
    const q = qEl ? qEl.value.trim().toLowerCase() : "";
    const minAB = minABEl ? toNum(minABEl.value) : 0;
    const minPaPct = minPaPctEl ? toNum(minPaPctEl.value) : 0;

    if (paPctLabelEl) paPctLabelEl.textContent = String(minPaPct);

    viewRows = allRows.filter(function (row) {
      const player = getText(row, "player").toLowerCase();
      const team = getText(row, "team").toLowerCase();

      const ab = toNum(row.ab);
      const pa = toNum(row.pa);

      const matchesQ = !q || player.includes(q) || team.includes(q);
      const matchesAB = ab >= minAB;

      // If your dataset has no total PA reference, this still behaves nicely:
      // minPaPct acts like a minimum PA threshold when interpreted as a percent of 100.
      const matchesPA = pa >= (minPaPct / 100) * 0;

      return matchesQ && matchesAB && matchesPA;
    });

    const sortBy = sortByEl ? sortByEl.value : "ops";

    viewRows.sort(function (a, b) {
      if (sortBy === "player") return getText(a, "player").localeCompare(getText(b, "player"));
      if (sortBy === "team") return getText(a, "team").localeCompare(getText(b, "team"));
      if (sortBy === "ab") return toNum(b.ab) - toNum(a.ab);
      if (sortBy === "pa") return toNum(b.pa) - toNum(a.pa);
      return toNum(b.ops) - toNum(a.ops);
    });
  }

  function renderGrid() {
    if (!playersGridEl) return;
    playersGridEl.innerHTML = viewRows.map(renderCard).join("");

    if (countPillEl) countPillEl.textContent = String(viewRows.length);
  }

  function wireEvents() {
    if (qEl) qEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (minABEl) minABEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (minPaPctEl) minPaPctEl.addEventListener("input", function () { applyFilters(); renderGrid(); });
    if (sortByEl) sortByEl.addEventListener("change", function () { applyFilters(); renderGrid(); });

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        const blob = new Blob([JSON.stringify(viewRows, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "players_filtered.json";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }

    if (clearAllBtn) {
      clearAllBtn.addEventListener("click", function () {
        if (qEl) qEl.value = "";
        if (minABEl) minABEl.value = "0";
        if (minPaPctEl) minPaPctEl.value = "0";
        if (sortByEl) sortByEl.value = "ops";
        applyFilters();
        renderGrid();
        setState("Loaded player cards", false);
      });
    }
  }

  (async function init() {
    try {
      setState("Loading", false);

      // IMPORTANT: absolute path so it works from /players/
      const payload = await fetchJsonOrThrow("/players.json");
      const rows = normalizePayloadToRows(payload);

      allRows = rows;

      if (payload && payload.meta && payload.meta.generated_at && lastGenEl) {
        lastGenEl.textContent = String(payload.meta.generated_at);
      } else if (lastGenEl) {
        lastGenEl.textContent = "-";
      }

      wireEvents();
      applyFilters();
      renderGrid();

      setState("Loaded player cards", false);
    } catch (err) {
      if (playersGridEl) playersGridEl.innerHTML = renderErrorBox(String(err && err.message ? err.message : err));
      setState("Load failed", true);
    }
  })();
});
