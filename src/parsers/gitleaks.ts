/**
 * Parser for Gitleaks configuration files
 * Gitleaks is a SAST tool for detecting and preventing hardcoded secrets
 */

import { parse as parseToml } from 'smol-toml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';
import { looksLikeRegex } from '../validator/regex.js';

type TomlValue = Record<string, unknown>;

/** Parse .gitleaks.toml file */
function parseGitleaks(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let toml: TomlValue;
  try {
    toml = parseToml(content) as TomlValue;
  } catch {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract allowlist paths
  const allowlist = toml.allowlist as TomlValue | undefined;
  if (allowlist) {
    const paths = allowlist.paths as string[] | undefined;
    if (paths && Array.isArray(paths)) {
      for (const path of paths) {
        if (typeof path !== 'string') continue;

        const lineInfo = lineMap.get(path);
        const line = lineInfo?.line ?? 1;
        const column = lineInfo?.column;

        // Determine type
        let type: PatternType;
        if (looksLikeRegex(path)) {
          type = PatternType.REGEX;
        } else if (isGlobPattern(path)) {
          type = PatternType.GLOB;
        } else {
          type = PatternType.PATH;
        }

        patterns.push({
          value: path,
          type,
          line,
          column
        });
      }
    }

    // `regexes` is skipped: gitleaks matches it against the secret, not a path
  }

  // Extract rules with path filters
  const rules = toml.rules as TomlValue[] | undefined;
  if (rules && Array.isArray(rules)) {
    for (const rule of rules) {
      const allowlistRule = rule.allowlist as TomlValue | undefined;
      if (!allowlistRule) continue;

      const paths = allowlistRule.paths as string[] | undefined;
      if (paths && Array.isArray(paths)) {
        for (const path of paths) {
          if (typeof path !== 'string') continue;

          const lineInfo = lineMap.get(path);
          const line = lineInfo?.line ?? 1;
          const column = lineInfo?.column;

          let type: PatternType;
          if (looksLikeRegex(path)) {
            type = PatternType.REGEX;
          } else if (isGlobPattern(path)) {
            type = PatternType.GLOB;
          } else {
            type = PatternType.PATH;
          }

          patterns.push({
            value: path,
            type,
            line,
            column
          });
        }
      }
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

    // Match quoted strings in TOML
    const stringMatches = line.matchAll(/"([^"]+)"|'([^']+)'/g);
    for (const match of stringMatches) {
      const value = match[1] || match[2];
      if (value && !map.has(value)) {
        map.set(value, { line: lineNum, column: (match.index ?? 0) + 1 });
      }
    }
  }

  return map;
}

/** Gitleaks configuration parser */
export const gitleaksParser: Parser = {
  name: 'gitleaks',
  filePatterns: ['.gitleaks.toml', 'gitleaks.toml', '**/.gitleaks.toml'],
  parse: parseGitleaks
};
