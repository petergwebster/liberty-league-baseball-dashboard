async function loadLiveStats() {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const tableWrapEl = document.getElementById("tableWrap");

  function setState(text, isError) {
    if (stateEl) {
      stateEl.textContent = text;
      stateEl.style.background = isError ? "#ffe5e5" : "#e8f5e9";
      stateEl.style.border = "1px solid " + (isError ? "#ffb3b3" : "#b7e1bc");
    }
  }

  function clearTable() {
    if (tableWrapEl) tableWrapEl.innerHTML = "";
  }

  function renderTable(rows) {
    clearTable();

    if (!tableWrapEl) return;

    if (!rows || rows.length === 0) {
      tableWrapEl.innerHTML =
        "<div style='padding:10px;border:1px solid #ddd;border-radius:8px;'>No rows yet</div>";
      return;
    }

    const colSet = new Set();
    rows.forEach((r) => {
      if (r && typeof r === "object") {
        Object.keys(r).forEach((k) => colSet.add(k));
      }
    });

    const preferredOrder = ["metric", "value", "team", "gp", "w", "l", "pct"];
    const allCols = Array.from(colSet);

    const orderedCols = [];
    preferredOrder.forEach((k) => {
      if (colSet.has(k)) orderedCols.push(k);
    });
    allCols.forEach((k) => {
      if (!orderedCols.includes(k)) orderedCols.push(k);
    });

    const tableEl = document.createElement("table");
    tableEl.style.width = "100%";
    tableEl.style.borderCollapse = "collapse";
    tableEl.style.marginTop = "12px";

    const theadEl = document.createElement("thead");
    const headRowEl = document.createElement("tr");
    orderedCols.forEach((col) => {
      const thEl = document.createElement("th");
      thEl.textContent = col;
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
      orderedCols.forEach((col) => {
        const tdEl = document.createElement("td");
        const cellVal =
          r && Object.prototype.hasOwnProperty.call(r, col) ? r[col] : "";
        tdEl.textContent =
          cellVal === null || cellVal === undefined ? "" : String(cellVal);
        tdEl.style.padding = "8px";
        tdEl.style.borderBottom = "1px solid #eee";
        tdEl.style.verticalAlign = "top";
        trEl.appendChild(tdEl);
      });
      tbodyEl.appendChild(trEl);
    });
    tableEl.appendChild(tbodyEl);

    tableWrapEl.appendChild(tableEl);
  }

  try {
    setState("Loading...", false);
    clearTable();

    const resp = await fetch("./live_team_stats.json", { cache: "no-store" });
    if (!resp.ok) {
      throw new Error("HTTP " + resp.status + " fetching live_team_stats.json");
    }

    const data = await resp.json();

    const rows = data && Array.isArray(data.rows) ? data.rows : [];
    const generatedAt = data && data.generated_at ? data.generated_at : "";

    if (lastGenEl) lastGenEl.textContent = generatedAt || "(unknown)";

    if (data && data.error) {
      setState("Loaded " + rows.length + " rows (with error)", true);
    } else {
      setState("Loaded " + rows.length + " rows", false);
    }

    renderTable(rows);
  } catch (e) {
    setState("Failed to load JSON", true);
    if (lastGenEl) lastGenEl.textContent = "(error)";
    if (tableWrapEl) {
      tableWrapEl.innerHTML =
        "
