/* One gentle entrance per content group. Content stays visible without JavaScript. */
(() => {
  'use strict';
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const active = new Set();
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (motion.matches) continue;
      const animation = entry.target.animate(
        [{ opacity: .5, translate: '0 14px' }, { opacity: 1, translate: '0 0' }],
        { duration: 550, easing: 'cubic-bezier(.22, 1, .36, 1)' }
      );
      active.add(animation);
      animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    }
  }, { threshold: .08 });
  document.querySelectorAll('.section-heading, .service-grid, .website-services-heading, .website-options-grid, .website-extras, .project, .demo-grid, .process-grid, .options-grid, .faq-grid, .contact-grid, .about-story, .principles, .about-cta-grid, .team-roles').forEach(element => observer.observe(element));
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    observer.disconnect();
    active.forEach(animation => animation.cancel());
    active.clear();
  });
})();
