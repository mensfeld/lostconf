/**
 * Parser for alex (inclusive language linter) configuration files
 * https://alexjs.com/
 */

import type { Pattern } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { createIgnoreParser } from './gitignore.js';

/** Parse .alexrc/.alexrc.json configuration */
function parseAlexRc(_filename: string, _content: string): Pattern[] {
  const patterns: Pattern[] = [];

  // Note: The 'allow' field in .alexrc contains linguistic terms (words/phrases),
  // not filesystem paths. These cannot be validated against the filesystem,
  // so we intentionally skip parsing them.
  // Example: ["boogeyman", "garbageman"] are words to allow, not file paths.

  return patterns;
}

/** alex ignore file parser (same format as .gitignore) */
export const alexIgnoreParser = createIgnoreParser('alexignore', ['.alexignore', '**/.alexignore']);

/** alex config file parser */
export const alexRcParser: Parser = {
  name: 'alexrc',
  filePatterns: ['.alexrc', '.alexrc.json', '**/.alexrc', '**/.alexrc.json'],
  parse: parseAlexRc
};
