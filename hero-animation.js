/* Local looping illustration; pause while offscreen and respect reduced motion. */
(() => {
  'use strict';
  const container = document.getElementById('hero-webdesign');
  if (!container || !window.lottie) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = true;
  let ready = false;
  const animation = lottie.loadAnimation({ container, renderer: 'svg', loop: true, autoplay: false, path: '/Assets/hero-webdesign.json', rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true } });
  function sync() {
    if (!ready) return;
    if (motion.matches) animation.goToAndStop(60, true);
    else if (visible && !document.hidden && !navigator.connection?.saveData) animation.play();
    else animation.pause();
  }
  animation.addEventListener('DOMLoaded', () => { ready = true; animation.goToAndStop(60, true); sync(); });
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(container);
  document.addEventListener('visibilitychange', sync);
  motion.addEventListener('change', sync);
})();
