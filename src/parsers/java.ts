/**
 * Parser for Java linter configuration files (checkstyle.xml, pmd.xml, spotbugs.xml)
 */

import type { Pattern } from '../core/types.js';
import { PatternType } from '../core/types.js';
import type { Parser } from '../plugin/types.js';
import { isGlobPattern } from '../validator/glob.js';

/** Parse XML config files and extract file patterns */
function parseJavaXmlConfig(_filename: string, content: string): Pattern[] {
  const patterns: Pattern[] = [];
  const lines = content.split('\n');

  // Regex patterns for common XML attributes containing file paths
  const filePatternRegexes = [
    // Checkstyle: <suppress files="..." />
    /<suppress[^>]*\sfiles\s*=\s*["']([^"']+)["']/gi,
    // PMD `<exclude name="..." />` is skipped: it names a rule, not a file
    // SpotBugs: <Match><Source name="..." /></Match>
    /<Source[^>]*\sname\s*=\s*["']([^"']+)["']/gi,
    // Generic file/path attributes (SpotBugs `<Bug pattern="..." />` names a bug pattern, not a file)
    /<[^>]*\s(?:file|path)\s*=\s*["']([^"']+)["']/gi
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (const regex of filePatternRegexes) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(line)) !== null) {
        const value = match[1];
        if (!value) continue;

        // Skip URLs and common non-path values
        if (value.startsWith('http') || value.startsWith('$')) continue;

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

/** Checkstyle parser */
export const checkstyleParser: Parser = {
  name: 'checkstyle',
  filePatterns: [
    'checkstyle.xml',
    'checkstyle-suppressions.xml',
    '**/checkstyle.xml',
    '**/checkstyle-suppressions.xml'
  ],
  parse: parseJavaXmlConfig
};

/** PMD parser */
export const pmdParser: Parser = {
  name: 'pmd',
  filePatterns: ['pmd.xml', 'pmd-ruleset.xml', '**/pmd.xml', '**/pmd-ruleset.xml'],
  parse: parseJavaXmlConfig
};

/** SpotBugs parser */
export const spotbugsParser: Parser = {
  name: 'spotbugs',
  filePatterns: [
    'spotbugs.xml',
    'spotbugs-exclude.xml',
    'findbugs-exclude.xml',
    '**/spotbugs.xml',
    '**/spotbugs-exclude.xml'
  ],
  parse: parseJavaXmlConfig
};
