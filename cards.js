document.addEventListener("DOMContentLoaded", function () {
  runCards().catch(function (err) {
    renderError(err);
  });
});

function qs(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function setPill(text, kind) {
  const stateEl = qs("state");
  if (!stateEl) return;
  stateEl.textContent = text;
  stateEl.classList.remove("ok");
  stateEl.classList.remove("bad");
  if (kind === "ok") stateEl.classList.add("ok");
  if (kind === "bad") stateEl.classList.add("bad");
}

function renderError(err) {
  console.error(err);

  setPill("Failed", "bad");

  const gridEl = qs("grid");
  const sideEl = qs("side");

  const msg = String(err && err.stack ? err.stack : err);

  if (gridEl) {
    gridEl.innerHTML =
      "<div style='border:1px solid #5a2424;background:rgba(255,107,107,0.10);padding:12px;border-radius:14px;'>" +
      "<div style='font-weight:800;margin-bottom:6px;'>cards.js error</div>" +
      "
