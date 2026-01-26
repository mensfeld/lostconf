import { describe, it, expect } from 'vitest';
import { bundlerAuditParser } from '../../src/parsers/bundler-audit.js';
import { PatternType } from '../../src/core/types.js';

describe('bundlerAuditParser', () => {
  it('should have correct name and patterns', () => {
    expect(bundlerAuditParser.name).toBe('bundler-audit');
    expect(bundlerAuditParser.filePatterns).toContain('.bundler-audit.yml');
  });

  it('should parse ignore list with CVE IDs', () => {
    const content = `
ignore:
  - CVE-2021-22885
  - CVE-2020-8184
  - CVE-2019-16782
`;
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('CVE-2021-22885');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('CVE-2020-8184');
    expect(patterns[2].value).toBe('CVE-2019-16782');
  });

  it('should parse ignore list with OSVDB IDs', () => {
    const content = `
ignore:
  - OSVDB-108664
  - OSVDB-120415
`;
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('OSVDB-108664');
    expect(patterns[1].value).toBe('OSVDB-120415');
  });

  it('should parse ignore list with GHSA IDs', () => {
    const content = `
ignore:
  - GHSA-wrrw-crp8-979q
  - GHSA-pg8v-g4xq-hww9
`;
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('GHSA-wrrw-crp8-979q');
    expect(patterns[1].value).toBe('GHSA-pg8v-g4xq-hww9');
  });

  it('should parse mixed advisory ID types', () => {
    const content = `
ignore:
  - CVE-2021-22885
  - OSVDB-108664
  - GHSA-wrrw-crp8-979q
`;
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('CVE-2021-22885');
    expect(patterns[1].value).toBe('OSVDB-108664');
    expect(patterns[2].value).toBe('GHSA-wrrw-crp8-979q');
  });

  it('should handle empty config', () => {
    const content = '';
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config without ignore field', () => {
    const content = `
other_field: value
`;
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should track line numbers', () => {
    const content = `
ignore:
  - CVE-2021-22885
  - CVE-2020-8184
`;
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].line).toBeGreaterThan(1);
    expect(patterns[1].line).toBeGreaterThan(patterns[0].line);
  });
});
