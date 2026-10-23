/* Cursor-following CSS 3D illustration. No WebGL library, camera, or cursor interception. */
(() => {
  'use strict';
  const stage = document.getElementById('hero-robot');
  const hero = document.getElementById('home');
  if (!stage || !hero) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const desktop = window.matchMedia('(min-width: 851px)');
  let visible = true;
  let frame = 0;
  let position = null;
  const allowed = () => !reduced.matches && pointer.matches && desktop.matches && visible && !document.hidden;
  const clamp = value => Math.max(-1, Math.min(1, value));
  function reset() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    position = null;
    for (const property of ['--head-yaw', '--head-pitch', '--gaze-x', '--gaze-y', '--drift-x', '--drift-y']) stage.style.removeProperty(property);
  }
  function render() {
    frame = 0;
    if (!position || !allowed()) return reset();
    const rect = stage.getBoundingClientRect();
    const x = clamp((position.x - rect.left - rect.width / 2) / (window.innerWidth * .45));
    const y = clamp((position.y - rect.top - rect.height * .3) / (rect.height * .7));
    stage.style.setProperty('--head-yaw', (x * 26).toFixed(2) + 'deg');
    stage.style.setProperty('--head-pitch', (-y * 17).toFixed(2) + 'deg');
    stage.style.setProperty('--gaze-x', (x * 4).toFixed(2) + 'px');
    stage.style.setProperty('--gaze-y', (y * 3).toFixed(2) + 'px');
    stage.style.setProperty('--drift-x', (x * 9).toFixed(2) + 'px');
    stage.style.setProperty('--drift-y', (y * 7).toFixed(2) + 'px');
  }
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !allowed()) return;
    position = { x: event.clientX, y: event.clientY };
    if (!frame) frame = window.requestAnimationFrame(render);
  }, { passive: true });
  hero.addEventListener('pointerleave', reset);
  window.addEventListener('blur', reset);
  window.addEventListener('resize', reset, { passive: true });
  document.addEventListener('visibilitychange', reset);
  for (const media of [reduced, pointer, desktop]) media.addEventListener('change', reset);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) reset();
    }).observe(hero);
  }
})();
