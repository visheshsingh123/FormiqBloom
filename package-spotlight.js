/* One pointer listener and one scheduled frame for all three package spotlights. */
(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.website-option:not([data-carousel-clone])')];
  if (!cards.length) return;
  const enabled = matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  let frame = 0;
  let pointer = null;
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    pointer = null;
    cards.forEach(card => {
      card.style.removeProperty('--spot-opacity');
      card.style.removeProperty('--spot-x');
      card.style.removeProperty('--spot-y');
    });
  }
  function render() {
    frame = 0;
    if (!pointer || !enabled.matches) return;
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const dx = Math.max(rect.left - pointer.x, 0, pointer.x - rect.right);
      const dy = Math.max(rect.top - pointer.y, 0, pointer.y - rect.bottom);
      const opacity = Math.max(0, 1 - Math.hypot(dx, dy) / 140);
      card.style.setProperty('--spot-opacity', opacity.toFixed(3));
      if (!opacity || !rect.width || !rect.height) return;
      // Convert screen coordinates back into the card's layout coordinates (CSS zoom).
      card.style.setProperty('--spot-x', `${((pointer.x - rect.left) * card.offsetWidth / rect.width).toFixed(2)}px`);
      card.style.setProperty('--spot-y', `${((pointer.y - rect.top) * card.offsetHeight / rect.height).toFixed(2)}px`);
    });
  }
  document.addEventListener('pointermove', event => {
    if (!enabled.matches || event.pointerType !== 'mouse') return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(render);
  }, { passive: true });
  document.documentElement.addEventListener('pointerleave', reset);
  addEventListener('blur', reset);
  addEventListener('scroll', reset, { passive: true });
  enabled.addEventListener('change', reset);
})();
