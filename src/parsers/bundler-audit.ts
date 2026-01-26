/**
 * Parser for bundler-audit configuration files
 * https://github.com/rubysec/bundler-audit
 *
 * Note: bundler-audit's ignore field contains advisory IDs (CVE-YYYY-XXXX),
 * not file paths. These are tracked but cannot be validated against the filesystem.
 */

import { parse as parseYaml } from 'yaml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';

interface BundlerAuditConfig {
  ignore?: string[];
  [key: string]: unknown;
}

/** Parse bundler-audit configuration */
function parseBundlerAudit(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: BundlerAuditConfig;
  try {
    config = parseYaml(content) as BundlerAuditConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract ignore list (advisory IDs like CVE-2021-22885, OSVDB-108664, GHSA-xxx)
  // Note: These are not file paths, but we track them as PATH type patterns
  if (Array.isArray(config.ignore)) {
    for (const value of config.ignore) {
      if (typeof value !== 'string') continue;

      const lineInfo = lineMap.get(value);

      // Advisory IDs are not file paths, but we use PATH type for tracking
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

/** bundler-audit config parser */
export const bundlerAuditParser: Parser = {
  name: 'bundler-audit',
  filePatterns: ['.bundler-audit.yml', '**/.bundler-audit.yml'],
  parse: parseBundlerAudit
};
