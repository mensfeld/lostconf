/**
 * Parser for Markdown linter configuration (.markdownlint.json, .markdownlintignore)
 */

import { createIgnoreParser } from './gitignore.js';

/** Markdownlint ignore parser (same format as .gitignore) */
export const markdownlintIgnoreParser = createIgnoreParser('markdownlintignore', [
  '.markdownlintignore',
  '**/.markdownlintignore'
]);
