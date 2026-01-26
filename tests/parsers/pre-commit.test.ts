import { describe, it, expect } from 'vitest';
import { preCommitParser } from '../../src/parsers/pre-commit.js';
import { PatternType } from '../../src/core/types.js';

describe('preCommitParser', () => {
  it('should have correct name and patterns', () => {
    expect(preCommitParser.name).toBe('pre-commit');
    expect(preCommitParser.filePatterns).toContain('.pre-commit-config.yaml');
    expect(preCommitParser.filePatterns).toContain('.pre-commit-config.yml');
  });

  it('should parse top-level exclude regex', () => {
    const content = `
exclude: '^(migrations/|tests/fixtures/)'
repos: []
`;
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const pattern = patterns.find((p) => p.value === '^(migrations/|tests/fixtures/)');
    expect(pattern).toBeDefined();
    expect(pattern?.type).toBe(PatternType.REGEX);
  });

  it('should parse top-level files pattern', () => {
    const content = `
files: '\\.py$'
repos: []
`;
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const pattern = patterns.find((p) => p.value === '\\.py$');
    expect(pattern).toBeDefined();
    expect(pattern?.type).toBe(PatternType.REGEX);
  });

  it('should parse hook-level files patterns', () => {
    const content = `
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
        files: '\\.py$'
      - id: end-of-file-fixer
        files: '\\.(js|ts)$'
`;
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    const pyPattern = patterns.find((p) => p.value === '\\.py$');
    const jsPattern = patterns.find((p) => p.value === '\\.(js|ts)$');
    expect(pyPattern).toBeDefined();
    expect(pyPattern?.type).toBe(PatternType.REGEX);
    expect(jsPattern).toBeDefined();
    expect(jsPattern?.type).toBe(PatternType.REGEX);
  });

  it('should parse hook-level exclude patterns', () => {
    const content = `
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: check-yaml
        exclude: '^tests/'
`;
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(1);
    const pattern = patterns.find((p) => p.value === '^tests/');
    expect(pattern).toBeDefined();
    expect(pattern?.type).toBe(PatternType.REGEX);
  });

  it('should handle empty repos', () => {
    const content = `
repos: []
`;
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should parse multiple repos with multiple hooks', () => {
    const content = `
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
        files: '\\.py$'
  - repo: https://github.com/psf/black
    hooks:
      - id: black
        exclude: '^migrations/'
`;
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    const pyPattern = patterns.find((p) => p.value === '\\.py$');
    const migrationsPattern = patterns.find((p) => p.value === '^migrations/');
    expect(pyPattern).toBeDefined();
    expect(migrationsPattern).toBeDefined();
  });

  it('should handle hooks without file patterns', () => {
    const content = `
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
`;
    const patterns = preCommitParser.parse('.pre-commit-config.yaml', content);

    expect(patterns).toHaveLength(0);
  });
});
