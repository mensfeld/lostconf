import { describe, it, expect } from 'vitest';
import { prettierIgnoreParser } from '../../src/parsers/prettier.js';
import { PatternType } from '../../src/core/types.js';

describe('prettierIgnoreParser', () => {
  it('should have correct name and patterns', () => {
    expect(prettierIgnoreParser.name).toBe('prettierignore');
    expect(prettierIgnoreParser.filePatterns).toContain('.prettierignore');
  });

  it('should parse paths, globs and negations', () => {
    const patterns = prettierIgnoreParser.parse(
      '.prettierignore',
      'dist\n*.min.js\n!keep.min.js\n'
    );

    expect(patterns.map((p) => p.type)).toEqual([
      PatternType.PATH,
      PatternType.GLOB,
      PatternType.PATH
    ]);
    expect(patterns[2]).toMatchObject({ value: 'keep.min.js', negated: true });
  });

  it('should match names at any depth and globs against directories', () => {
    const patterns = prettierIgnoreParser.parse(
      '.prettierignore',
      'NOTES.md\n/dist\n**/fixtures\n'
    );

    expect(patterns.map((p) => p.anyDepth === true)).toEqual([true, false, false]);
    expect(patterns[1]).toMatchObject({ value: 'dist', anchored: true });
    expect(patterns.every((p) => p.matchDirectories)).toBe(true);
  });
});
