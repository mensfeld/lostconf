import { describe, it, expect } from 'vitest';
import { globMatches, isValidGlob, isGlobPattern } from '../../src/validator/glob.js';

describe('globMatches', () => {
  const files = [
    'src/index.ts',
    'src/utils/helpers.ts',
    'src/components/Button.tsx',
    'tests/index.test.ts',
    'package.json',
    'README.md',
    '.gitignore'
  ];

  it('should match a leading ! literally with literalBang', () => {
    expect(globMatches('!*.md', ['!a.md', 'x.md'], { literalBang: true })).toEqual(['!a.md']);
  });

  it('should match simple wildcard patterns', () => {
    const matches = globMatches('*.ts', files);
    expect(matches).toContain('src/index.ts');
    expect(matches).toContain('src/utils/helpers.ts');
  });

  it('should match double star patterns', () => {
    const matches = globMatches('src/**/*.ts', files);
    expect(matches).toContain('src/index.ts');
    expect(matches).toContain('src/utils/helpers.ts');
    expect(matches).not.toContain('tests/index.test.ts');
  });

  it('should match extension patterns', () => {
    const matches = globMatches('*.md', files);
    expect(matches).toEqual(['README.md']);
  });

  it('should match dotfiles', () => {
    const matches = globMatches('.*', files);
    expect(matches).toContain('.gitignore');
  });

  it('should return empty array for non-matching patterns', () => {
    const matches = globMatches('*.py', files);
    expect(matches).toEqual([]);
  });
});

describe('isValidGlob', () => {
  it('should return true for valid globs', () => {
    expect(isValidGlob('*.ts')).toBe(true);
    expect(isValidGlob('src/**/*.js')).toBe(true);
    expect(isValidGlob('{a,b}.ts')).toBe(true);
  });

  it('should return true for simple paths (also valid globs)', () => {
    expect(isValidGlob('src/index.ts')).toBe(true);
  });
});

describe('isGlobPattern', () => {
  it('should return true for glob patterns', () => {
    expect(isGlobPattern('*.ts')).toBe(true);
    expect(isGlobPattern('src/**/*.js')).toBe(true);
    expect(isGlobPattern('file?.txt')).toBe(true);
    expect(isGlobPattern('{a,b}.ts')).toBe(true);
    expect(isGlobPattern('[abc].txt')).toBe(true);
  });

  it('should return false for plain paths', () => {
    expect(isGlobPattern('src/index.ts')).toBe(false);
    expect(isGlobPattern('package.json')).toBe(false);
    expect(isGlobPattern('.gitignore')).toBe(false);
  });
});
