/**
 * Parser for Brakeman configuration files
 * https://brakemanscanner.org/
 */

import { parse as parseYaml } from 'yaml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

interface BrakemanConfig {
  'skip-files'?: string[];
  'only-files'?: string[];
  [key: string]: unknown;
}

/** Parse Brakeman configuration */
function parseBrakeman(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: BrakemanConfig;
  try {
    config = parseYaml(content) as BrakemanConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract skip-files patterns
  if (Array.isArray(config['skip-files'])) {
    for (const value of config['skip-files']) {
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

  // Extract only-files patterns
  if (Array.isArray(config['only-files'])) {
    for (const value of config['only-files']) {
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

/** Brakeman config parser */
export const brakemanParser: Parser = {
  name: 'brakeman',
  filePatterns: ['config/brakeman.yml', '.brakeman.yml', '**/config/brakeman.yml'],
  parse: parseBrakeman
};
