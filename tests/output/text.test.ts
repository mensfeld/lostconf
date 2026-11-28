import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { PatternType, Severity } from '../../src/core/types.js';
import type { Finding } from '../../src/core/types.js';
import type { Formatter } from '../../src/output/formatter.js';

const ESC = String.fromCharCode(27);

const finding = (file: string, pattern: string): Finding => ({
  file,
  line: 4,
  pattern,
  type: PatternType.GLOB,
  reason: 'no_matches',
  parser: 'test',
  severity: Severity.LOW
});

const stripAnsi = (s: string) => s.replace(new RegExp(`${ESC}\\[\\d+m`, 'g'), '');

describe.each([
  { colors: false, env: { NO_COLOR: '1', FORCE_COLOR: undefined } },
  { colors: true, env: { NO_COLOR: undefined, FORCE_COLOR: '1' } }
])('textFormatter (colors: $colors)', ({ colors, env }) => {
  let formatter: Formatter;

  // colorEnabled is fixed at module load, so load the module after stubbing the env
  beforeAll(async () => {
    for (const [name, value] of Object.entries(env)) {
      vi.stubEnv(name, value);
    }
    vi.resetModules();
    ({ textFormatter: formatter } = await import('../../src/output/text.js'));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  const format = (f: Finding) =>
    formatter.format({ findings: [f], summary: { total: 1, files: 1 } }).split('\n')[0];

  const firstLine = (f: Finding) => stripAnsi(format(f));

  it(`should ${colors ? '' : 'not '}color the output`, () => {
    expect(format(finding('.gitignore', 'dist/')).includes(ESC)).toBe(colors);
  });

  it('should align short values in fixed columns', () => {
    expect(firstLine(finding('.gitignore', 'dist/'))).toBe(
      `○ .gitignore:4${' '.repeat(13)}dist/${' '.repeat(25)}no matches`
    );
  });

  it('should keep two spaces after a location one short of its column', () => {
    const file = 'x'.repeat(22);
    expect(firstLine(finding(file, 'dist/'))).toBe(`○ ${file}:4  dist/${' '.repeat(25)}no matches`);
  });

  it('should keep two spaces after a pattern one short of its column', () => {
    const pattern = 'p'.repeat(29);
    expect(firstLine(finding('.gitignore', pattern))).toBe(
      `○ .gitignore:4${' '.repeat(13)}${pattern}  no matches`
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
