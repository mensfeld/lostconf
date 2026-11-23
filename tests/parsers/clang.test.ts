import { describe, it, expect } from 'vitest';
import { clangFormatParser, clangTidyParser } from '../../src/parsers/clang.js';
import { PatternType } from '../../src/core/types.js';

describe('clangFormatParser', () => {
  it('should ignore IncludeCategories regexes in flow style', () => {
    const content = 'IncludeCategories: [{Regex: "^<gtest/.*>"}]';

    expect(clangFormatParser.parse('.clang-format', content)).toEqual([]);
  });

  it('should ignore IncludeCategories regexes in block style', () => {
    const content = `IncludeCategories:
  - Regex: '^<gtest/.*>'
    Priority: 1
SortIncludes: 'CaseSensitive'
`;

    expect(clangFormatParser.parse('.clang-format', content)).toEqual([]);
  });
});

describe('clangTidyParser', () => {
  it('should extract header filter regexes', () => {
    const content = `HeaderFilterRegex: '^src/.*\\.h$'
ExcludeHeaderFilterRegex: '^third_party/'
`;
    const patterns = clangTidyParser.parse('.clang-tidy', content);

    expect(patterns.map((p) => [p.value, p.type])).toEqual([
      ['^src/.*\\.h$', PatternType.REGEX],
      ['^third_party/', PatternType.REGEX]
    ]);
  });
});
