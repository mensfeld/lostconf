/**
 * Parser for pre-commit configuration files
 * https://pre-commit.com/
 */

import { parse as parseYaml } from 'yaml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { looksLikeRegex } from '../validator/regex.js';

interface PreCommitHook {
  id: string;
  files?: string;
  exclude?: string;
  types?: string[];
  exclude_types?: string[];
}

interface PreCommitRepo {
  repo: string;
  hooks: PreCommitHook[];
}

interface PreCommitConfig {
  repos?: PreCommitRepo[];
  exclude?: string;
  files?: string;
  default_language_version?: Record<string, string>;
}

/** Parse .pre-commit-config.yaml */
function parsePreCommit(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: PreCommitConfig;
  try {
    config = parseYaml(content) as PreCommitConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract top-level exclude pattern (regex)
  if (config.exclude) {
    addPattern(patterns, config.exclude, lineMap);
  }

  // Extract top-level files pattern (regex)
  if (config.files) {
    addPattern(patterns, config.files, lineMap);
  }

  // Extract patterns from repo hooks
  if (Array.isArray(config.repos)) {
    for (const repo of config.repos) {
      if (!repo || typeof repo !== 'object') continue;

      if (Array.isArray(repo.hooks)) {
        for (const hook of repo.hooks) {
          if (!hook || typeof hook !== 'object') continue;

          // Extract files pattern (regex)
          if (hook.files) {
            addPattern(patterns, hook.files, lineMap);
          }

          // Extract exclude pattern (regex)
          if (hook.exclude) {
            addPattern(patterns, hook.exclude, lineMap);
          }
        }
      }
    }
  }

  return patterns;
}

function addPattern(
  patterns: Pattern[],
  value: string,
  lineMap: Map<string, { line: number; column?: number }>
): void {
  const lineInfo = lineMap.get(value);

  // pre-commit uses regex patterns for files/exclude
  const type = looksLikeRegex(value) ? PatternType.REGEX : PatternType.PATH;

  patterns.push({
    value,
    type,
    line: lineInfo?.line ?? 1,
    column: lineInfo?.column
  });
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

    // Match unquoted values after colon
    const unquotedMatch = line.match(/:\s*([^\s#]+)/);
    if (unquotedMatch && unquotedMatch[1]) {
      const value = unquotedMatch[1];
      if (!map.has(value)) {
        map.set(value, { line: lineNum, column: (unquotedMatch.index ?? 0) + 1 });
      }
    }
  }

  return map;
}

/** pre-commit config parser */
export const preCommitParser: Parser = {
  name: 'pre-commit',
  filePatterns: ['.pre-commit-config.yaml', '.pre-commit-config.yml', '**/.pre-commit-config.yaml'],
  parse: parsePreCommit
};
