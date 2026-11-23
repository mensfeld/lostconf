/**
 * Parser for pyproject.toml files
 */

import { parse as parseToml } from 'smol-toml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

type TomlValue = Record<string, unknown>;

/**
 * Known path/pattern fields in pyproject.toml. pytest `python_classes`/`python_functions`
 * (test names) and coverage `exclude_lines` (source lines) are not paths and are left out.
 */
const PATTERN_FIELDS = [
  // pytest
  'tool.pytest.ini_options.testpaths',
  'tool.pytest.ini_options.python_files',
  'tool.pytest.ini_options.norecursedirs',
  // coverage
  'tool.coverage.run.source',
  'tool.coverage.run.omit',
  'tool.coverage.run.include',
  'tool.coverage.report.omit',
  // mypy
  'tool.mypy.exclude',
  'tool.mypy.files',
  // ruff
  'tool.ruff.exclude',
  'tool.ruff.extend-exclude',
  'tool.ruff.include',
  'tool.ruff.lint.exclude',
  // black
  'tool.black.exclude',
  'tool.black.extend-exclude',
  'tool.black.include',
  // isort
  'tool.isort.skip',
  'tool.isort.skip_glob',
  'tool.isort.src_paths'
];

/** Parse pyproject.toml and extract patterns */
function parsePyproject(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let toml: TomlValue;
  try {
    toml = parseToml(content) as TomlValue;
  } catch {
    return patterns;
  }

  // Track line numbers by parsing the raw content
  const lineMap = buildLineMap(content);

  for (const fieldPath of PATTERN_FIELDS) {
    const value = getNestedValue(toml, fieldPath);
    if (!value) continue;

    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      if (typeof v !== 'string') continue;

      const lineInfo = lineMap.get(v);
      const line = lineInfo?.line ?? 1;
      const column = lineInfo?.column;

      const type = determinePatternType(v);

      patterns.push({
        value: v,
        type,
        line,
        column
      });
    }
  }

  return patterns;
}

/** Determine pattern type based on value */
function determinePatternType(value: string): PatternType {
  // Glob patterns
  if (isGlobPattern(value)) {
    return PatternType.GLOB;
  }

  // Default to path
  return PatternType.PATH;
}

/** Get a nested value from an object using dot notation */
function getNestedValue(obj: TomlValue, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/** Build a map of string values to their line numbers */
function buildLineMap(content: string): Map<string, { line: number; column?: number }> {
  const map = new Map<string, { line: number; column?: number }>();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match quoted strings
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

/** pyproject.toml parser */
export const pyprojectParser: Parser = {
  name: 'pyproject',
  filePatterns: ['pyproject.toml', '**/pyproject.toml'],
  parse: parsePyproject
};
