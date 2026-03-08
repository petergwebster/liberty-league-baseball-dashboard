async function loadLiveStats() {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const tableWrapEl = document.getElementById("tableWrap");

  function setState(text, isError) {
    if (!stateEl) return;
    stateEl.textContent = text;
    stateEl.style.background = isError ? "#3a1d1d" : "#14351f";
    stateEl.style.color = "#fff";
    stateEl.style.border = "1px solid " + (isError ? "#ff6b6b" : "#38c172");
    stateEl.style.padding = "4px 10px";
    stateEl.style.borderRadius = "999px";
    stateEl.style.display = "inline-block";
    stateEl.style.fontSize = "12px";
  }

  function showMessage(msg) {
    if (!tableWrapEl) return;
    tableWrapEl.innerHTML = "";
    const preEl = document.createElement("pre");
    preEl.style.whiteSpace = "pre-wrap";
    preEl.style.padding = "12px";
    preEl.style.border = "1px solid #333";
    preEl.style.borderRadius = "10px";
    preEl.style.background = "#111";
    preEl.style.color = "#ddd";
    preEl.textContent = msg;
    tableWrapEl.appendChild(preEl);
  }

  function toNum(x) {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }

  function fmt(x, digits) {
    const n = toNum(x);
    if (n === null) return "";
    if (typeof digits === "number") return n.toFixed(digits);
    return String(n);
  }

  function htmEscape(strVal) {
    return String(strVal || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function percentileWithin(valuesArr, val) {
    const cleanVals = valuesArr.filter(v => typeof v === "number" && Number.isFinite(v)).slice().sort((a,b) => a-b);
    if (cleanVals.length === 0) return 0;
    const v = toNum(val);
    if (v === null) return 0;
    let idx = 0;
    while (idx < cleanVals.length && cleanVals[idx] <= v) idx += 1;
    return Math.round((idx / cleanVals.length) * 100);
  }

  function makeBarRow(label, valueStr, pct) {
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "70px 1fr 44px";
    wrap.style.gap = "8px";
    wrap.style.alignItems = "center";
    wrap.style.marginTop = "6px";

    const l = document.createElement("div");
    l.style.color = "#aaa";
    l.style.fontSize = "12px";
    l.textContent = label;

    const barOuter = document.createElement("div");
    barOuter.style.height = "10px";
    barOuter.style.borderRadius = "999px";
    barOuter.style.background = "#2a2a2a";
    barOuter.style.overflow = "hidden";
    barOuter.style.border = "1px solid #333";

    const barInner = document.createElement("div");
    barInner.style.height = "100%";
    barInner.style.width = String(pct) + "%";
    barInner.style.background = "linear-gradient(90deg, #17c3b2, #5eead4)";
    barOuter.appendChild(barInner);

    const r = document.createElement("div");
    r.style.color = "#ddd";
    r.style.fontSize = "12px";
    r.style.textAlign = "right";
    r.textContent = String(pct) + "%";

    wrap.appendChild(l);
    wrap.appendChild(barOuter);
    wrap.appendChild(r);

    return wrap;
  }

  function renderTeamCards(rows) {
    if (!tableWrapEl) return;
    tableWrapEl.innerHTML = "";

    // Page styling container
    const page = document.createElement("div");
    page.style.background = "#0b0b0c";
    page.style.color = "#eee";
    page.style.borderRadius = "14px";
    page.style.padding = "14px";
    page.style.border = "1px solid #222";

    const title = document.createElement("div");
    title.innerHTML = "<div style='font-size:22px; font-weight:700;'>Interactive Baseball Cards</div>" +
      "<div style='color:#999; margin-top:4px;'>Liberty League (Teams pitching snapshot)</div>";
    page.appendChild(title);

    // Controls
    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.flexWrap = "wrap";
    controls.style.gap = "10px";
    controls.style.alignItems = "center";
    controls.style.marginTop = "12px";

    const search = document.createElement("input");
    search.placeholder = "Search team";
    search.style.padding = "10px";
    search.style.borderRadius = "10px";
    search.style.border = "1px solid #333";
    search.style.background = "#111";
    search.style.color = "#eee";
    search.style.width = "240px";

    const sortSel = document.createElement("select");
    sortSel.style.padding = "10px";
    sortSel.style.borderRadius = "10px";
    sortSel.style.border = "1px solid #333";
    sortSel.style.background = "#111";
    sortSel.style.color = "#eee";

    const sortOptions = [
      { key: "era", label: "Sort: ERA (low)" },
      { key: "so", label: "Sort: SO (high)" },
      { key: "bb", label: "Sort: BB (low)" },
      { key: "wins", label: "Sort: Wins (high)" },
      { key: "ip", label: "Sort: IP (high)" }
    ];
    sortOptions.forEach(o => {
      const opt = document.createElement("option");
      opt.value = o.key;
      opt.textContent = o.label;
      sortSel.appendChild(opt);
    });

    const count = document.createElement("div");
    count.style.color = "#bbb";
    count.style.marginLeft = "auto";
    count.style.fontSize = "13px";

    controls.appendChild(search);
    controls.appendChild(sortSel);
    controls.appendChild(count);
    page.appendChild(controls);

    // Layout: cards + side panel
    const layout = document.createElement("div");
    layout.style.display = "grid";
    layout.style.gridTemplateColumns = "1.8fr 1fr";
    layout.style.gap = "14px";
    layout.style.marginTop = "14px";

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    grid.style.gap = "12px";

    const side = document.createElement("div");
    side.style.border = "1px solid #222";
    side.style.background = "#0f0f10";
    side.style.borderRadius = "14px";
    side.style.padding = "12px";
    side.style.minHeight = "220px";
    side.innerHTML = "<div style='font-weight:700; font-size:16px;'>Pick a team</div>" +
      "<div style='color:#999; margin-top:6px;'>Click a card to see details.</div>";

    layout.appendChild(grid);
    layout.appendChild(side);
    page.appendChild(layout);

    tableWrapEl.appendChild(page);

    function computeMetricArrays(filteredRows) {
      const eraVals = filteredRows.map(r => toNum(r.era)).filter(v => v !== null);
      const soVals = filteredRows.map(r => toNum(r.so)).filter(v => v !== null);
      const bbVals = filteredRows.map(r => toNum(r.bb)).filter(v => v !== null);
      const ipVals = filteredRows.map(r => toNum(r.ip)).filter(v => v !== null);
      return { eraVals, soVals, bbVals, ipVals };
    }

    function applyFiltersAndRender() {
      const q = String(search.value || "").toLowerCase().trim();
      let filtered = rows.slice();

      if (q) {
        filtered = filtered.filter(r => String(r.team || "").toLowerCase().includes(q));
      }

      const sortKey = sortSel.value;
      if (sortKey === "era") {
        filtered.sort((a, b) => (toNum(a.era) ?? 1e9) - (toNum(b.era) ?? 1e9));
      } else if (sortKey === "bb") {
        filtered.sort((a, b) => (toNum(a.bb) ?? 1e9) - (toNum(b.bb) ?? 1e9));
      } else if (sortKey === "so") {
        filtered.sort((a, b) => (toNum(b.so) ?? -1) - (toNum(a.so) ?? -1));
      } else if (sortKey === "wins") {
        filtered.sort((a, b) => (toNum(b.wins) ?? -1) - (toNum(a.wins) ?? -1));
      } else if (sortKey === "ip") {
        filtered.sort((a, b) => (toNum(b.ip) ?? -1) - (toNum(a.ip) ?? -1));
      }

      count.textContent = String(filtered.length) + " teams";

      const metricArrays = computeMetricArrays(filtered);

      grid.innerHTML = "";

      filtered.forEach(r => {
        const teamName = String(r.team || "");
        const era = toNum(r.era);
        const so = toNum(r.so);
        const bb = toNum(r.bb);
        const ip = toNum(r.ip);
        const wins = toNum(r.wins);
        const losses = toNum(r.losses);

        const eraPct = 100 - percentileWithin(metricArrays.eraVals, era); // lower ERA is better
        const soPct = percentileWithin(metricArrays.soVals, so);
        const bbPct = 100 - percentileWithin(metricArrays.bbVals, bb); // lower BB is better
        const ipPct = percentileWithin(metricArrays.ipVals, ip);

        const card = document.createElement("div");
        card.style.border = "1px solid #222";
        card.style.background = "#111113";
        card.style.borderRadius = "14px";
        card.style.padding = "12px";
        card.style.cursor = "pointer";

        const head = document.createElement("div");
        head.innerHTML =
          "<div style='font-weight:800; font-size:16px;'>" + htmEscape(teamName) + "</div>" +
          "<div style='color:#999; margin-top:3px; font-size:12px;'>" +
          "W " + htmEscape(fmt(wins)) + " | L " + htmEscape(fmt(losses)) +
          " | IP " + htmEscape(fmt(ip, 1)) +
          "</div>";
        card.appendChild(head);

        const bigStats = document.createElement("div");
        bigStats.style.display = "grid";
        bigStats.style.gridTemplateColumns = "1fr 1fr 1fr";
        bigStats.style.gap = "10px";
        bigStats.style.marginTop = "10px";

        function bigCell(label, val) {
          const cell = document.createElement("div");
          cell.innerHTML =
            "<div style='color:#aaa; font-size:11px;'>" + htmEscape(label) + "</div>" +
            "<div style='font-weight:800; font-size:18px; margin-top:2px;'>" + htmEscape(val) + "</div>";
          return cell;
        }

        bigStats.appendChild(bigCell("ERA", fmt(era, 2)));
        bigStats.appendChild(bigCell("SO", fmt(so)));
        bigStats.appendChild(bigCell("BB", fmt(bb)));
        card.appendChild(bigStats);

        // Bar meters
        card.appendChild(makeBarRow("ERA", fmt(era, 2), eraPct));
        card.appendChild(makeBarRow("SO", fmt(so), soPct));
        card.appendChild(makeBarRow("BB", fmt(bb), bbPct));
        card.appendChild(makeBarRow("IP", fmt(ip, 1), ipPct));

        card.addEventListener("click", () => {
          side.innerHTML =
            "<div style='font-weight:800; font-size:18px;'>" + htmEscape(teamName) + "</div>" +
            "<div style='color:#999; margin-top:6px;'>Team pitching detail (from live_team_stats.json)</div>" +
            "<div style='margin-top:10px; display:grid; grid-template-columns:1fr 1fr; gap:10px;'>" +
            "<div style='border:1px solid #222; border-radius:12px; padding:10px; background:#111;'><div style='color:#aaa; font-size:12px;'>Wins</div><div style='font-weight:800; font-size:18px;'>" + htmEscape(fmt(wins)) + "</div></div>" +
            "<div style='border:1px solid #222; border-radius:12px; padding:10px; background:#111;'><div style='color:#aaa; font-size:12px;'>Losses</div><div style='font-weight:800; font-size:18px;'>" + htmEscape(fmt(losses)) + "</div></div>" +
            "<div style='border:1px solid #222; border-radius:12px; padding:10px; background:#111;'><div style='color:#aaa; font-size:12px;'>ERA</div><div style='font-weight:800; font-size:18px;'>" + htmEscape(fmt(era, 2)) + "</div></div>" +
            "<div style='border:1px solid #222; border-radius:12px; padding:10px; background:#111;'><div style='color:#aaa; font-size:12px;'>IP</div><div style='font-weight:800; font-size:18px;'>" + htmEscape(fmt(ip, 1)) + "</div></div>" +
            "</div>" +
            "<div style='margin-top:12px; color:#bbb; font-size:12px;'>Raw record</div>" +
            "
