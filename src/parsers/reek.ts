/**
 * Parser for Reek configuration files
 * https://github.com/troessner/reek
 */

import { parse as parseYaml } from 'yaml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

interface ReekConfig {
  exclude_paths?: string[];
  [key: string]: unknown;
}

/** Parse Reek configuration */
function parseReek(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: ReekConfig;
  try {
    config = parseYaml(content) as ReekConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract exclude_paths
  if (Array.isArray(config.exclude_paths)) {
    for (const value of config.exclude_paths) {
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

    // Match YAML string values (quoted and unquoted)
    const quotedMatches = line.matchAll(/["']([^"']+)["']/g);
    for (const match of quotedMatches) {
      const value = match[1];
      if (value && !map.has(value)) {
        map.set(value, { line: lineNum, column: (match.index ?? 0) + 1 });
      }
    }

    // Match unquoted list items
    const listItemMatch = line.match(/^\s*-\s+([^\s#]+)/);
    if (listItemMatch && listItemMatch[1]) {
      const value = listItemMatch[1];
      if (!map.has(value)) {
        map.set(value, { line: lineNum, column: (listItemMatch.index ?? 0) + 1 });
      }
    }
  }

  return map;
}

/** Reek config parser */
export const reekParser: Parser = {
  name: 'reek',
  filePatterns: ['.reek.yml', '.reek', 'config.reek', '**/.reek.yml'],
  parse: parseReek
};
