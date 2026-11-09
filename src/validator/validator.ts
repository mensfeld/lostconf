/**
 * Pattern validation engine
 */

import path from 'path';
import type { Pattern, Finding, StaleReason } from '../core/types.js';
import { PatternType } from '../core/types.js';
import { pathExists } from '../filetree/tree.js';
import type { FileTree } from '../filetree/tree.js';
import { globMatches, isValidGlob } from './glob.js';
import type { GlobMatchOptions } from './glob.js';
import { regexMatches, isValidRegex } from './regex.js';
import { classifySeverity } from '../core/severity.js';

export interface ValidatorOptions {
  /** Base path for relative patterns in the config file */
  configBasePath?: string;
}

/** Validate a pattern against the file tree */
export function validatePattern(
  pattern: Pattern,
  tree: FileTree,
  options: ValidatorOptions = {}
): { valid: boolean; reason?: StaleReason } {
  // Skip negated patterns - they don't need to match anything
  if (pattern.negated) {
    return { valid: true };
  }

  const { configBasePath } = options;
  const files = Array.from(tree.files);

  if (pattern.anyDepth && pattern.type === PatternType.PATH) {
    return validateAnyDepthPathPattern(pattern.value, tree, configBasePath);
  }

  // Resolve pattern relative to config file location
  let resolvedPattern = pattern.anyDepth ? path.join('**', pattern.value) : pattern.value;
  if (configBasePath && !path.isAbsolute(pattern.value)) {
    resolvedPattern = path.join(configBasePath, resolvedPattern);
  }

  switch (pattern.type) {
    case PatternType.PATH:
      return validatePathPattern(resolvedPattern, tree);

    case PatternType.GLOB: {
      const globOptions = { anchored: pattern.anchored, literalBang: pattern.literalBang };
      if (!pattern.matchDirectories) {
        return validateGlobPattern(resolvedPattern, files, globOptions);
      }
      if (resolvedPattern.endsWith('/')) {
        return validateGlobPattern(
          resolvedPattern.replace(/\/+$/, ''),
          Array.from(tree.directories),
          globOptions
        );
      }
      return validateGlobPattern(resolvedPattern, [...files, ...tree.directories], globOptions);
    }

    case PatternType.REGEX:
      return validateRegexPattern(resolvedPattern, files);

    default:
      return { valid: true };
  }
}

/** Validate a path name that matches at any depth below the config directory */
function validateAnyDepthPathPattern(
  patternValue: string,
  tree: FileTree,
  configBasePath = '.'
): { valid: boolean; reason?: StaleReason } {
  if (pathExists(tree, path.join(configBasePath, patternValue))) {
    return { valid: true };
  }

  const directoryOnly = patternValue.endsWith('/');
  const suffix = '/' + patternValue.replace(/\/+$/, '');
  const prefix = configBasePath === '.' ? '' : configBasePath + '/';
  const matches = (entry: string) => entry.startsWith(prefix) && entry.endsWith(suffix);

  for (const dir of tree.directories) {
    if (matches(dir)) {
      return { valid: true };
    }
  }
  if (!directoryOnly) {
    for (const file of tree.files) {
      if (matches(file)) {
        return { valid: true };
      }
    }
  }
  return { valid: false, reason: 'file_not_found' };
}

/** Validate an exact path pattern */
function validatePathPattern(
  patternValue: string,
  tree: FileTree
): { valid: boolean; reason?: StaleReason } {
  if (pathExists(tree, patternValue)) {
    return { valid: true };
  }
  return { valid: false, reason: 'file_not_found' };
}

/** Validate a glob pattern */
function validateGlobPattern(
  patternValue: string,
  files: string[],
  globOptions: GlobMatchOptions = {}
): { valid: boolean; reason?: StaleReason } {
  if (!isValidGlob(patternValue)) {
    return { valid: false, reason: 'invalid_pattern' };
  }

  const matches = globMatches(patternValue, files, globOptions);
  if (matches.length > 0) {
    return { valid: true };
  }
  return { valid: false, reason: 'no_matches' };
}

/** Validate a regex pattern */
function validateRegexPattern(
  patternValue: string,
  files: string[]
): { valid: boolean; reason?: StaleReason } {
  if (!isValidRegex(patternValue)) {
    return { valid: false, reason: 'invalid_pattern' };
  }

  const matches = regexMatches(patternValue, files);
  if (matches.length > 0) {
    return { valid: true };
  }
  return { valid: false, reason: 'no_matches' };
}

/** Validate all patterns from a config file */
export function validatePatterns(
  configFile: string,
  patterns: Pattern[],
  parserName: string,
  tree: FileTree
): Finding[] {
  const findings: Finding[] = [];
  const configBasePath = path.dirname(configFile);

  for (const pattern of patterns) {
    const result = validatePattern(pattern, tree, { configBasePath });

    if (!result.valid && result.reason) {
      const severity = classifySeverity(pattern.value, parserName, configFile);

      findings.push({
        file: configFile,
        line: pattern.line,
        column: pattern.column,
        pattern: pattern.value,
        type: pattern.type,
        reason: result.reason,
        parser: parserName,
        severity
      });
    }
  }

  return findings;
}
