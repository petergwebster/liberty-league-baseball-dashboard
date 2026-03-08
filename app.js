document.addEventListener("DOMContentLoaded", function () {
  const stateEl = document.getElementById("state");
  const lastGenEl = document.getElementById("lastGenerated");
  const tableWrapEl = document.getElementById("tableWrap");

  if (stateEl) stateEl.textContent = "app.js loaded";
  if (lastGenEl) lastGenEl.textContent = "test";

  if (tableWrapEl) {
    tableWrapEl.innerHTML =
      "<div style='padding:12px;border:1px solid #ddd;border-radius:10px;max-width:900px;'>" +
      "<div style='font-weight:700;'>JS is running ✅</div>" +
      "<div>If you can see this, Netlify is loading app.js correctly.</div>" +
      "</div>";
  }
});
