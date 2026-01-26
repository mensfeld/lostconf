import { describe, it, expect } from 'vitest';
import { ansibleLintParser } from '../../src/parsers/ansible-lint.js';
import { PatternType } from '../../src/core/types.js';

describe('ansibleLintParser', () => {
  it('should have correct name and patterns', () => {
    expect(ansibleLintParser.name).toBe('ansible-lint');
    expect(ansibleLintParser.filePatterns).toContain('.ansible-lint');
    expect(ansibleLintParser.filePatterns).toContain('.ansible-lint.yaml');
  });

  it('should parse exclude_paths with simple paths', () => {
    const content = `
exclude_paths:
  - .cache/
  - test/fixtures/
  - roles/vendor/
`;
    const patterns = ansibleLintParser.parse('.ansible-lint', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('.cache/');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('test/fixtures/');
    expect(patterns[2].value).toBe('roles/vendor/');
  });

  it('should parse exclude_paths with glob patterns', () => {
    const content = `
exclude_paths:
  - '*.retry'
  - 'roles/*/files/**'
  - 'playbooks/legacy/**/*.yml'
`;
    const patterns = ansibleLintParser.parse('.ansible-lint', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('*.retry');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should skip skip_list (rule IDs, not paths)', () => {
    const content = `
skip_list:
  - yaml[line-length]
  - name[casing]
exclude_paths:
  - .cache/
`;
    const patterns = ansibleLintParser.parse('.ansible-lint', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].value).toBe('.cache/');
  });

  it('should handle empty config', () => {
    const content = '';
    const patterns = ansibleLintParser.parse('.ansible-lint', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config without exclude_paths', () => {
    const content = `
skip_list:
  - yaml[line-length]
warn_list:
  - experimental
`;
    const patterns = ansibleLintParser.parse('.ansible-lint', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = ansibleLintParser.parse('.ansible-lint', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle mixed paths and globs', () => {
    const content = `
exclude_paths:
  - .git/
  - '*.retry'
  - roles/vendor/
  - 'test/**/*.yml'
`;
    const patterns = ansibleLintParser.parse('.ansible-lint', content);

    expect(patterns).toHaveLength(4);
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.PATH);
    expect(patterns[3].type).toBe(PatternType.GLOB);
  });
});
