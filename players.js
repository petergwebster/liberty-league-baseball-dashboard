document.addEventListener("DOMContentLoaded", function () {
  const stateEl = document.getElementById("state");
  const lastGeneratedEl = document.getElementById("lastGenerated");
  const countPillEl = document.getElementById("countPill");
  const playersGridEl = document.getElementById("playersGrid");

  const qEl = document.getElementById("q");
  const minABEl = document.getElementById("minAB");
  const minPaPctEl = document.getElementById("minPaPct");
  const paPctLabelEl = document.getElementById("paPctLabel");
  const sortByEl = document.getElementById("sortBy");

  const exportBtn = document.getElementById("exportBtn");
  const clearPinsBtn = document.getElementById("clearPinsBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let allRows = [];
  let viewRows = [];
  let pinned = new Set();

  function setState(txt, isError) {
    if (!stateEl) return;
    stateEl.textContent = txt;
    stateEl.style.background = isError ? "#7f1d1d" : "#111827";
    stateEl.style.color = isError ? "#fee2e2" : "#e5e7eb";
    stateEl.style.border = "1px solid " + (isError ? "#fca5a5" : "#111827");
  }

  function renderErrorBox(msg) {
    return '<div class="error">Error: ' + String(msg) + "</div>";
  }

  function toNum(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function fmtOps(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return "-";
    return n.toFixed(3);
  }

  function pctStrFromFraction(frac) {
    const n = Number(frac);
    if (!Number.isFinite(n)) return "-";
    return (n * 100).toFixed(0) + "%";
  }

  async function fetchJsonOrThrow(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("Fetch failed " + url + " (" + res.status + ")");
    return await res.json();
  }

  function normalizePayloadToRows(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (payload.rows && Array.isArray(payload.rows)) return payload.rows;
    return [];
  }

  function getId(row, idx) {
    if (row && row.id != null) return String(row.id);
    if (row && row.player && row.team) return String(row.player) + " :: " + String(row.team);
    return "row-" + String(idx);
  }

  function rowMatchesQuery(row, q) {
    if (!q) return true;
    const hay = (
      String(row.player || row.name || "") +
      " " +
      String(row.team || "") +
      " " +
      String(row.pos || row.position || "")
    ).toLowerCase();
    return hay.indexOf(q) >= 0;
  }

  function sortRows(rows, sortBy) {
    const copy = rows.slice();
    copy.sort(function (a, b) {
      if (sortBy === "name") return String(a.player || a.name || "").localeCompare(String(b.player || b.name || ""));
      if (sortBy === "team") return String(a.team || "").localeCompare(String(b.team || ""));
      if (sortBy === "ab") return toNum(b.ab) - toNum(a.ab);
      if (sortBy === "pa") return toNum(b.pa) - toNum(a.pa);
      return toNum(b.ops) - toNum(a.ops);
    });
    return copy;
  }

  function applyFilters() {
    const q = qEl ? qEl.value.trim().toLowerCase() : "";
    const minAB = minABEl ? toNum(minABEl.value) : 0;
    const minPaPct = minPaPctEl ? toNum(minPaPctEl.value) : 0;
    const sortBy = sortByEl ? sortByEl.value : "ops";

    if (paPctLabelEl) paPctLabelEl.textContent = String(minPaPct) + "%";

    let rows = allRows.filter(function (row) {
      if (!rowMatchesQuery(row, q)) return false;

      if (toNum(row.ab) < minAB) return false;

      const frac = row.pa_pct;
      const pct = Number.isFinite(Number(frac)) ? Number(frac) * 100 : 0;
      if (pct < minPaPct) return false;

      return true;
    });

    rows = sortRows(rows, sortBy);
    viewRows = rows;
  }

  function renderCard(row) {
    const id = row.id;
    const isPinned = pinned.has(id);

    const name = row.player || row.name || "(no name)";
    const team = row.team || "-";

    const ab = toNum(row.ab);
    const pa = toNum(row.pa);
    const ops = fmtOps(row.ops);
    const paPct = pctStrFromFraction(row.pa_pct);

    const btnClass = isPinned ? "btn-pin pinned" : "btn-pin";
    const btnText = isPinned ? "Unpin" : "Pin";

    return (
      '<article class="card">' +
        '<div class="card-head">' +
          '<div>' +
            '<div class="card-name">' + String(name) + "</div>" +
            '<div class="card-sub">' + String(team) + "</div>" +
          "</div>" +
          '<button class="' + btnClass + '" data-action="pin" data-id="' + String(id) + '">' + btnText + "</button>" +
        "</div>" +
        '<div class="card-body">' +
          '<div class="metric"><span class="label">AB</span><span class="value">' + String(ab) + "</span></div>" +
          '<div class="metric"><span class="label">PA</span><span class="value">' + String(pa) + "</span></div>" +
          '<div class="metric"><span class="label">PA %</span><span class="value">' + String(paPct) + "</span></div>" +
          '<div class="metric"><span class="label">OPS</span><span class="value">' + String(ops) + "</span></div>" +
        "</div>" +
      "</article>"
    );
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

    document.addEventListener("click", function (evt) {
      const t = evt.target;
      if (!t || !t.matches) return;
      if (!t.matches('button[data-action="pin"]')) return;

      const id = t.getAttribute("data-id");
      if (!id) return;

      if (pinned.has(id)) pinned.delete(id);
      else pinned.add(id);

      renderGrid();
    });

    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        const cols = ["player", "team", "ab", "pa", "pa_pct", "ops"];
        const lines = [];
        lines.push(cols.join(","));

        viewRows.forEach(function (row) {
          const vals = cols.map(function (c) {
            const raw = row[c] == null ? "" : String(row[c]);
            const safe = '"' + raw.replace(/"/g, '""') + '"';
            return safe;
          });
          lines.push(vals.join(","));
        });

        const csv = lines.join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "players_filtered.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
    }

    if (clearPinsBtn) {
      clearPinsBtn.addEventListener("click", function () {
        pinned = new Set();
        renderGrid();
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

      // IMPORTANT: absolute path (works from /players/)
      const payload = await fetchJsonOrThrow("/players.json");
      const rows = normalizePayloadToRows(payload);

      allRows = rows.map(function (row, idx) {
        const copy = Object.assign({}, row);
        copy.id = getId(row, idx);
        return copy;
      });

      if (payload && payload.meta && payload.meta.generated_at && lastGeneratedEl) {
        lastGeneratedEl.textContent = String(payload.meta.generated_at);
      } else if (lastGeneratedEl) {
        lastGeneratedEl.textContent = "-";
      }

      wireEvents();
      applyFilters();
      renderGrid();

      setState("Loaded player cards", false);
    } catch (err) {
      if (playersGridEl) playersGridEl.innerHTML = renderErrorBox(err && err.message ? err.message : String(err));
      setState("Load failed", true);
    }
  })();
});
