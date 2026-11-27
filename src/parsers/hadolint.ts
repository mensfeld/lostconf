/**
 * Parser for Hadolint configuration files
 * Hadolint is a Dockerfile linter that helps you build best practice Docker images
 */

import type { Pattern } from '../core/types.js';
import type { Parser } from '../plugin/types.js';

/** Parse .hadolint.yaml file */
function parseHadolint(_filename: string, _content: string): Pattern[] {
  // `ignored` (rule codes, e.g. DL3008) and `trustedRegistries` (registry hosts) are skipped:
  // neither holds file paths
  return [];
}

/** Hadolint configuration parser */
export const hadolintParser: Parser = {
  name: 'hadolint',
  filePatterns: [
    '.hadolint.yaml',
    '.hadolint.yml',
    'hadolint.yaml',
    'hadolint.yml',
    '**/.hadolint.yaml',
    '**/.hadolint.yml'
  ],
  parse: parseHadolint
};
