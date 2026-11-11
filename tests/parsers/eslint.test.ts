import { describe, it, expect } from 'vitest';
import { eslintIgnoreParser } from '../../src/parsers/eslint.js';
import { PatternType } from '../../src/core/types.js';

describe('eslintIgnoreParser', () => {
  it('should have correct name and patterns', () => {
    expect(eslintIgnoreParser.name).toBe('eslintignore');
    expect(eslintIgnoreParser.filePatterns).toContain('.eslintignore');
  });

  it('should parse simple paths', () => {
    const content = `
node_modules
dist
coverage
`;
    const patterns = eslintIgnoreParser.parse('.eslintignore', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('node_modules');
    expect(patterns[0].type).toBe(PatternType.PATH);
  });

  it('should parse glob patterns', () => {
    const content = `
*.min.js
src/**/*.test.ts
`;
    const patterns = eslintIgnoreParser.parse('.eslintignore', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[1].type).toBe(PatternType.GLOB);
  });

  it('should handle negated patterns', () => {
    const content = `
*.js
!important.js
`;
    const patterns = eslintIgnoreParser.parse('.eslintignore', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[1].negated).toBe(true);
    expect(patterns[1].value).toBe('important.js');
  });

  it('should match names at any depth and globs against directories', () => {
    const patterns = eslintIgnoreParser.parse('.eslintignore', 'NOTES.md\n/dist\n**/fixtures\n');

    expect(patterns.map((p) => p.anyDepth === true)).toEqual([true, false, false]);
    expect(patterns[1]).toMatchObject({ value: 'dist', anchored: true });
    expect(patterns.every((p) => p.matchDirectories)).toBe(true);
  });
});
