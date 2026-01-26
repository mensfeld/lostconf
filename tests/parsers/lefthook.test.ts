import { describe, it, expect } from 'vitest';
import { lefthookParser } from '../../src/parsers/lefthook.js';
import { PatternType } from '../../src/core/types.js';

describe('lefthookParser', () => {
  it('should have correct name and patterns', () => {
    expect(lefthookParser.name).toBe('lefthook');
    expect(lefthookParser.filePatterns).toContain('lefthook.yml');
    expect(lefthookParser.filePatterns).toContain('.lefthook.yml');
  });

  it('should parse files patterns from hooks', () => {
    const content = `
pre-commit:
  commands:
    lint:
      files: "*.js"
    format:
      files: "*.ts"
`;
    const patterns = lefthookParser.parse('lefthook.yml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    const jsPattern = patterns.find((p) => p.value === '*.js');
    const tsPattern = patterns.find((p) => p.value === '*.ts');
    expect(jsPattern).toBeDefined();
    expect(jsPattern?.type).toBe(PatternType.GLOB);
    expect(tsPattern).toBeDefined();
    expect(tsPattern?.type).toBe(PatternType.GLOB);
  });

  it('should parse glob patterns', () => {
    const content = `
pre-commit:
  commands:
    lint:
      glob: "src/**/*.{js,ts}"
`;
    const patterns = lefthookParser.parse('lefthook.yml', content);

    const pattern = patterns.find((p) => p.value === 'src/**/*.{js,ts}');
    expect(pattern).toBeDefined();
    expect(pattern?.type).toBe(PatternType.GLOB);
  });

  it('should parse exclude patterns', () => {
    const content = `
pre-commit:
  commands:
    lint:
      exclude: "node_modules"
`;
    const patterns = lefthookParser.parse('lefthook.yml', content);

    const pattern = patterns.find((p) => p.value === 'node_modules');
    expect(pattern).toBeDefined();
  });

  it('should parse skip patterns as array', () => {
    const content = `
pre-commit:
  skip:
    - merge
    - rebase
`;
    const patterns = lefthookParser.parse('lefthook.yml', content);

    const mergePattern = patterns.find((p) => p.value === 'merge');
    const rebasePattern = patterns.find((p) => p.value === 'rebase');
    expect(mergePattern).toBeDefined();
    expect(rebasePattern).toBeDefined();
  });

  it('should parse skip patterns as string', () => {
    const content = `
pre-commit:
  skip: merge
`;
    const patterns = lefthookParser.parse('lefthook.yml', content);

    const pattern = patterns.find((p) => p.value === 'merge');
    expect(pattern).toBeDefined();
  });

  it('should handle empty config', () => {
    const content = '';
    const patterns = lefthookParser.parse('lefthook.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = lefthookParser.parse('lefthook.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should parse multiple hooks', () => {
    const content = `
pre-commit:
  commands:
    lint:
      files: "*.js"

pre-push:
  commands:
    test:
      files: "*.test.js"
`;
    const patterns = lefthookParser.parse('lefthook.yml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    const jsPattern = patterns.find((p) => p.value === '*.js');
    const testPattern = patterns.find((p) => p.value === '*.test.js');
    expect(jsPattern).toBeDefined();
    expect(testPattern).toBeDefined();
  });

  it('should handle hook with both files and glob', () => {
    const content = `
pre-commit:
  commands:
    lint:
      files: "*.js"
      glob: "src/**/*.ts"
`;
    const patterns = lefthookParser.parse('lefthook.yml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    const jsPattern = patterns.find((p) => p.value === '*.js');
    const tsPattern = patterns.find((p) => p.value === 'src/**/*.ts');
    expect(jsPattern).toBeDefined();
    expect(tsPattern).toBeDefined();
  });
});
