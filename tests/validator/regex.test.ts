import { describe, it, expect } from 'vitest';
import { regexMatches } from '../../src/validator/regex.js';

describe('regexMatches', () => {
  const files = new Set(['src/b.ts', 'README.md', 'src/a.ts', 'tests/a.test.ts']);

  it('should return matches from a Set in insertion order', () => {
    expect(regexMatches('^src/.*\\.ts$', files)).toEqual(['src/b.ts', 'src/a.ts']);
  });

  it('should accept an array', () => {
    expect(regexMatches('\\.md$', ['a.ts', 'README.md'])).toEqual(['README.md']);
  });

  it('should return an empty array when nothing matches', () => {
    expect(regexMatches('^lib/', files)).toEqual([]);
  });

  it('should return an empty array for an invalid regex', () => {
    expect(regexMatches('(', files)).toEqual([]);
  });
});
