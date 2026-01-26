/**
 * Parser for oxlint configuration files
 * https://oxc.rs/docs/guide/usage/linter.html
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

interface OxlintConfig {
  ignorePatterns?: string[];
  rules?: Record<string, unknown>;
  plugins?: string[];
}

/** Parse .oxlintrc.json and extract patterns */
function parseOxlintConfig(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: OxlintConfig;
  try {
    config = JSON.parse(content) as OxlintConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract ignorePatterns
  if (Array.isArray(config.ignorePatterns)) {
    for (const value of config.ignorePatterns) {
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

/** Oxlint config parser */
export const oxlintParser: Parser = {
  name: 'oxlint',
  filePatterns: [
    '.oxlintrc.json',
    'oxlint.config.json',
    '**/.oxlintrc.json',
    '**/oxlint.config.json'
  ],
  parse: parseOxlintConfig
};
