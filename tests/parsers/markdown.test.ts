import { describe, it, expect } from 'vitest';
import { markdownlintIgnoreParser } from '../../src/parsers/markdown.js';
import { PatternType } from '../../src/core/types.js';

describe('markdownlintIgnoreParser', () => {
  it('should have correct name and patterns', () => {
    expect(markdownlintIgnoreParser.name).toBe('markdownlintignore');
    expect(markdownlintIgnoreParser.filePatterns).toContain('.markdownlintignore');
  });

  it('should parse paths, globs and negations', () => {
    const patterns = markdownlintIgnoreParser.parse(
      '.markdownlintignore',
      'dist\n*.min.md\n!keep.min.md\n'
    );

    expect(patterns.map((p) => p.type)).toEqual([
      PatternType.PATH,
      PatternType.GLOB,
      PatternType.PATH
    ]);
    expect(patterns[2]).toMatchObject({ value: 'keep.min.md', negated: true });
  });

  it('should match names at any depth and globs against directories', () => {
    const patterns = markdownlintIgnoreParser.parse(
      '.markdownlintignore',
      'NOTES.md\n/dist\n**/fixtures\n'
    );

    expect(patterns.map((p) => p.anyDepth === true)).toEqual([true, false, false]);
    expect(patterns[1]).toMatchObject({ value: 'dist', anchored: true });
    expect(patterns.every((p) => p.matchDirectories)).toBe(true);
  });
});
