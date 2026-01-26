/**
 * Parser for commitlint configuration files
 * https://commitlint.js.org/
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { looksLikeRegex } from '../validator/regex.js';

interface CommitlintConfig {
  ignores?: ((commit: string) => boolean | string)[];
  defaultIgnores?: boolean;
  rules?: Record<string, unknown>;
  extends?: string[];
}

/** Parse commitlint config and extract patterns */
function parseCommitlintConfig(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: CommitlintConfig;
  try {
    config = JSON.parse(content) as CommitlintConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract ignores patterns (regex strings for commit message patterns)
  if (Array.isArray(config.ignores)) {
    for (const value of config.ignores) {
      // Ignores can be functions or strings in JS, but in JSON they'll be strings
      if (typeof value !== 'string') continue;
      const lineInfo = lineMap.get(value);

      // Commit message patterns are typically regexes
      const type = looksLikeRegex(value) ? PatternType.REGEX : PatternType.PATH;

      patterns.push({
        value,
        type,
        line: lineInfo?.line ?? 1,
        column: lineInfo?.column
      });
    }
  }

  // Extract extends (package names or file paths)
  if (Array.isArray(config.extends)) {
    for (const value of config.extends) {
      if (typeof value !== 'string') continue;

      // Skip npm package names (start with @ or don't start with . or /)
      // Only include relative paths (./...) or absolute paths (/...)
      if (value.startsWith('@') || (!value.startsWith('.') && !value.startsWith('/'))) {
        continue;
      }

      const lineInfo = lineMap.get(value);

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

/** commitlint config parser */
export const commitlintParser: Parser = {
  name: 'commitlint',
  filePatterns: [
    '.commitlintrc',
    '.commitlintrc.json',
    '**/.commitlintrc',
    '**/.commitlintrc.json'
  ],
  parse: parseCommitlintConfig
};
