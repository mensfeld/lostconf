/**
 * Parser for lint-staged configuration files
 * https://github.com/lint-staged/lint-staged
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

type LintStagedConfig = Record<string, string | string[]>;

/** Parse lint-staged config and extract patterns */
function parseLintStagedConfig(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: LintStagedConfig;
  try {
    config = JSON.parse(content) as LintStagedConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // In lint-staged, the keys are glob patterns matching files
  // The values are commands to run (which we don't need to validate)
  for (const key of Object.keys(config)) {
    // Skip non-pattern keys (like $schema, etc.)
    if (key.startsWith('$')) {
      continue;
    }

    const lineInfo = lineMap.get(key);
    const type = isGlobPattern(key) ? PatternType.GLOB : PatternType.PATH;

    patterns.push({
      value: key,
      type,
      line: lineInfo?.line ?? 1,
      column: lineInfo?.column
    });
  }

  return patterns;
}

function buildLineMap(content: string): Map<string, { line: number; column?: number }> {
  const map = new Map<string, { line: number; column?: number }>();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match both property names and string values
    const keyMatches = line.matchAll(/"([^"]+)":/g);
    for (const match of keyMatches) {
      const value = match[1];
      if (value && !map.has(value)) {
        map.set(value, { line: lineNum, column: (match.index ?? 0) + 1 });
      }
    }

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

/** lint-staged config parser */
export const lintStagedParser: Parser = {
  name: 'lint-staged',
  filePatterns: [
    '.lintstagedrc',
    '.lintstagedrc.json',
    '**/.lintstagedrc',
    '**/.lintstagedrc.json'
  ],
  parse: parseLintStagedConfig
};
