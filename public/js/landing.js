/**
 * HisaZangu - Landing Page JavaScript
 * Scroll-triggered animations, animated counters, and smooth anchor scrolling.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // Scroll-Triggered Animations (IntersectionObserver)
  // ---------------------------------------------------------------------------

  function initScrollAnimations() {
    const elements = document.querySelectorAll('.animate-on-scroll');
    if (elements.length === 0) return;

    // Graceful fallback for browsers without IntersectionObserver
    if (!('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    elements.forEach((el) => observer.observe(el));
  }

  // ---------------------------------------------------------------------------
  // Animated Number Counters
  // ---------------------------------------------------------------------------

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    if (Number.isNaN(target) || target <= 0) {
      el.textContent = '0';
      return;
    }

    const duration = 2000; // ms
    const startTime = performance.now();

    function easeOutQuart(t) {
      return 1 - Math.pow(1 - t, 4);
    }

    function step(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      const current = Math.round(easedProgress * target);

      el.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }

    requestAnimationFrame(step);
  }

  function initCounters() {
    const counters = document.querySelectorAll('.counter');
    if (counters.length === 0) return;

    // Graceful fallback
    if (!('IntersectionObserver' in window)) {
      counters.forEach((el) => {
        el.textContent = parseInt(el.dataset.target, 10).toLocaleString() || '0';
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  // ---------------------------------------------------------------------------
  // Smooth Scroll for Anchor Links
  // ---------------------------------------------------------------------------

  function initSmoothScroll() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (!hash || hash === '#') return;

      const targetEl = document.querySelector(hash);
      if (!targetEl) return;

      e.preventDefault();

      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Update URL hash without jumping
      if (history.pushState) {
        history.pushState(null, '', hash);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------

  function init() {
    initScrollAnimations();
    initCounters();
    initSmoothScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
