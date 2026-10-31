/* Reveal content once with a gentle blur-to-clear entrance. No JavaScript means fully visible content. */
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
        [{ opacity: .5, filter: 'blur(5px)', translate: '0 14px' }, { opacity: 1, filter: 'blur(0px)', translate: '0 0' }],
        { duration: 700, easing: 'cubic-bezier(.22, 1, .36, 1)' }
      );
      active.add(animation);
      animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    }
  }, { threshold: .08 });
  document.querySelectorAll('.section-heading, .service-grid, .website-services-heading, .website-options-grid, .project, .assistant-overview, .assistant-preview, .assistant-capabilities, .process-grid, .faq-grid, .contact-grid, .why-choose-heading, .why-choose-grid, .team-roles, .resource-card, .article-body > section, .answer-item, .pricing-comparison tbody tr, .pricing-cost-notes article, .pricing-faq .faq-item, .legal-section').forEach(element => { if (!element.querySelector('[data-cinematic-heading]')) observer.observe(element); });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    observer.disconnect();
    active.forEach(animation => animation.cancel());
    active.clear();
  });
})();
