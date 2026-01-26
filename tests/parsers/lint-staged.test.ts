import { describe, it, expect } from 'vitest';
import { lintStagedParser } from '../../src/parsers/lint-staged.js';
import { PatternType } from '../../src/core/types.js';

describe('lintStagedParser', () => {
  it('should have correct name and patterns', () => {
    expect(lintStagedParser.name).toBe('lint-staged');
    expect(lintStagedParser.filePatterns).toContain('.lintstagedrc');
    expect(lintStagedParser.filePatterns).toContain('.lintstagedrc.json');
  });

  it('should parse glob patterns as keys', () => {
    const content = `{
  "*.js": "eslint --fix",
  "*.ts": ["eslint --fix", "prettier --write"],
  "*.css": "stylelint --fix"
}`;
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('*.js');
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[1].value).toBe('*.ts');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].value).toBe('*.css');
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should parse complex glob patterns', () => {
    const content = `{
  "src/**/*.{js,jsx,ts,tsx}": "eslint",
  "**/*.test.js": "jest",
  "!(node_modules)/**/*.js": "prettier"
}`;
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('src/**/*.{js,jsx,ts,tsx}');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should handle empty config', () => {
    const content = '{}';
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should skip special keys like $schema', () => {
    const content = `{
  "$schema": "https://json.schemastore.org/lintstagedrc.json",
  "*.js": "eslint"
}`;
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].value).toBe('*.js');
  });

  it('should handle invalid JSON', () => {
    const content = 'not valid json';
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should track line numbers', () => {
    const content = `{
  "*.js": "eslint",
  "*.ts": "eslint",
  "*.css": "stylelint"
}`;
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].line).toBe(2);
    expect(patterns[1].line).toBe(3);
    expect(patterns[2].line).toBe(4);
  });

  it('should handle both string and array command values', () => {
    const content = `{
  "*.js": "eslint --fix",
  "*.ts": ["eslint --fix", "prettier --write"]
}`;
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('*.js');
    expect(patterns[1].value).toBe('*.ts');
  });

  it('should handle path patterns', () => {
    const content = `{
  "src": "echo 'linting src'",
  "lib/*.js": "eslint"
}`;
    const patterns = lintStagedParser.parse('.lintstagedrc.json', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[0].value).toBe('src');
    expect(patterns[1].type).toBe(PatternType.GLOB);
  });
});
