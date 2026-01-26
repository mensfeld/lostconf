/**
 * Parser for ESLint flat config files
 * https://eslint.org/docs/latest/use/configure/configuration-files
 * Note: Only supports JSON format for safety. JS/MJS/CJS require code execution.
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

interface ESLintFlatConfig {
  ignores?: string[];
  files?: string[];
  [key: string]: unknown;
}

type ESLintFlatConfigArray = ESLintFlatConfig[];

/** Parse eslint.config.json and extract patterns */
function parseESLintFlat(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: ESLintFlatConfigArray | ESLintFlatConfig;
  try {
    config = JSON.parse(content);
  } catch {
    return patterns;
  }

  // Config can be an array or a single object
  const configs = Array.isArray(config) ? config : [config];

  const lineMap = buildLineMap(content);

  for (const configObj of configs) {
    if (!configObj || typeof configObj !== 'object') continue;

    // Extract ignores patterns
    if (Array.isArray(configObj.ignores)) {
      for (const value of configObj.ignores) {
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

    // Extract files patterns
    if (Array.isArray(configObj.files)) {
      for (const value of configObj.files) {
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

/** ESLint flat config parser (JSON only) */
export const eslintFlatParser: Parser = {
  name: 'eslint-flat',
  filePatterns: ['eslint.config.json', '**/eslint.config.json'],
  parse: parseESLintFlat
};
