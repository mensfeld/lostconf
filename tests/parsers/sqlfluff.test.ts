import { describe, it, expect } from 'vitest';
import { sqlfluffParser, sqlfluffSetupCfgParser } from '../../src/parsers/sqlfluff.js';
import { PatternType } from '../../src/core/types.js';

describe('sqlfluffParser', () => {
  it('should have correct name and patterns', () => {
    expect(sqlfluffParser.name).toBe('sqlfluff');
    expect(sqlfluffParser.filePatterns).toContain('.sqlfluff');
  });

  it('should not parse exclude_rules (rule IDs, not paths)', () => {
    const content = `
[sqlfluff]
exclude_rules = L001, L002, L003
dialect = postgres
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    // exclude_rules contains rule IDs, not file paths
    expect(patterns).toHaveLength(0);
  });

  it('should parse ignore patterns', () => {
    const content = `
[sqlfluff]
ignore = migrations/, scripts/legacy/
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('migrations/');
    expect(patterns[1].value).toBe('scripts/legacy/');
  });

  it('should parse glob patterns', () => {
    const content = `
[sqlfluff]
ignore = *.sql.j2, tests/**/*.sql
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('*.sql.j2');
    expect(patterns[1].type).toBe(PatternType.GLOB);
  });

  it('should parse template_path', () => {
    const content = `
[sqlfluff]
template_path = templates/, custom/templates/
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('templates/');
    expect(patterns[1].value).toBe('custom/templates/');
  });

  it('should handle continuation lines for path fields', () => {
    const content = `
[sqlfluff]
ignore =
    migrations/
    legacy/
    temp/
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('migrations/');
    expect(patterns[1].value).toBe('legacy/');
    expect(patterns[2].value).toBe('temp/');
  });

  it('should skip non-sqlfluff sections', () => {
    const content = `
[tool.other]
exclude = something

[sqlfluff]
ignore = migrations/

[another_section]
exclude = other
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].value).toBe('migrations/');
  });

  it('should handle sqlfluff subsections', () => {
    const content = `
[sqlfluff:rules]
ignore = rules/custom/

[sqlfluff:templater]
template_path = templates/
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('rules/custom/');
    expect(patterns[1].value).toBe('templates/');
  });

  it('should handle empty config', () => {
    const content = `
[sqlfluff]
dialect = postgres
`;
    const patterns = sqlfluffParser.parse('.sqlfluff', content);

    expect(patterns).toHaveLength(0);
  });
});

describe('sqlfluffSetupCfgParser', () => {
  it('should have correct name and patterns', () => {
    expect(sqlfluffSetupCfgParser.name).toBe('sqlfluff-setup');
    expect(sqlfluffSetupCfgParser.filePatterns).toContain('setup.cfg');
  });

  it('should parse sqlfluff section from setup.cfg', () => {
    const content = `
[metadata]
name = myproject

[sqlfluff]
ignore = migrations/, tests/
dialect = postgres
`;
    const patterns = sqlfluffSetupCfgParser.parse('setup.cfg', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('migrations/');
    expect(patterns[1].value).toBe('tests/');
  });
});
