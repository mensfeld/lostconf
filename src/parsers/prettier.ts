/**
 * Parser for Prettier ignore files
 */

import { createIgnoreParser } from './gitignore.js';

/** Prettier ignore file parser (same format as .gitignore) */
export const prettierIgnoreParser = createIgnoreParser('prettierignore', [
  '.prettierignore',
  '**/.prettierignore'
]);
