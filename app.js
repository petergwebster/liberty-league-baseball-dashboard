console.log("loadLiveStats ran");
alert("app.js is running");

async function loadLiveStats() {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const tableWrapEl = document.getElementById("tableWrap");

  function setState(text) {
    if (stateEl) stateEl.textContent = text;
  }

  function renderTable(rows) {
    if (!tableWrapEl) return;
    tableWrapEl.innerHTML = "";

    if (!rows || rows.length === 0) {
      tableWrapEl.textContent = "No rows yet";
      return;
    }

    const colSet = new Set();
    rows.forEach((r) => {
      if (r && typeof r === "object") Object.keys(r).forEach((k) => colSet.add(k));
    });
    const cols = Array.from(colSet);

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
      headRowEl.appendChild(thEl);
    });
    theadEl.appendChild(headRowEl);
    tableEl.appendChild(theadEl);

    const tbodyEl = document.createElement("tbody");
    rows.forEach((r) => {
      const trEl = document.createElement("tr");
      cols.forEach((c) => {
        const tdEl = document.createElement("td");
        const v = r && Object.prototype.hasOwnProperty.call(r, c) ? r[c] : "";
        tdEl.textContent = v === null || v === undefined ? "" : String(v);
        tdEl.style.padding = "8px";
        tdEl.style.borderBottom = "1px solid #eee";
        trEl.appendChild(tdEl);
      });
      tbodyEl.appendChild(trEl);
    });
    tableEl.appendChild(tbodyEl);

    tableWrapEl.appendChild(tableEl);
  }

  try {
    setState("Loading...");

    const resp = await fetch("./live_team_stats.json", { cache: "no-store" });
    if (!resp.ok) throw new Error("HTTP " + resp.status);

    const data = await resp.json();
    const rows = data && Array.isArray(data.rows) ? data.rows : [];
    const generatedAt = data && data.generated_at ? data.generated_at : "";

    if (lastGenEl) lastGenEl.textContent = generatedAt || "(unknown)";

    setState("Loaded " + rows.length + " rows");
    renderTable(rows);
  } catch (e) {
    setState("Failed to load JSON");
    if (lastGenEl) lastGenEl.textContent = "(error)";
    if (tableWrapEl) tableWrapEl.textContent = String(e);
  }
}

document.addEventListener("DOMContentLoaded", loadLiveStats);
