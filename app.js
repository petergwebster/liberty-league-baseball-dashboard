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
    setState("Loaded teams", false);

    if (!tableWrapEl) return;

    // build table
    tableWrapEl.innerHTML = "";
    if (!rows.length) {
      showMessage("No rows in live_team_stats.json");
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
  } catch (err) {
    console.error(err);
    setState("Failed", true);
    if (lastGenEl) lastGenEl.textContent = "(error)";
    showMessage(String(err));
  }
});
