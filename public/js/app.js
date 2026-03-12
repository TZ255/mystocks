/**
 * HisaZangu - Global Application JavaScript
 * Handles HTMX configuration, navigation, flash messages, and utilities.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // HTMX Configuration
  // ---------------------------------------------------------------------------

  document.addEventListener('htmx:configRequest', () => {
    // Default swap strategy is innerHTML; set via meta or here as a fallback.
  });

  if (typeof htmx !== 'undefined') {
    htmx.config.defaultSwapStyle = 'innerHTML';
    htmx.config.historyCacheSize = 0;
  }

  // User-friendly HTMX error handling
  document.addEventListener('htmx:responseError', (event) => {
    const status = event.detail.xhr?.status;
    let message = 'Something went wrong. Please try again.';

    if (status === 401) {
      message = 'Your session has expired. Please log in again.';
    } else if (status === 403) {
      message = 'You do not have permission to perform this action.';
    } else if (status === 404) {
      message = 'The requested resource was not found.';
    } else if (status >= 500) {
      message = 'A server error occurred. Please try again later.';
    }

    showToast(message, 'error');
  });

  document.addEventListener('htmx:sendError', () => {
    showToast('Network error. Please check your connection.', 'error');
  });

  // ---------------------------------------------------------------------------
  // Mobile Navigation Toggle
  // ---------------------------------------------------------------------------

  function initMobileNav() {
    const toggle = document.querySelector('.nav-toggle, .hamburger');
    const navMenu = document.querySelector('.nav-menu, .nav-links');

    if (!toggle || !navMenu) return;

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = navMenu.classList.toggle('open');
      toggle.classList.toggle('active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
      if (!navMenu.contains(e.target) && !toggle.contains(e.target)) {
        navMenu.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Close menu on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        navMenu.classList.remove('open');
        toggle.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Scroll Handler  --  .nav-scrolled class
  // ---------------------------------------------------------------------------

  function initScrollHandler() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    let ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          nav.classList.toggle('nav-scrolled', window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });

    // Apply immediately in case the page loaded already scrolled
    nav.classList.toggle('nav-scrolled', window.scrollY > 50);
  }

  // ---------------------------------------------------------------------------
  // HTMX After-Swap Animations & Toast Events
  // ---------------------------------------------------------------------------

  document.addEventListener('htmx:afterSwap', (event) => {
    const target = event.detail.target;
    if (!target) return;

    // Trigger a subtle fade-in on swapped content
    target.classList.add('htmx-swapping-in');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.remove('htmx-swapping-in');
      });
    });

    // Re-initialise any flash messages inside the swapped content
    autoDismissFlashMessages(target);
  });

  // Listen for custom toast events dispatched from HTMX response headers
  // Server can send HX-Trigger: {"showToast": {"message": "...", "type": "success"}}
  document.addEventListener('showToast', (event) => {
    const { message, type } = event.detail || {};
    if (message) {
      showToast(message, type || 'info');
    }
  });

  // ---------------------------------------------------------------------------
  // Toast Notification System
  // ---------------------------------------------------------------------------

  function getOrCreateToastContainer() {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('role', 'status');
      document.body.appendChild(container);
    }
    return container;
  }

  function showToast(message, type = 'info', duration = 5000) {
    const container = getOrCreateToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger reflow so the transition runs
    toast.offsetHeight; // eslint-disable-line no-unused-expressions

    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
    });

    const timer = setTimeout(() => dismissToast(toast), duration);

    toast.addEventListener('click', () => {
      clearTimeout(timer);
      dismissToast(toast);
    });
  }

  function dismissToast(toast) {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-hiding');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });

    // Fallback removal if transitionend never fires
    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 500);
  }

  // Expose globally so other modules can trigger toasts
  window.showToast = showToast;

  // ---------------------------------------------------------------------------
  // Auto-Dismiss Flash Messages
  // ---------------------------------------------------------------------------

  function autoDismissFlashMessages(root = document) {
    const flashes = root.querySelectorAll('.flash-message, .alert');
    flashes.forEach((flash) => {
      // Skip messages already scheduled
      if (flash.dataset.autoDismiss === 'true') return;
      flash.dataset.autoDismiss = 'true';

      setTimeout(() => {
        flash.classList.add('flash-dismiss');
        flash.addEventListener('transitionend', () => flash.remove(), { once: true });
        // Fallback
        setTimeout(() => {
          if (flash.parentNode) flash.remove();
        }, 500);
      }, 5000);
    });
  }

  // ---------------------------------------------------------------------------
  // Currency Formatting Utility
  // ---------------------------------------------------------------------------

  /**
   * Format a number as Tanzanian Shillings.
   * @param {number|string} num - The value to format.
   * @returns {string} e.g. "TZS 1,234,567"
   */
  function formatTZS(num) {
    const n = Number(num);
    if (Number.isNaN(n)) return 'TZS 0';

    const formatted = Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return `TZS ${formatted}`;
  }

  // Expose globally
  window.formatTZS = formatTZS;

  // ---------------------------------------------------------------------------
  // Initialise on DOM Ready
  // ---------------------------------------------------------------------------

  function init() {
    initMobileNav();
    initScrollHandler();
    autoDismissFlashMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
