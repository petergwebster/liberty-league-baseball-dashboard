document.addEventListener("DOMContentLoaded", async function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");

  const qEl = document.getElementById("q");
  const minABEl = document.getElementById("minAB");
  const minPaPctEl = document.getElementById("minPaPct");
  const pctPaLabelEl = document.getElementById("paPctLabel");
  const sortByEl = document.getElementById("sortBy");

  const countPillEl = document.getElementById("countPill");
  const playersGridEl = document.getElementById("playersGrid");
  const detailEl = document.getElementById("detail");
  const pinnedRowEl = document.getElementById("pinnedRow");

  const exportBtn = document.getElementById("exportBtn");
  const clearPinsBtn = document.getElementById("clearPinsBtn");
  const clearAllBtn = document.getElementById("clearAllBtn");

  let allRows = [];
  let viewRows = [];
  let selectedId = null;
  let pinned = new Set();

  function setState(txt, isBad) {
    if (!stateEl) return;
    stateEl.textContent = txt;
    stateEl.className = "pill " + (isBad ? "pillBad" : "");
  }

  function setLastGenerated(txt) {
    if (!lastGenEl) return;
    lastGenEl.textContent = txt;
  }

  function safeStr(v) {
    if (v === null || v === undefined) return "";
    return String(v);
  }

  function safeNum(v) {
    if (v === null || v === undefined) return null;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
    return null;
  }

  function fmt0(v) {
    const n = safeNum(v);
    if (n === null) return "—";
    return String(Math.round(n));
  }

  function fmt3(v) {
    const n = safeNum(v);
    if (n === null) return "—";
    return n.toFixed(3);
  }

  function escHtml(s) {
    const txt = safeStr(s);
    return txt
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function asPct01(v) {
    const n = safeNum(v);
    if (n === null) return null;
    if (n <= 1) return n;
    if (n <= 100) return n / 100.0;
    return null;
  }

  function pillCount(n) {
    if (!countPillEl) return;
    countPillEl.textContent = "Players " + String(n);
  }

  function pickId(r, idx) {
    const rid = safeStr(r && r.id);
    if (rid.trim() !== "") return rid;

    const nm = safeStr((r && (r.player || r.name)) || "Unknown");
    const tm = safeStr((r && r.team) || "");
    return nm + "|" + tm + "|" + String(idx);
  }

  function getName(r) {
    const nm = safeStr((r && (r.player || r.name)) || "Unknown");
    return nm.trim() === "" ? "Unknown" : nm;
  }

  function getTeam(r) {
    return safeStr((r && r.team) || "").trim();
  }

  function getPA(r) {
    const pa0 = safeNum(r && (r.pa !== undefined ? r.pa : r.PA));
    if (pa0 !== null) return pa0;

    const ab = safeNum(r && (r.ab !== undefined ? r.ab : r.AB));
    const bb = safeNum(r && (r.bb !== undefined ? r.bb : r.BB));
    const hbp = safeNum(r && (r.hbp !== undefined ? r.hbp : r.HBP));
    const sf = safeNum(r && (r.sf !== undefined ? r.sf : r.SF));

    if (ab === null && bb === null && hbp === null && sf === null) return null;

    return (ab || 0) + (bb || 0) + (hbp || 0) + (sf || 0);
  }

  function computePaPercentiles(rows) {
    const paVals = rows
      .map(function (r) {
        return r._pa;
      })
      .filter(function (v) {
        return v !== null;
      })
      .slice()
      .sort(function (a, b) {
        return a - b;
      });

    if (paVals.length === 0) {
      rows.forEach(function (r) {
        r._paPct = null;
      });
      return;
    }

    function pctOf(v) {
      if (v === null) return null;
      let lo = 0;
      let hi = paVals.length;
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        if (paVals[mid] <= v) lo = mid + 1;
        else hi = mid;
      }
      return lo / paVals.length;
    }

    rows.forEach(function (r) {
      r._paPct = pctOf(r._pa);
    });
  }

  async function fetchJsonOrThrow(urlPath) {
    const resp = await fetch(urlPath, { cache: "no-store" });
    const ct = resp.headers.get("content-type") || "";
    const txt = await resp.text();

    if (!resp.ok) {
      throw new Error(
        "Fetch failed " +
          urlPath +
          " HTTP " +
          String(resp.status) +
          " CT " +
          ct +
          " Head " +
          txt.slice(0, 160)
      );
    }

    const trimmed = txt.trim();
    if (trimmed.startsWith("<")) {
      throw new Error("Expected JSON but got HTML from " + urlPath + " Head " + trimmed.slice(0, 160));
    }

    try {
      return JSON.parse(trimmed);
    } catch (e) {
      throw new Error("Invalid JSON from " + urlPath + " Head " + trimmed.slice(0, 160));
    }
  }

  function normalizeRows(rawRows) {
    const norm = rawRows.map(function (r, idx) {
      const rr = r || {};
      const out = Object.assign({}, rr);

      out._id = pickId(rr, idx);
      out._name = getName(rr);
      out._team = getTeam(rr);

      out._ab = safeNum(rr.ab !== undefined ? rr.ab : rr.AB);
      out._h = safeNum(rr.h !== undefined ? rr.h : rr.H);
      out._hr = safeNum(rr.hr !== undefined ? rr.hr : rr.HR);
      out._rbi = safeNum(rr.rbi !== undefined ? rr.rbi : rr.RBI);

      out._avg = safeNum(rr.avg !== undefined ? rr.avg : rr.AVG);
      out._obp = safeNum(rr.obp !== undefined ? rr.obp : rr.OBP);
      out._slg = safeNum(rr.slg !== undefined ? rr.slg : rr.SLG);
      out._ops = safeNum(rr.ops !== undefined ? rr.ops : rr.OPS);

      out._pa = getPA(rr);
      out._paPct = null;

      return out;
    });

    computePaPercentiles(norm);
    return norm;
  }

  function cardHtml(r) {
    const pinnedOn = pinned.has(r._id);
    const selectedOn = selectedId === r._id;

    const cls =
      "playerCard" +
      (pinnedOn ? " pinned" : "") +
      (selectedOn ? " selected" : "");

    const statsLine =
      '<div class="cardStats">' +
      '<div class="stat"><div class="k">OPS</div><div class="v">' +
      fmt3(r._ops) +
      "</div></div>" +
      '<div class="stat"><div class="k">AVG</div><div class="v">' +
      fmt3(r._avg) +
      "</div></div>" +
      '<div class="stat"><div class="k">HR</div><div class="v">' +
      fmt0(r._hr) +
      "</div></div>" +
      '<div class="stat"><div class="k">RBI</div><div class="v">' +
      fmt0(r._rbi) +
      "</div></div>" +
      "</div>";

    const pinTxt = pinnedOn ? "Unpin" : "Pin";

    return (
      '<div class="' +
      cls +
      '" data-id="' +
      escHtml(r._id) +
      '">' +
      '<div class="cardTop">' +
      '<div class="cardName">' +
      escHtml(r._name) +
      "</div>" +
      '<div class="cardTeam">' +
      escHtml(r._team) +
      "</div>" +
      "</div>" +
      statsLine +
      '<div class="cardActions">' +
      '<button class="pinBtn" data-id="' +
      escHtml(r._id) +
      '">' +
      pinTxt +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function renderPinnedRow() {
    if (!pinnedRowEl) return;

    const pinnedIds = Array.from(pinned.values());
    if (pinnedIds.length === 0) {
      pinnedRowEl.innerHTML = "";
      pinnedRowEl.style.display = "none";
      return;
    }

    const pinnedRows = allRows.filter(function (r) {
      return pinned.has(r._id);
    });

    pinnedRowEl.style.display = "block";
    pinnedRowEl.innerHTML =
      '<div class="pinnedTitle">Pinned</div>' +
      '<div class="pinnedGrid">' +
      pinnedRows
        .map(function (r) {
          return '<div class="pinnedCardWrap">' + cardHtml(r) + "</div>";
        })
        .join("") +
      "</div>";
  }

  function renderGrid() {
    if (!playersGridEl) return;
    playersGridEl.innerHTML = viewRows.map(function (r) {
      return cardHtml(r);
    }).join("");
  }

  function renderDetailById(id) {
    if (!detailEl) return;

    const r = allRows.find(function (x) {
      return x._id === id;
    });

    if (!r) {
      detailEl.innerHTML = "<div>Pick a player to see details.</div>";
      return;
    }

    const paTxt = r._pa === null ? "—" : String(r._pa);
    const paPctTxt = r._paPct === null ? "—" : String(Math.round(r._paPct * 100)) + "%";

    detailEl.innerHTML =
      '<div class="detailHeader">' +
      '<div class="detailName">' +
      escHtml(r._name) +
      "</div>" +
      '<div class="detailTeam">' +
      escHtml(r._team) +
      "</div>" +
      "</div>" +
      '<div class="detailGrid">' +
      '<div class="detailCell"><div class="detailK">AB</div><div class="detailV">' +
      (r._ab === null ? "—" : String(r._ab)) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">H</div><div class="detailV">' +
      (r._h === null ? "—" : String(r._h)) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">HR</div><div class="detailV">' +
      fmt0(r._hr) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">RBI</div><div class="detailV">' +
      fmt0(r._rbi) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">AVG</div><div class="detailV">' +
      fmt3(r._avg) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">OBP</div><div class="detailV">' +
      fmt3(r._obp) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">SLG</div><div class="detailV">' +
      fmt3(r._slg) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">OPS</div><div class="detailV">' +
      fmt3(r._ops) +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">PA</div><div class="detailV">' +
      paTxt +
      "</div></div>" +
      '<div class="detailCell"><div class="detailK">PA %tile</div><div class="detailV">' +
      paPctTxt +
      "</div></div>" +
      "</div>" +
      '<div class="detailRaw">' +
      "<h4>Raw row</h4>" +
      "
