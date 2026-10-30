/* One brief liquid logo reveal, landing at the actual navbar logo rectangle. */
(async () => {
  'use strict';
  const root = document.documentElement;
  if (!root.classList.contains('logo-intro-pending')) return;
  const target = document.querySelector('.site-header .wordmark');
  const image = target?.querySelector('img');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (!target || !image || !Element.prototype.animate || reduced.matches) {
    root.classList.remove('logo-intro-pending');
    return;
  }
  const overlay = document.createElement('div');
  overlay.className = 'logo-intro-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  const backdrop = document.createElement('div');
  backdrop.className = 'logo-intro-backdrop';
  const mark = document.createElement('div');
  mark.className = 'wordmark logo-intro-mark';
  const copy = image.cloneNode();
  copy.alt = '';
  mark.append(copy);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.innerHTML = '<defs><filter id="intro-liquid" x="-20%" y="-50%" width="140%" height="200%"><feTurbulence type="fractalNoise" baseFrequency=".018 .035" numOctaves="2" seed="8" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="18" xChannelSelector="R" yChannelSelector="G"><animate attributeName="scale" values="18;9;0" dur="1.1s" fill="freeze"/></feDisplacementMap></filter></defs>';
  overlay.append(backdrop, mark, svg);
  let finished = false;
  let animations = [];
  let timeout;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(timeout);
    animations.forEach(animation => animation.cancel());
    target.removeAttribute('data-logo-intro');
    root.classList.remove('logo-intro-pending');
    overlay.remove();
    removeEventListener('resize', finish);
    removeEventListener('pointerdown', finish);
    document.removeEventListener('keydown', finish);
    document.removeEventListener('visibilitychange', onVisibility);
    reduced.removeEventListener('change', finish);
  }
  function onVisibility() { if (document.hidden) finish(); }
  addEventListener('resize', finish, { once: true });
  addEventListener('pointerdown', finish, { once: true, passive: true });
  document.addEventListener('keydown', finish, { once: true });
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', finish);
  timeout = setTimeout(finish, 5000);
  try {
    await Promise.race([copy.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 700))]);
    if (finished) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height || scrollY > 8) return finish();
    const scale = Math.min(380, innerWidth * .76) / rect.width;
    const startX = (innerWidth - rect.width * scale) / 2;
    const startY = (innerHeight - rect.height * scale) / 2;
    const start = `translate(${startX}px, ${startY}px) scale(${scale})`;
    mark.style.width = `${rect.width}px`;
    mark.style.height = `${rect.height}px`;
    mark.style.transform = start;
    target.setAttribute('data-logo-intro', '');
    document.body.append(overlay);
    root.classList.remove('logo-intro-pending');
    const reveal = mark.animate([
      { opacity: 0, filter: 'url(#intro-liquid) blur(7px)', transform: `${start} scale(.92)` },
      { opacity: 1, filter: 'url(#intro-liquid) blur(0px)', transform: start }
    ], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
    animations.push(reveal);
    await reveal.finished;
    if (finished) return;
    await new Promise(resolve => setTimeout(resolve, 350));
    if (finished) return;
    reveal.cancel();
    const destination = target.getBoundingClientRect();
    const fly = mark.animate([
      { transform: start },
      { transform: `translate(${destination.left}px, ${destination.top}px) scale(1)` }
    ], { duration: 1100, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
    const fade = backdrop.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 1000, easing: 'ease-in-out', fill: 'forwards' });
    animations.push(fly, fade);
    await fly.finished;
    finish();
  } catch { finish(); }
})();
