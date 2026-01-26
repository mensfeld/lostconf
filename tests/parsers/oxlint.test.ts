import { describe, it, expect } from 'vitest';
import { oxlintParser } from '../../src/parsers/oxlint.js';
import { PatternType } from '../../src/core/types.js';

describe('oxlintParser', () => {
  it('should have correct name and patterns', () => {
    expect(oxlintParser.name).toBe('oxlint');
    expect(oxlintParser.filePatterns).toContain('.oxlintrc.json');
    expect(oxlintParser.filePatterns).toContain('oxlint.config.json');
  });

  it('should parse ignorePatterns with paths', () => {
    const content = `{
  "ignorePatterns": [
    "dist",
    "node_modules",
    "coverage"
  ]
}`;
    const patterns = oxlintParser.parse('.oxlintrc.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('dist');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('node_modules');
    expect(patterns[2].value).toBe('coverage');
  });

  it('should parse ignorePatterns with globs', () => {
    const content = `{
  "ignorePatterns": [
    "**/*.min.js",
    "src/**/*.test.ts",
    "*.config.js"
  ]
}`;
    const patterns = oxlintParser.parse('.oxlintrc.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('**/*.min.js');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should handle empty config', () => {
    const content = '{}';
    const patterns = oxlintParser.parse('.oxlintrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config without ignorePatterns', () => {
    const content = `{
  "rules": {
    "no-unused-vars": "error"
  }
}`;
    const patterns = oxlintParser.parse('.oxlintrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid JSON', () => {
    const content = 'not valid json';
    const patterns = oxlintParser.parse('.oxlintrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should track line numbers', () => {
    const content = `{
  "ignorePatterns": [
    "dist",
    "node_modules"
  ]
}`;
    const patterns = oxlintParser.parse('.oxlintrc.json', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].line).toBe(3);
    expect(patterns[1].line).toBe(4);
  });

  it('should handle mixed paths and globs', () => {
    const content = `{
  "ignorePatterns": [
    "dist",
    "**/*.min.js",
    "node_modules",
    "src/**/*.test.ts"
  ]
}`;
    const patterns = oxlintParser.parse('.oxlintrc.json', content);

    expect(patterns).toHaveLength(4);
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.PATH);
    expect(patterns[3].type).toBe(PatternType.GLOB);
  });
});
