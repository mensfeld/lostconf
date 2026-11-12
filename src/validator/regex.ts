/**
 * Regex matching utilities
 */

/** Check if any files match a regex pattern */
export function regexMatches(pattern: string, files: Iterable<string>): string[] {
  try {
    const regex = new RegExp(pattern);
    const matches: string[] = [];
    for (const file of files) {
      if (regex.test(file)) {
        matches.push(file);
      }
    }
    return matches;
  } catch {
    // Invalid regex
    return [];
  }
}

/** Check if a pattern is a valid regex */
export function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/** Check if a string looks like a regex (contains regex special chars but not glob chars) */
export function looksLikeRegex(pattern: string): boolean {
  // Contains regex-specific patterns like \d, \w, \s, etc.
  if (/\\[dwsDWS]/.test(pattern)) {
    return true;
  }
  // Contains anchors
  if (/^\^|\$$/.test(pattern)) {
    return true;
  }
  // Contains quantifiers like +, {n,m}
  if (/[+]|\{\d+,?\d*\}/.test(pattern)) {
    return true;
  }
  // Contains lookahead/lookbehind
  if (/\(\?[=!<]/.test(pattern)) {
    return true;
  }
  return false;
}
