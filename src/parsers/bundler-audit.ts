/**
 * Parser for bundler-audit configuration files
 * https://github.com/rubysec/bundler-audit
 */

import type { Pattern } from '../core/types.js';
import type { Parser } from '../plugin/types.js';

/** Parse bundler-audit configuration */
function parseBundlerAudit(_filename: string, _content: string): Pattern[] {
  // `ignore` is skipped: it holds advisory IDs (CVE, OSVDB, GHSA), not file paths
  return [];
}

/** bundler-audit config parser */
export const bundlerAuditParser: Parser = {
  name: 'bundler-audit',
  filePatterns: ['.bundler-audit.yml', '**/.bundler-audit.yml'],
  parse: parseBundlerAudit
};
