import type { ReactElement } from 'react';
import { createElement } from 'react';

/**
 * Splits text around matching segments of the query and returns an array
 * of React elements with <mark> highlighting on matched portions.
 *
 * If query is empty or not found, returns the original text wrapped in a span.
 */
export function highlightText(
  text: string,
  query: string
): ReactElement {
  if (!query || query.length < 2) {
    return createElement('span', null, text);
  }

  // Escape regex special characters in the query
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) {
    return createElement('span', null, text);
  }

  const children = parts.map((part, i) => {
    if (regex.test(part)) {
      // Reset lastIndex since we reuse the regex with 'g' flag
      regex.lastIndex = 0;
      return createElement(
        'mark',
        {
          key: i,
          className: 'bg-[#C5A258]/30 text-inherit rounded-sm px-0.5',
        },
        part
      );
    }
    // Reset lastIndex for next iteration
    regex.lastIndex = 0;
    return createElement('span', { key: i }, part);
  });

  return createElement('span', null, ...children);
}

/**
 * Returns a plain-text snippet of the text around the first match,
 * useful for showing context in search result subtitles.
 */
export function getMatchSnippet(text: string, query: string, contextChars: number = 40): string {
  if (!query || query.length < 2) return text.slice(0, contextChars * 2);

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);

  if (idx === -1) return text.slice(0, contextChars * 2);

  const start = Math.max(0, idx - contextChars);
  const end = Math.min(text.length, idx + query.length + contextChars);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < text.length ? '...' : '';

  return `${prefix}${text.slice(start, end)}${suffix}`;
}
