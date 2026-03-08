async function loadLiveStats() {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const tableWrapEl = document.getElementById("tableWrap");

  function setState(text, isError) {
    if (!stateEl) return;
    stateEl.textContent = text;
    stateEl.style.background = isError ? "#ffe5e5" : "#e8f5e9";
    stateEl.style.border = "1px solid " + (isError ? "#ffb3b3" : "#b7e1bc");
    stateEl.style.padding = "2px 8px";
    stateEl.style.borderRadius = "999px";
    stateEl.style.display = "inline-block";
  }

  function showMessage(msg) {
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

  function renderTable(rows) {
    if (!tableWrapEl) return;

    tableWrapEl.innerHTML = "";

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

    const preferredOrder = ["metric", "value", "team", "gp", "w", "l", "pct"];
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
        tdEl.textContent = val === null || val === undefined ? "" : String(val);
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
    if (lastGenEl) lastGenEl.textContent = "";

    const resp = await fetch("./live_team_stats.json", { cache: "no-store" });
    if (!resp.ok) {
      throw new Error("Failed to fetch live_team_stats.json (HTTP " + resp.status + ")");
    }

    const data = await resp.json();

    const rows = data && Array.isArray(data.rows) ? data.rows : [];
    const generatedAt = data && data.generated_at ? data.generated_at : "";

    if (lastGenEl) lastGenEl.textContent = generatedAt || "(unknown)";

    if (data && data.error) {
      setState("Loaded " + rows.length + " rows (upstream error)", true);
      renderTable(rows);
      return;
    }

    setState("Loaded " + rows.length + " rows", false);
    renderTable(rows);
  } catch (e) {
    setState("Failed", true);
    if (lastGenEl) lastGenEl.textContent = "(error)";
    showMessage(String(e));
  }
}

document.addEventListener("DOMContentLoaded", loadLiveStats);
