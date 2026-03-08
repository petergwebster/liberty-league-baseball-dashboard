document.addEventListener("DOMContentLoaded", function () {
  runCards().catch(function (err) {
    console.error(err);
    setPill("Failed", "bad");
    const gridEl = qs("grid");
    const sideEl = qs("side");
    const msg = String(err && err.stack ? err.stack : err);

    if (gridEl) {
      gridEl.innerHTML =
        "<div class='errBox'>" +
        "<div style='font-weight:800;margin-bottom:6px;'>cards.js error</div>" +
        "
