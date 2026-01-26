/**
 * Parser for alex (inclusive language linter) configuration files
 * https://alexjs.com/
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

/** Parse .alexignore file (same format as .gitignore) */
function parseAlexIgnore(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Check for negation
    let patternValue = trimmed;
    let negated = false;
    if (patternValue.startsWith('!')) {
      negated = true;
      patternValue = patternValue.slice(1);
    }

    // Determine pattern type
    const type = isGlobPattern(patternValue) ? PatternType.GLOB : PatternType.PATH;

    patterns.push({
      value: patternValue,
      type,
      line: lineNum,
      column: 1,
      negated
    });
  }

  return patterns;
}

/** Parse .alexrc/.alexrc.json configuration */
function parseAlexRc(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: { allow?: string[] };
  try {
    config = JSON.parse(content);
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract 'allow' patterns - these are words/phrases to allow
  if (Array.isArray(config.allow)) {
    for (const value of config.allow) {
      if (typeof value !== 'string') continue;
      const lineInfo = lineMap.get(value);

      // Allow patterns are typically simple strings (words/phrases), not file paths
      // We'll treat them as PATH type for validation purposes
      patterns.push({
        value,
        type: PatternType.PATH,
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

/** alex ignore file parser */
export const alexIgnoreParser: Parser = {
  name: 'alexignore',
  filePatterns: ['.alexignore', '**/.alexignore'],
  parse: parseAlexIgnore
};

/** alex config file parser */
export const alexRcParser: Parser = {
  name: 'alexrc',
  filePatterns: ['.alexrc', '.alexrc.json', '**/.alexrc', '**/.alexrc.json'],
  parse: parseAlexRc
};
