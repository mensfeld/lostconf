import { describe, it, expect } from 'vitest';
import { eslintFlatParser } from '../../src/parsers/eslint-flat.js';
import { PatternType } from '../../src/core/types.js';

describe('eslintFlatParser', () => {
  it('should have correct name and patterns', () => {
    expect(eslintFlatParser.name).toBe('eslint-flat');
    expect(eslintFlatParser.filePatterns).toContain('eslint.config.json');
  });

  it('should parse top-level ignores array', () => {
    const content = `{
  "ignores": [
    "dist",
    "node_modules",
    "coverage"
  ]
}`;
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('dist');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('node_modules');
    expect(patterns[2].value).toBe('coverage');
  });

  it('should parse ignores with glob patterns', () => {
    const content = `{
  "ignores": [
    "**/*.min.js",
    "src/**/*.test.ts",
    "*.config.js"
  ]
}`;
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('**/*.min.js');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should parse files patterns', () => {
    const content = `{
  "files": [
    "src/**/*.js",
    "lib/**/*.ts"
  ]
}`;
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('src/**/*.js');
    expect(patterns[1].type).toBe(PatternType.GLOB);
  });

  it('should parse config array with multiple objects', () => {
    const content = `[
  {
    "ignores": ["dist", "node_modules"]
  },
  {
    "files": ["src/**/*.js"],
    "ignores": ["src/**/*.test.js"]
  }
]`;
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(4);
    expect(patterns[0].value).toBe('dist');
    expect(patterns[1].value).toBe('node_modules');
    // Note: ignores are processed before files in each config object
    expect(patterns[2].value).toBe('src/**/*.test.js');
    expect(patterns[3].value).toBe('src/**/*.js');
  });

  it('should handle empty config', () => {
    const content = '{}';
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config without ignores or files', () => {
    const content = `{
  "languageOptions": {
    "ecmaVersion": 2022
  }
}`;
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid JSON', () => {
    const content = 'not valid json';
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should track line numbers', () => {
    const content = `{
  "ignores": [
    "dist",
    "node_modules"
  ]
}`;
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].line).toBe(3);
    expect(patterns[1].line).toBe(4);
  });

  it('should handle both files and ignores in same config', () => {
    const content = `{
  "files": ["src/**/*.js"],
  "ignores": ["src/**/*.test.js", "src/**/*.spec.js"]
}`;
    const patterns = eslintFlatParser.parse('eslint.config.json', content);

    expect(patterns).toHaveLength(3);
    // Note: ignores are processed before files
    expect(patterns[0].value).toBe('src/**/*.test.js');
    expect(patterns[1].value).toBe('src/**/*.spec.js');
    expect(patterns[2].value).toBe('src/**/*.js');
  });
});
