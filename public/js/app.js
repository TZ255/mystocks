/**
 * HisaZangu - Global Application JavaScript
 * Handles HTMX configuration, navigation, flash messages, and utilities.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // HTMX Configuration
  // ---------------------------------------------------------------------------

  if (typeof htmx !== 'undefined') {
    htmx.config.defaultSwapStyle = 'innerHTML';
    htmx.config.historyCacheSize = 0;
    htmx.config.indicatorClass = 'htmx-request';
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
  // Scroll Handler — .nav-scrolled class (landing page only)
  // ---------------------------------------------------------------------------

  function initScrollHandler() {
    const nav = document.getElementById('main-nav');
    if (!nav) return;

    // Only apply transparent-to-glass on landing page
    const isLanding = window.location.pathname === '/';
    if (!isLanding) return;

    // Remove initial background on landing
    nav.style.background = 'transparent';
    nav.style.borderBottom = '1px solid transparent';

    let ticking = false;

    function onScroll() {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrolled = window.scrollY > 50;
          nav.classList.toggle('nav-scrolled', scrolled);
          if (scrolled) {
            nav.style.background = '';
            nav.style.borderBottom = '';
          } else {
            nav.style.background = 'transparent';
            nav.style.borderBottom = '1px solid transparent';
          }
          ticking = false;
        });
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------------------------------------------------------------------------
  // Bootstrap Mobile Nav — close on link click
  // ---------------------------------------------------------------------------

  function initMobileNavClose() {
    const navCollapse = document.getElementById('navContent');
    if (!navCollapse) return;

    // Close mobile nav when a link is clicked
    navCollapse.querySelectorAll('.nav-link:not(.dropdown-toggle)').forEach((link) => {
      link.addEventListener('click', () => {
        const bsCollapse = bootstrap.Collapse.getInstance(navCollapse);
        if (bsCollapse) bsCollapse.hide();
      });
    });
  }

  // ---------------------------------------------------------------------------
  // HTMX After-Swap Animations & Toast Events
  // ---------------------------------------------------------------------------

  document.addEventListener('htmx:afterSwap', (event) => {
    const target = event.detail.target;
    if (!target) return;

    target.classList.add('htmx-swapping-in');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.remove('htmx-swapping-in');
      });
    });

    autoDismissFlashMessages(target);
  });

  // Listen for custom toast events from HTMX response headers
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

    setTimeout(() => {
      if (toast.parentNode) toast.remove();
    }, 500);
  }

  window.showToast = showToast;

  // ---------------------------------------------------------------------------
  // Auto-Dismiss Flash Messages
  // ---------------------------------------------------------------------------

  function autoDismissFlashMessages(root = document) {
    const flashes = root.querySelectorAll('.flash-message, .flash-alert');
    flashes.forEach((flash) => {
      if (flash.dataset.autoDismiss === 'true') return;
      flash.dataset.autoDismiss = 'true';

      setTimeout(() => {
        flash.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        flash.style.opacity = '0';
        flash.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          if (flash.parentNode) flash.remove();
        }, 400);
      }, 5000);
    });
  }

  // ---------------------------------------------------------------------------
  // Currency Formatting Utility
  // ---------------------------------------------------------------------------

  function formatTZS(num) {
    const n = Number(num);
    if (Number.isNaN(n)) return 'TZS 0';

    const formatted = Math.round(n)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return `TZS ${formatted}`;
  }

  window.formatTZS = formatTZS;

  // ---------------------------------------------------------------------------
  // Initialise on DOM Ready
  // ---------------------------------------------------------------------------

  function init() {
    initScrollHandler();
    initMobileNavClose();
    autoDismissFlashMessages();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
