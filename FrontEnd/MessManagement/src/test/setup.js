import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

// jsdom implements neither scrolling API, and the form scrolls to the first
// invalid field (and to the top after a successful submit). Without these the
// form's own error handling would throw inside jsdom and hide real failures.
window.HTMLElement.prototype.scrollIntoView = function scrollIntoView() {};
window.scrollTo = () => {};

// jsdom has no layout engine: it reports every media query as non-matching. MUI
// reads those queries (breakpoints, pointer capability) and a non-matching
// min-width query makes the date picker render its read-only mobile field. Report
// a desktop viewport so the components are exercised in their real desktop mode.
if (!window.matchMedia || !window.matchMedia('(min-width: 1024px)').matches) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query) => {
      const minWidth = /min-width:\s*(\d+)px/.exec(query);
      const maxWidth = /max-width:\s*(\d+)px/.exec(query);
      const matches = minWidth
        ? Number(minWidth[1]) <= 1440
        : maxWidth
          ? Number(maxWidth[1]) >= 1440
          : /pointer:\s*coarse|hover:\s*none/.test(query)
            ? false
            : true;

      return {
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      };
    },
  });
}
