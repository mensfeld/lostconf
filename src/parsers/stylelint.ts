/**
 * Parser for Stylelint configuration (.stylelintignore, .stylelintrc)
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';
import { createIgnoreParser } from './gitignore.js';

/** Parse .stylelintrc.json and extract ignoreFiles patterns */
function parseStylelintRc(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: { ignoreFiles?: string | string[] };
  try {
    config = JSON.parse(content) as { ignoreFiles?: string | string[] };
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  if (config.ignoreFiles) {
    const ignoreFiles = Array.isArray(config.ignoreFiles)
      ? config.ignoreFiles
      : [config.ignoreFiles];

    for (const value of ignoreFiles) {
      if (typeof value !== 'string') continue;
      const lineInfo = lineMap.get(value);
      const type = isGlobPattern(value) ? PatternType.GLOB : PatternType.PATH;

      patterns.push({
        value,
        type,
        line: lineInfo?.line ?? 1,
        column: lineInfo?.column
      });
    }
  }

  return patterns;
}

function buildLineMap(content: string): Map<string, { line: number; column?: number }> {
  const map = new Map<string, { line: number; column?: number }>();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const stringMatches = line.matchAll(/"([^"]+)"/g);
    for (const match of stringMatches) {
      const value = match[1];
      if (value && !map.has(value)) {
        map.set(value, { line: lineNum, column: (match.index ?? 0) + 1 });
      }
    }
  }

  return map;
}

/** Stylelint ignore parser (same format as .gitignore) */
export const stylelintIgnoreParser = createIgnoreParser('stylelintignore', [
  '.stylelintignore',
  '**/.stylelintignore'
]);

/** Stylelint RC parser */
export const stylelintRcParser: Parser = {
  name: 'stylelintrc',
  filePatterns: ['.stylelintrc', '.stylelintrc.json', '**/.stylelintrc', '**/.stylelintrc.json'],
  parse: parseStylelintRc
};
