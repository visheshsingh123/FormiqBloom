/* Native range semantics with mouse/touch dragging anywhere on the comparison. */
(() => {
  'use strict';
  const comparison = document.querySelector('.redesign-comparison');
  const range = comparison?.querySelector('.redesign-range');
  if (!range) return;
  function update() {
    comparison.style.setProperty('--split', `${range.value}%`);
    range.setAttribute('aria-valuetext', `${range.value}% before, ${100 - Number(range.value)}% after`);
  }
  function fromPointer(event) {
    const rect = comparison.getBoundingClientRect();
    range.value = String(Math.round(Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100))));
    update();
  }
  range.addEventListener('input', update);
  range.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    event.preventDefault();
    range.focus({ preventScroll: true });
    range.setPointerCapture(event.pointerId);
    fromPointer(event);
  });
  range.addEventListener('pointermove', event => {
    if (range.hasPointerCapture(event.pointerId)) fromPointer(event);
  });
  function release(event) {
    if (range.hasPointerCapture(event.pointerId)) range.releasePointerCapture(event.pointerId);
  }
  range.addEventListener('pointerup', release);
  range.addEventListener('pointercancel', release);
  range.disabled = false;
  update();
})();
