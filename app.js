document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const tableWrapEl = document.getElementById("tableWrap");

  function setState(msg, isError) {
    if (!stateEl) return;
    stateEl.textContent = msg;
    stateEl.style.background = isError ? "#ffe5e5" : "#e8f5e9";
    stateEl.style.border = "1px solid " + (isError ? "#ffb3b3" : "#b7e1bc");
    stateEl.style.padding = "2px 8px";
    stateEl.style.borderRadius = "999px";
    stateEl.style.display = "inline-block";
    stateEl.style.fontSize = "12px";
  }

  function showMessage(msg) {
    if (!tableWrapEl) return;
    tableWrapEl.innerHTML = "";
    const pre = document.createElement("pre");
    pre.style.whiteSpace = "pre-wrap";
    pre.style.padding = "10px";
    pre.style.border = "1px solid #ddd";
    pre.style.borderRadius = "8px";
    pre.textContent = msg;
    tableWrapEl.appendChild(pre);
  }

  function inferRows(payload) {
    if (!payload) return [];
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.rows)) return payload.rows;

    if (Array.isArray(payload.tables) && payload.tables.length) {
      const t0 = payload.tables[0];
      if (t0 && Array.isArray(t0.rows)) return t0.rows;
      if (t0 && Array.isArray(t0.data)) return t0.data;
    }

    return [];
  }

  function buildTable(rows) {
    if (!tableWrapEl) return;

    tableWrapEl.innerHTML = "";
    if (!rows.length) {
      showMessage("No rows returned from dataset.");
      return;
    }

    const cols = Array.from(
      rows.reduce((set, r) => {
        Object.keys(r || {}).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );

    const table = document.createElement("table");
    table.border = "1";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");
    cols.forEach((c) => {
      const th = document.createElement("th");
      th.textContent = c;
      trHead.appendChild(th);
    });
    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    rows.forEach((r) => {
      const tr = document.createElement("tr");
      cols.forEach((c) => {
        const td = document.createElement("td");
        td.textContent = r[c] != null ? r[c] : "";
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    tableWrapEl.appendChild(table);
  }

  async function fetchJsonOrThrow(urlPath) {
    const resp = await fetch(urlPath, { cache: "no-store" });
    if (!resp.ok) {
      throw new Error("Failed to fetch " + urlPath + " (HTTP " + resp.status + ")");
    }
    return await resp.json();
  }

  try {
    setState("Loading...", false);
    if (lastGenEl) lastGenEl.textContent = "";

    // Use ABSOLUTE paths so this works from / and from /cards etc.
    const manifestUrl = "/data/manifest.json";
    const primaryDatasetUrl = "/data/overall_batting.json";
    const fallbackDatasetUrl = "/data/live_team_stats.json";

    // 1) Manifest drives "last generated"
    const manifest = await fetchJsonOrThrow(manifestUrl);
    const generatedAt = manifest && manifest.generated_at ? manifest.generated_at : "";
    if (lastGenEl) lastGenEl.textContent = generatedAt || "(unknown)";

    // 2) Data: try overall_batting first, then fall back to live_team_stats
    let payload = null;
    let datasetLabel = "overall batting";

    try {
      payload = await fetchJsonOrThrow(primaryDatasetUrl);
      datasetLabel = "overall batting";
    } catch (e) {
      console.warn("Primary dataset failed, trying fallback:", e);
      payload = await fetchJsonOrThrow(fallbackDatasetUrl);
      datasetLabel = "live team stats";
    }

    const rows = inferRows(payload);

    setState("Loaded " + datasetLabel, false);
    buildTable(rows);
  } catch (err) {
    console.error(err);
    setState("Failed", true);
    if (lastGenEl) lastGenEl.textContent = "(error)";
    showMessage(String(err));
  }
});
