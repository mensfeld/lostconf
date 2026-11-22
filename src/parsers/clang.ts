/**
 * Parser for C/C++ configuration files (.clang-format, .clang-tidy)
 */

import { parse as parseYaml } from 'yaml';
import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { looksLikeRegex } from '../validator/regex.js';

interface ClangTidyConfig {
  HeaderFilterRegex?: string;
  ExcludeHeaderFilterRegex?: string;
  Checks?: string;
  [key: string]: unknown;
}

/** Parse .clang-tidy and extract patterns */
function parseClangTidy(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];

  let config: ClangTidyConfig;
  try {
    config = parseYaml(content) as ClangTidyConfig;
  } catch {
    return patterns;
  }

  if (!config || typeof config !== 'object') {
    return patterns;
  }

  const lineMap = buildLineMap(content);

  // Extract header filter regexes
  if (typeof config.HeaderFilterRegex === 'string') {
    const value = config.HeaderFilterRegex;
    const lineInfo = lineMap.get(value);

    patterns.push({
      value,
      type: looksLikeRegex(value) ? PatternType.REGEX : PatternType.GLOB,
      line: lineInfo?.line ?? 1,
      column: lineInfo?.column
    });
  }

  if (typeof config.ExcludeHeaderFilterRegex === 'string') {
    const value = config.ExcludeHeaderFilterRegex;
    const lineInfo = lineMap.get(value);

    patterns.push({
      value,
      type: looksLikeRegex(value) ? PatternType.REGEX : PatternType.GLOB,
      line: lineInfo?.line ?? 1,
      column: lineInfo?.column
    });
  }

  return patterns;
}

/** Parse .clang-format */
function parseClangFormat(_filename: string, _content: string): Pattern[] {
  // No key holds a file path: `IncludeCategories` `Regex` matches the `#include` spelling
  // (e.g. `^<gtest/.*>`) and `SortIncludes` holds a sort mode.
  return [];
}

function buildLineMap(content: string): Map<string, { line: number; column?: number }> {
  const map = new Map<string, { line: number; column?: number }>();
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    const stringMatches = line.matchAll(/["']([^"']+)["']/g);
    for (const match of stringMatches) {
      const value = match[1];
      if (value && !map.has(value)) {
        map.set(value, { line: lineNum, column: (match.index ?? 0) + 1 });
      }
    }
  }

  return map;
}

/** Clang-Tidy parser */
export const clangTidyParser: Parser = {
  name: 'clang-tidy',
  filePatterns: ['.clang-tidy', '**/.clang-tidy'],
  parse: parseClangTidy
};

/** Clang-Format parser */
export const clangFormatParser: Parser = {
  name: 'clang-format',
  filePatterns: ['.clang-format', '**/.clang-format', '_clang-format', '**/_clang-format'],
  parse: parseClangFormat
};
