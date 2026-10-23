/* Lazy-loaded 3D robot with cursor-following head movement. */
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
  let model = null;
  let modelStarted = false;
  function syncModel() {
    model?.setActive(visible && desktop.matches && !document.hidden);
  }
  async function loadModel() {
    if (modelStarted || !desktop.matches || !pointer.matches || !visible || document.hidden || navigator.connection?.saveData) return;
    modelStarted = true;
    try {
      const { mountRobot } = await import('./vendor/robot-renderer.js');
      if (!desktop.matches || document.hidden) { modelStarted = false; return; }
      model = await mountRobot(stage, () => { model = null; stage.dataset.robotModel = 'fallback'; });
      stage.dataset.robotModel = 'ready';
      syncModel();
      model.setLook(parseFloat(stage.style.getPropertyValue('--head-yaw')) || 0, parseFloat(stage.style.getPropertyValue('--head-pitch')) || 0, reduced.matches);
    } catch {
      stage.dataset.robotModel = 'fallback';
    }
  }
  const allowed = () => !reduced.matches && pointer.matches && desktop.matches && visible && !document.hidden;
  const clamp = value => Math.max(-1, Math.min(1, value));
  function reset() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    position = null;
    for (const property of ['--head-yaw', '--head-pitch', '--drift-x', '--drift-y']) stage.style.removeProperty(property);
    model?.setLook(0, 0, reduced.matches);
    syncModel();
  }
  function render() {
    frame = 0;
    if (!position || !allowed()) return reset();
    const rect = stage.getBoundingClientRect();
    const x = clamp((position.x - rect.left - rect.width / 2) / (window.innerWidth * .45));
    const y = clamp((position.y - rect.top - rect.height * .3) / (rect.height * .7));
    stage.style.setProperty('--head-yaw', (x * 26).toFixed(2) + 'deg');
    stage.style.setProperty('--head-pitch', (-y * 17).toFixed(2) + 'deg');
    model?.setLook(x * 26, -y * 17);
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
  document.addEventListener('visibilitychange', () => { reset(); loadModel(); });
  for (const media of [reduced, pointer, desktop]) media.addEventListener('change', () => { reset(); loadModel(); });
  window.addEventListener('pagehide', () => { model?.destroy(); model = null; modelStarted = false; });
  window.addEventListener('pageshow', () => { reset(); loadModel(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) reset();
      syncModel();
      if (visible) loadModel();
    }).observe(hero);
  } else loadModel();
})();
