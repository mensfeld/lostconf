/**
 * Parser for Bandit configuration files
 * Bandit is a security linter for Python
 */

import { parse as parseYaml } from 'yaml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

type BanditConfig = {
  exclude_dirs?: string[];
  exclude?: string[];
  skips?: string[];
  tests?: string[];
  [key: string]: unknown;
};

/** Parse .bandit file */
function parseBandit(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: BanditConfig;
  try {
    config = parseYaml(content) as BanditConfig;
  } catch {
    return patterns;
  }

  // Build line map for accurate line numbers
  const lineMap = buildLineMap(content);

  // Extract patterns from exclude_dirs and exclude
  // `tests` and `skips` are skipped: they hold test IDs (e.g. B201), not file paths
  const sections = [config.exclude_dirs, config.exclude];

  for (const section of sections) {
    if (!section || !Array.isArray(section)) continue;

    for (const pattern of section) {
      if (typeof pattern !== 'string') continue;

      const lineInfo = lineMap.get(pattern);
      const line = lineInfo?.line ?? 1;
      const column = lineInfo?.column;

      const type = isGlobPattern(pattern) ? PatternType.GLOB : PatternType.PATH;

      patterns.push({
        value: pattern,
        type,
        line,
        column
      });
    }
  }

  return patterns;
}

/** Build a map of string values to their line numbers */
function buildLineMap(content: string): Map<string, { line: number; column?: number }> {
  const map = new Map<string, { line: number; column?: number }>();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match quoted or unquoted values in YAML
    const matches = line.matchAll(/[-:]\s*["']?([^"'\n]+)["']?/g);
    for (const match of matches) {
      const value = match[1]?.trim();
      if (value && !map.has(value)) {
        map.set(value, { line: lineNum, column: (match.index ?? 0) + 1 });
      }
    }
  }

  return map;
}

/** Bandit .bandit file parser */
export const banditParser: Parser = {
  name: 'bandit',
  filePatterns: ['.bandit', '**/.bandit'],
  parse: parseBandit
};
