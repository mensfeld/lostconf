/**
 * Parser for Elixir linter configuration (.credo.exs)
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';
import { looksLikeRegex } from '../validator/regex.js';

const SIGIL_CLOSERS: Record<string, string> = { '{': '}', '[': ']', '(': ')', '<': '>' };

/**
 * Offset ranges of every `files: %{...}` map and `requires: [...]` list. Only they hold files
 * (`included`/`excluded` filters, required check sources); every other `~r` (e.g. a check's
 * `ignore_names`) matches module or other names.
 */
function findFileKeyRanges(content: string): [number, number][] {
  const ranges: [number, number][] = [];
  const open: { start: number; depth: number }[] = [];
  const fileKey = /(?:files:\s*%\{|requires:\s*\[)/y;
  let depth = 0;
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (char === '#') {
      const end = content.indexOf('\n', i);
      i = end === -1 ? content.length : end;
      continue;
    }

    if (char === '"' || char === "'") {
      i = skipDelimited(content, i + 1, char);
      continue;
    }

    if (char === '~' && /[a-zA-Z]/.test(content[i + 1] ?? '')) {
      const opener = content[i + 2] ?? '';
      i = skipDelimited(content, i + 3, SIGIL_CLOSERS[opener] ?? opener);
      continue;
    }

    fileKey.lastIndex = i;
    if (!/\w/.test(content[i - 1] ?? '') && fileKey.test(content)) {
      open.push({ start: i, depth });
      depth++;
      i = fileKey.lastIndex;
      continue;
    }

    if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      const current = open[open.length - 1];
      if (current && current.depth === depth) {
        open.pop();
        ranges.push([current.start, i]);
      }
    }
    i++;
  }

  return ranges;
}

/** Index just past the unescaped `closer` that ends a string or sigil body starting at `from` */
function skipDelimited(content: string, from: number, closer: string): number {
  for (let i = from; i < content.length; i++) {
    if (content[i] === '\\') {
      i++;
    } else if (content[i] === closer) {
      return i + 1;
    }
  }
  return content.length;
}

/** Parse .credo.exs and extract patterns */
function parseCredoConfig(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];
  const lines = content.split('\n');
  const ranges = findFileKeyRanges(content);
  const inFileKey = (offset: number) =>
    ranges.some(([start, end]) => offset > start && offset < end);
  let lineStart = 0;

  // files: %{included: ["lib/"], excluded: [~r"/_build/"]}, requires: ["./checks/*.ex"]

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    const offset = lineStart;
    lineStart += line.length + 1;

    // Match Elixir regex patterns ~r"..." or ~r/.../ or ~r{...}
    const regexMatches = line.matchAll(/~r["/{}]([^"/{}]+)["/{}]/g);
    for (const match of regexMatches) {
      const value = match[1];
      if (!value || !inFileKey(offset + (match.index ?? 0))) continue;

      patterns.push({
        value,
        type: looksLikeRegex(value) ? PatternType.REGEX : PatternType.GLOB,
        line: lineNum,
        column: (match.index ?? 0) + 1
      });
    }

    // Match quoted strings that look like paths
    const stringMatches = line.matchAll(/"([^"]+)"/g);
    for (const match of stringMatches) {
      const value = match[1];
      if (!value || !inFileKey(offset + (match.index ?? 0))) continue;

      // Skip if it's part of a config key or looks like a URL
      if (value.includes(':') || value.startsWith('http')) continue;

      // Only include if it looks like a path or glob
      if (value.includes('/') || isGlobPattern(value)) {
        const type = isGlobPattern(value) ? PatternType.GLOB : PatternType.PATH;

        patterns.push({
          value,
          type,
          line: lineNum,
          column: (match.index ?? 0) + 1
        });
      }
    }
  }

  return patterns;
}

/** Credo parser */
export const credoParser: Parser = {
  name: 'credo',
  filePatterns: ['.credo.exs', '**/.credo.exs'],
  parse: parseCredoConfig
};
