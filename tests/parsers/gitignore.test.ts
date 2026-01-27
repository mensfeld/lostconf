import { describe, it, expect } from 'vitest';
import {
  gitignoreParser,
  remarkignoreParser,
  lycheeignoreParser,
  secretlintignoreParser,
  vscodeignoreParser,
  ignoresecretsParser
} from '../../src/parsers/gitignore.js';
import { PatternType } from '../../src/core/types.js';

describe('gitignoreParser', () => {
  it('should have correct name and patterns', () => {
    expect(gitignoreParser.name).toBe('gitignore');
    expect(gitignoreParser.filePatterns).toContain('.gitignore');
  });

  it('should parse simple paths', () => {
    const content = `
node_modules
dist
.env
`;
    const patterns = gitignoreParser.parse('.gitignore', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0]).toEqual({
      value: 'node_modules',
      type: PatternType.PATH,
      line: 2,
      column: 1,
      negated: false
    });
  });

  it('should parse glob patterns', () => {
    const content = `
*.log
src/**/*.js
temp-*
`;
    const patterns = gitignoreParser.parse('.gitignore', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should handle negated patterns', () => {
    const content = `
*.log
!important.log
`;
    const patterns = gitignoreParser.parse('.gitignore', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].negated).toBe(false);
    expect(patterns[1].negated).toBe(true);
    expect(patterns[1].value).toBe('important.log');
  });

  it('should skip comments and empty lines', () => {
    const content = `
# This is a comment
node_modules

# Another comment
dist
`;
    const patterns = gitignoreParser.parse('.gitignore', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('node_modules');
    expect(patterns[1].value).toBe('dist');
  });

  it('should track correct line numbers', () => {
    const content = `# Comment
node_modules
dist
*.log`;
    const patterns = gitignoreParser.parse('.gitignore', content);

    expect(patterns[0].line).toBe(2);
    expect(patterns[1].line).toBe(3);
    expect(patterns[2].line).toBe(4);
  });
});

describe('New ignore file parsers', () => {
  const testContent = `
# Test comment
*.log
node_modules
`;

  it('remarkignoreParser should parse correctly', () => {
    expect(remarkignoreParser.name).toBe('remarkignore');
    expect(remarkignoreParser.filePatterns).toContain('.remarkignore');
    const patterns = remarkignoreParser.parse('.remarkignore', testContent);
    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('*.log');
  });

  it('lycheeignoreParser should parse correctly', () => {
    expect(lycheeignoreParser.name).toBe('lycheeignore');
    expect(lycheeignoreParser.filePatterns).toContain('.lycheeignore');
    const patterns = lycheeignoreParser.parse('.lycheeignore', testContent);
    expect(patterns).toHaveLength(2);
  });

  it('secretlintignoreParser should parse correctly', () => {
    expect(secretlintignoreParser.name).toBe('secretlintignore');
    expect(secretlintignoreParser.filePatterns).toContain('.secretlintignore');
    const patterns = secretlintignoreParser.parse('.secretlintignore', testContent);
    expect(patterns).toHaveLength(2);
  });

  it('vscodeignoreParser should parse correctly', () => {
    expect(vscodeignoreParser.name).toBe('vscodeignore');
    expect(vscodeignoreParser.filePatterns).toContain('.vscodeignore');
    const patterns = vscodeignoreParser.parse('.vscodeignore', testContent);
    expect(patterns).toHaveLength(2);
  });

  it('ignoresecretsParser should parse correctly', () => {
    expect(ignoresecretsParser.name).toBe('ignoresecrets');
    expect(ignoresecretsParser.filePatterns).toContain('.ignoresecrets');
    const patterns = ignoresecretsParser.parse('.ignoresecrets', testContent);
    expect(patterns).toHaveLength(2);
  });
});
