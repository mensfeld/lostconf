/**
 * Parser for .gitignore, .dockerignore, and similar ignore files
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

/** Parse a gitignore-style file and extract patterns */
function parseIgnoreFile(
  filename: string,
  content: string,
  { rootOnly = false }: { rootOnly?: boolean } = {}
): Pattern[] {
  const patterns: Pattern[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip empty lines and comments
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Check for negation
    let patternValue = line.trimStart();
    let negated = false;
    if (patternValue.startsWith('!')) {
      negated = true;
      patternValue = patternValue.slice(1);
    }

    // Remove trailing spaces (unless escaped), then unescape an escaped one
    patternValue = patternValue.replace(/(?<!\\)\s+$/, '').replace(/\\ $/, ' ');

    // Unescape a leading # or !
    patternValue = patternValue.replace(/^\\([#!])/, '$1');

    // A leading / anchors the pattern to the ignore file's directory
    const anchored = patternValue.startsWith('/');
    if (anchored) {
      patternValue = patternValue.slice(1);
    }

    // Skip empty patterns after processing
    if (!patternValue) {
      continue;
    }

    // A leading ! left here was escaped and is literal
    const literalBang = patternValue.startsWith('!');

    // Determine pattern type
    const type = determinePatternType(literalBang ? patternValue.slice(1) : patternValue);

    // A pattern with no / other than a trailing one matches at any depth
    const anyDepth = !rootOnly && !anchored && !patternValue.replace(/\/+$/, '').includes('/');

    // Every pattern in a root-only file matches from the config directory, never by basename
    const rootAnchored = anchored || rootOnly;

    patterns.push({
      value: patternValue,
      type,
      line: lineNum,
      column: 1,
      negated,
      matchDirectories: true,
      ...(rootAnchored && { anchored: rootAnchored }),
      ...(anyDepth && { anyDepth }),
      ...(literalBang && { literalBang })
    });
  }

  return patterns;
}

/** Determine if a pattern is a path or glob */
function determinePatternType(pattern: string): PatternType {
  // Contains glob characters
  if (isGlobPattern(pattern)) {
    return PatternType.GLOB;
  }

  // Treat as path
  return PatternType.PATH;
}

/** Gitignore parser */
export const gitignoreParser: Parser = {
  name: 'gitignore',
  filePatterns: ['.gitignore', '**/.gitignore'],
  parse: parseIgnoreFile
};

/** Dockerignore parser (same format, every pattern is relative to the build context root) */
export const dockerignoreParser: Parser = {
  name: 'dockerignore',
  filePatterns: ['.dockerignore'],
  parse: (filename, content) => parseIgnoreFile(filename, content, { rootOnly: true })
};

/** Remarkignore parser (remark markdown processor) */
export const remarkignoreParser: Parser = {
  name: 'remarkignore',
  filePatterns: ['.remarkignore', '**/.remarkignore'],
  parse: parseIgnoreFile
};

/** Lycheeignore parser (lychee link checker) */
export const lycheeignoreParser: Parser = {
  name: 'lycheeignore',
  filePatterns: ['.lycheeignore', '**/.lycheeignore'],
  parse: parseIgnoreFile
};

/** Secretlintignore parser (secretlint) */
export const secretlintignoreParser: Parser = {
  name: 'secretlintignore',
  filePatterns: ['.secretlintignore', '**/.secretlintignore'],
  parse: parseIgnoreFile
};

/** Vscodeignore parser (VS Code extensions) */
export const vscodeignoreParser: Parser = {
  name: 'vscodeignore',
  filePatterns: ['.vscodeignore', '**/.vscodeignore'],
  parse: parseIgnoreFile
};

/** Ignoresecrets parser (git-leaks) */
export const ignoresecretsParser: Parser = {
  name: 'ignoresecrets',
  filePatterns: ['.ignoresecrets', '**/.ignoresecrets'],
  parse: parseIgnoreFile
};

/** Generic ignore file parser factory */
export function createIgnoreParser(name: string, filePatterns: string[]): Parser {
  return {
    name,
    filePatterns,
    parse: parseIgnoreFile
  };
}
