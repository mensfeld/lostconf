import { describe, it, expect } from 'vitest';
import { bundlerAuditParser } from '../../src/parsers/bundler-audit.js';

describe('bundlerAuditParser', () => {
  it('should have correct name and patterns', () => {
    expect(bundlerAuditParser.name).toBe('bundler-audit');
    expect(bundlerAuditParser.filePatterns).toContain('.bundler-audit.yml');
  });

  it('should not extract advisory IDs from ignore', () => {
    const content = `
ignore:
  - CVE-2020-1234
  - OSVDB-108664
  - GHSA-wrrw-crp8-979q
`;
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle empty config', () => {
    const content = '';
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = bundlerAuditParser.parse('.bundler-audit.yml', content);

    expect(patterns).toHaveLength(0);
  });
});
