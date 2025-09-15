// Reusable helper to scroll the window to top and optionally focus an element
export function scrollToTop(options = {}) {
  const { behavior = 'auto', focusSelector = 'h2' } = options;
  try {
    if (typeof window !== 'undefined' && window.scrollTo) {
      window.scrollTo({ top: 0, left: 0, behavior });
    }

    if (focusSelector && typeof document !== 'undefined') {
      const el = document.querySelector(focusSelector);
      if (el && typeof el.focus === 'function') {
        // Ensure it's focusable for accessibility
        el.setAttribute('tabindex', '-1');
        el.focus({ preventScroll: true });
      }
    }
  } catch (e) {
    // best-effort, ignore failures
  }
}

export default scrollToTop;
