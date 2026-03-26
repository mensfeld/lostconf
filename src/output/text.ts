/**
 * Text output formatter
 */

import type { ValidationResult, Finding, StaleReason } from '../core/types.js';

/** Inline ANSI color helpers (replaces chalk) */
const colorEnabled =
  !('NO_COLOR' in process.env) && (process.stdout.isTTY === true || process.env.FORCE_COLOR !== undefined);
const ansi = (code: number, close: number) =>
  colorEnabled ? (s: string) => `\x1b[${code}m${s}\x1b[${close}m` : (s: string) => s;
const gray = ansi(90, 39);
const yellow = ansi(33, 39);
const red = ansi(31, 39);
const cyan = ansi(36, 39);
const dim = ansi(2, 22);
const green = ansi(32, 39);
import { Severity } from '../core/types.js';
import type { Formatter } from './formatter.js';

/** Format reason for display */
function formatReason(reason: StaleReason): string {
  switch (reason) {
    case 'no_matches':
      return 'no matches';
    case 'file_not_found':
      return 'file not found';
    case 'invalid_pattern':
      return 'invalid pattern';
  }
}

/** Get severity icon */
function getSeverityIcon(severity: Severity): string {
  switch (severity) {
    case Severity.LOW:
      return gray('○');
    case Severity.MEDIUM:
      return yellow('●');
    case Severity.HIGH:
      return red('●');
  }
}

/** Format a single finding */
function formatFinding(finding: Finding): string {
  const severityIcon = getSeverityIcon(finding.severity);
  const location = cyan(`${finding.file}:${finding.line}`);
  const pattern = yellow(finding.pattern);
  const reason = dim(formatReason(finding.reason));

  // Calculate padding for alignment
  const locationStr = `${finding.file}:${finding.line}`;
  const padding = Math.max(0, 25 - locationStr.length);

  return `${severityIcon} ${location}${' '.repeat(padding)}${pattern.padEnd(30)}${reason}`;
}

/** Text formatter */
export const textFormatter: Formatter = {
  format(result: ValidationResult): string {
    const lines: string[] = [];

    if (result.findings.length === 0) {
      lines.push(green('No stale patterns found'));
      return lines.join('\n');
    }

    // Group findings by file
    const byFile = new Map<string, Finding[]>();
    for (const finding of result.findings) {
      const existing = byFile.get(finding.file) ?? [];
      existing.push(finding);
      byFile.set(finding.file, existing);
    }

    // Output findings
    for (const [_file, findings] of byFile) {
      for (const finding of findings) {
        lines.push(formatFinding(finding));
      }
    }

    // Summary with severity breakdown
    lines.push('');

    const severityCounts = {
      [Severity.HIGH]: result.findings.filter((f) => f.severity === Severity.HIGH).length,
      [Severity.MEDIUM]: result.findings.filter((f) => f.severity === Severity.MEDIUM).length,
      [Severity.LOW]: result.findings.filter((f) => f.severity === Severity.LOW).length
    };

    const totalText = result.summary.total === 1 ? 'pattern' : 'patterns';
    const filesText = result.summary.files === 1 ? 'file' : 'files';

    const parts = [];
    if (severityCounts[Severity.HIGH] > 0) {
      parts.push(red(`${severityCounts[Severity.HIGH]} high`));
    }
    if (severityCounts[Severity.MEDIUM] > 0) {
      parts.push(yellow(`${severityCounts[Severity.MEDIUM]} medium`));
    }
    if (severityCounts[Severity.LOW] > 0) {
      parts.push(gray(`${severityCounts[Severity.LOW]} low`));
    }

    lines.push(
      `Found ${result.summary.total} stale ${totalText} in ${result.summary.files} ${filesText} (${parts.join(', ')})`
    );

    return lines.join('\n');
  }
};

/** Create text formatter */
export function createTextFormatter(): Formatter {
  return textFormatter;
}
