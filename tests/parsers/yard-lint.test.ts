import { describe, it, expect } from 'vitest';
import { yardLintParser } from '../../src/parsers/yard-lint.js';
import { PatternType } from '../../src/core/types.js';

describe('yardLintParser', () => {
  it('should have correct name and patterns', () => {
    expect(yardLintParser.name).toBe('yard-lint');
    expect(yardLintParser.filePatterns).toContain('.yard-lint.yml');
  });

  it('should parse AllValidators global exclusions', () => {
    const content = `
AllValidators:
  Exclude:
    - vendor/**/*
    - node_modules/**/*
    - spec/**/*
`;
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('vendor/**/*');
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[1].value).toBe('node_modules/**/*');
    expect(patterns[2].value).toBe('spec/**/*');
  });

  it('should parse per-validator exclusions', () => {
    const content = `
Tags/InvalidTypes:
  Exclude:
    - lib/legacy/**/*
    - lib/deprecated/*.rb

Documentation/UndocumentedObjects:
  Exclude:
    - lib/experimental/**/*
`;
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('lib/legacy/**/*');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should parse both global and per-validator exclusions', () => {
    const content = `
AllValidators:
  Exclude:
    - vendor/**/*
    - spec/**/*

Tags/InvalidTypes:
  Exclude:
    - lib/legacy/**/*
`;
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('vendor/**/*');
    expect(patterns[1].value).toBe('spec/**/*');
    expect(patterns[2].value).toBe('lib/legacy/**/*');
  });

  it('should handle simple paths', () => {
    const content = `
AllValidators:
  Exclude:
    - vendor
    - tmp
    - log
`;
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].type).toBe(PatternType.PATH);
    expect(patterns[2].type).toBe(PatternType.PATH);
  });

  it('should handle regex patterns', () => {
    const content = `
AllValidators:
  Exclude:
    - '\\.git'
    - '**/test_*.rb'
`;
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('\\.git');
    expect(patterns[1].type).toBe(PatternType.GLOB);
  });

  it('should handle empty config', () => {
    const content = '';
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config without exclusions', () => {
    const content = `
Tags/InvalidTypes:
  Enabled: true
`;
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should track line numbers', () => {
    const content = `
AllValidators:
  Exclude:
    - vendor/**/*
    - spec/**/*
`;
    const patterns = yardLintParser.parse('.yard-lint.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].line).toBeGreaterThan(1);
    expect(patterns[1].line).toBeGreaterThan(patterns[0].line);
  });
});
