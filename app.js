function setText(id, txt) {
  var el = document.getElementById(id);
  if (el) el.textContent = txt;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadJson(path) {
  var res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error("Fetch failed " + path + " status " + res.status);
  return await res.json();
}

function renderTable(rows) {
  var table = document.getElementById("teamTable");
  var head = document.getElementById("teamHead");
  var body = document.getElementById("teamBody");

  var headers = Object.keys(rows[0] || {});
  head.innerHTML = headers
    .map(function (h) {
      return "<th>" + escapeHtml(h) + "</th>";
    })
    .join("");

  body.innerHTML = rows
    .map(function (r) {
      return (
        "<tr>" +
        headers
          .map(function (h) {
            var v = r[h];
            if (v === null || typeof v === "undefined") v = "";
            return "<td>" + escapeHtml(v) + "</td>";
          })
          .join("") +
        "</tr>"
      );
    })
    .join("");

  table.style.display = "";
}

async function init() {
  try {
    setText("dataState", "Loading…");
    setText("generatedAt", "—");
    setText("status", "");

    var team = await loadJson("/live_team_stats.json");

    setText("generatedAt", team.generated_at || "—");

    var rows = Array.isArray(team.rows) ? team.rows : [];

    if (rows.length === 0) {
      setText("dataState", "No rows yet");

      var msg = "The JSON loaded successfully, but rows is empty.\n\n";
      if (team.error) msg += "Last scrape error recorded:\n" + team.error;

      setText("status", msg);
      return;
    }

    setText("dataState", "Loaded " + rows.length + " rows");
    setText("status", "");
    renderTable(rows);
  } catch (e) {
    setText("dataState", "Error");
    setText("status", String(e && e.stack ? e.stack : e));
  }
}

init();
