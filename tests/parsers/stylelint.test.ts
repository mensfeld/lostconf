import { describe, it, expect } from 'vitest';
import { stylelintIgnoreParser } from '../../src/parsers/stylelint.js';
import { PatternType } from '../../src/core/types.js';

describe('stylelintIgnoreParser', () => {
  it('should have correct name and patterns', () => {
    expect(stylelintIgnoreParser.name).toBe('stylelintignore');
    expect(stylelintIgnoreParser.filePatterns).toContain('.stylelintignore');
  });

  it('should parse paths, globs and negations', () => {
    const patterns = stylelintIgnoreParser.parse(
      '.stylelintignore',
      'dist\n*.min.css\n!keep.min.css\n'
    );

    expect(patterns.map((p) => p.type)).toEqual([
      PatternType.PATH,
      PatternType.GLOB,
      PatternType.PATH
    ]);
    expect(patterns[2]).toMatchObject({ value: 'keep.min.css', negated: true });
  });

  it('should match names at any depth and globs against directories', () => {
    const patterns = stylelintIgnoreParser.parse(
      '.stylelintignore',
      'NOTES.md\n/dist\n**/fixtures\n'
    );

    expect(patterns.map((p) => p.anyDepth === true)).toEqual([true, false, false]);
    expect(patterns[1]).toMatchObject({ value: 'dist', anchored: true });
    expect(patterns.every((p) => p.matchDirectories)).toBe(true);
  });
});
