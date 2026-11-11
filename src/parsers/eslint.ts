/**
 * Parser for ESLint ignore files and configs
 */

import { createIgnoreParser } from './gitignore.js';

/** ESLint ignore file parser (same format as .gitignore) */
export const eslintIgnoreParser = createIgnoreParser('eslintignore', [
  '.eslintignore',
  '**/.eslintignore'
]);
