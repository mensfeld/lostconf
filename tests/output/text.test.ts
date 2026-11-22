import { describe, it, expect } from 'vitest';
import { textFormatter } from '../../src/output/text.js';
import { PatternType, Severity } from '../../src/core/types.js';
import type { Finding } from '../../src/core/types.js';

const finding = (file: string, pattern: string): Finding => ({
  file,
  line: 4,
  pattern,
  type: PatternType.GLOB,
  reason: 'no_matches',
  parser: 'test',
  severity: Severity.LOW
});

const stripAnsi = (s: string) =>
  s.replace(new RegExp(`${String.fromCharCode(27)}\\[\\d+m`, 'g'), '');

const firstLine = (f: Finding) =>
  stripAnsi(textFormatter.format({ findings: [f], summary: { total: 1, files: 1 } })).split(
    '\n'
  )[0];

describe('textFormatter', () => {
  it('should align short values in fixed columns', () => {
    expect(firstLine(finding('.gitignore', 'dist/'))).toBe(
      `○ .gitignore:4${' '.repeat(13)}dist/${' '.repeat(25)}no matches`
    );
  });

  it('should keep two spaces after a location longer than its column', () => {
    expect(firstLine(finding('commons/jest.config.json', 'dist/'))).toBe(
      `○ commons/jest.config.json:4  dist/${' '.repeat(25)}no matches`
    );
  });

  it('should keep two spaces after a pattern longer than its column', () => {
    const pattern = '(/__tests__/.*|\\.(test|spec))\\.(ts|tsx|js)$';
    expect(firstLine(finding('commons/jest.config.json', pattern))).toBe(
      `○ commons/jest.config.json:4  ${pattern}  no matches`
    );
  });
});
