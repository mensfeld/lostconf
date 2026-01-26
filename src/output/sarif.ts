/**
 * SARIF output formatter for IDE integration
 */

import type { ValidationResult, Finding, StaleReason } from '../core/types.js';
import type { Formatter } from './formatter.js';

/** SARIF rule IDs */
const RULE_IDS: Record<StaleReason, string> = {
  no_matches: 'lostconf/no-matches',
  file_not_found: 'lostconf/file-not-found',
  invalid_pattern: 'lostconf/invalid-pattern'
};

/** SARIF rule descriptions */
const RULE_DESCRIPTIONS: Record<StaleReason, { name: string; description: string }> = {
  no_matches: {
    name: 'No matches',
    description: 'Pattern does not match any files in the codebase'
  },
  file_not_found: {
    name: 'File not found',
    description: 'Referenced file or directory does not exist'
  },
  invalid_pattern: {
    name: 'Invalid pattern',
    description: 'Pattern syntax is invalid'
  }
};

interface SarifResult {
  ruleId: string;
  message: { text: string };
  locations: {
    physicalLocation: {
      artifactLocation: { uri: string };
      region: {
        startLine: number;
        startColumn?: number;
      };
    };
  }[];
  level: 'warning' | 'error' | 'note';
}

interface SarifRule {
  id: string;
  name: string;
  shortDescription: { text: string };
  fullDescription: { text: string };
  defaultConfiguration: { level: string };
}

interface SarifOutput {
  $schema: string;
  version: string;
  runs: {
    tool: {
      driver: {
        name: string;
        version: string;
        informationUri: string;
        rules: SarifRule[];
      };
    };
    results: SarifResult[];
  }[];
}

/** Convert a finding to a SARIF result */
function findingToResult(finding: Finding): SarifResult {
  return {
    ruleId: RULE_IDS[finding.reason],
    message: {
      text: `Stale pattern "${finding.pattern}" - ${RULE_DESCRIPTIONS[finding.reason].description.toLowerCase()}`
    },
    locations: [
      {
        physicalLocation: {
          artifactLocation: { uri: finding.file },
          region: {
            startLine: finding.line,
            ...(finding.column && { startColumn: finding.column })
          }
        }
      }
    ],
    level: 'warning'
  };
}

/** Get unique rules from findings */
function getRules(findings: Finding[]): SarifRule[] {
  const reasons = new Set(findings.map((f) => f.reason));
  return Array.from(reasons).map((reason) => ({
    id: RULE_IDS[reason],
    name: RULE_DESCRIPTIONS[reason].name,
    shortDescription: { text: RULE_DESCRIPTIONS[reason].name },
    fullDescription: { text: RULE_DESCRIPTIONS[reason].description },
    defaultConfiguration: { level: 'warning' }
  }));
}

/** SARIF formatter */
export const sarifFormatter: Formatter = {
  format(result: ValidationResult): string {
    const output: SarifOutput = {
      $schema:
        'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'lostconf',
              version: '0.3.0',
              informationUri: 'https://github.com/lostconf/lostconf',
              rules: getRules(result.findings)
            }
          },
          results: result.findings.map(findingToResult)
        }
      ]
    };

    return JSON.stringify(output, null, 2);
  }
};

/** Create SARIF formatter */
export function createSarifFormatter(): Formatter {
  return sarifFormatter;
}
