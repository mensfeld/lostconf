/**
 * Glob matching utilities using picomatch
 */

import picomatch from 'picomatch';

export interface GlobMatchOptions {
  /** Base directory for relative patterns */
  basePath?: string;
  /** Enable dot file matching */
  dot?: boolean;
  /** Match from the root only, never by basename */
  anchored?: boolean;
  /** Treat a leading ! as a literal character, not a negation */
  literalBang?: boolean;
}

/** Check if any files match a glob pattern */
export function globMatches(
  pattern: string,
  files: string[],
  options: GlobMatchOptions = {}
): string[] {
  const { dot = true, anchored = false, literalBang = false } = options;

  // Normalize pattern
  let normalizedPattern = pattern.replace(/\\/g, '/');

  // Remove leading ./ if present
  if (normalizedPattern.startsWith('./')) {
    normalizedPattern = normalizedPattern.slice(2);
  }

  // Handle negated patterns (we check these as positive for matching)
  if (!literalBang && normalizedPattern.startsWith('!')) {
    normalizedPattern = normalizedPattern.slice(1);
  }

  try {
    const isMatch = picomatch(normalizedPattern, {
      dot,
      basename: !anchored && !normalizedPattern.includes('/'),
      nonegate: literalBang
    });
    return files.filter((file) => isMatch(file));
  } catch {
    // Invalid pattern
    return [];
  }
}

/** Check if a pattern is a valid glob */
export function isValidGlob(pattern: string): boolean {
  try {
    // Try to compile the pattern
    picomatch.makeRe(pattern);
    return true;
  } catch {
    return false;
  }
}

/** Check if a pattern contains glob special characters */
export function isGlobPattern(pattern: string): boolean {
  return /[*?[\]{}!]/.test(pattern);
}
