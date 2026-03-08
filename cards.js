document.addEventListener("DOMContentLoaded", function () {
  runCards().catch(function (err) {
    const stateEl = document.getElementById("state");
    const gridEl = document.getElementById("grid");
    if (stateEl) stateEl.textContent = "Failed";
    if (gridEl) {
      gridEl.innerHTML =
        "
