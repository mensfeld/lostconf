/**
 * Parser for YARD-Lint configuration files
 * https://github.com/mensfeld/yard-lint
 */

import { parse as parseYaml } from 'yaml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

interface YardLintValidator {
  Exclude?: string[];
  ExcludedMethods?: string[];
  [key: string]: unknown;
}

interface YardLintConfig {
  AllValidators?: {
    Exclude?: string[];
    [key: string]: unknown;
  };
  [validatorName: string]: unknown;
}

/** Parse YARD-Lint configuration */
function parseYardLint(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: YardLintConfig;
  try {
    config = parseYaml(content) as YardLintConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract global exclusions from AllValidators
  if (config.AllValidators && typeof config.AllValidators === 'object') {
    if (Array.isArray(config.AllValidators.Exclude)) {
      for (const value of config.AllValidators.Exclude) {
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
  }

  // Extract per-validator exclusions
  for (const [key, value] of Object.entries(config)) {
    // Skip AllValidators (already processed) and non-object values
    if (key === 'AllValidators' || typeof value !== 'object' || value === null) {
      continue;
    }

    const validator = value as YardLintValidator;

    // Extract Exclude patterns
    if (Array.isArray(validator.Exclude)) {
      for (const pattern of validator.Exclude) {
        if (typeof pattern !== 'string') continue;

        const lineInfo = lineMap.get(pattern);
        const type = isGlobPattern(pattern) ? PatternType.GLOB : PatternType.PATH;

        patterns.push({
          value: pattern,
          type,
          line: lineInfo?.line ?? 1,
          column: lineInfo?.column
        });
      }
    }

    // Note: ExcludedMethods contains method signatures, not file paths,
    // but we could track them if needed in the future
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

/** YARD-Lint config parser */
export const yardLintParser: Parser = {
  name: 'yard-lint',
  filePatterns: ['.yard-lint.yml', '**/.yard-lint.yml'],
  parse: parseYardLint
};
