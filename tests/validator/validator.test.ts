import { describe, it, expect } from 'vitest';
import { validatePattern, validatePatterns } from '../../src/validator/validator.js';
import { Pattern, PatternType } from '../../src/core/types.js';
import { FileTree } from '../../src/filetree/scanner.js';

describe('validatePattern', () => {
  const mockTree: FileTree = {
    files: new Set([
      'src/index.ts',
      'src/utils/helpers.ts',
      'tests/index.test.ts',
      'package.json',
      'README.md'
    ]),
    directories: new Set(['src', 'src/utils', 'tests']),
    basePath: '/project'
  };

  describe('path patterns', () => {
    it('should validate existing file path', () => {
      const pattern: Pattern = {
        value: 'src/index.ts',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(true);
    });

    it('should validate existing directory path', () => {
      const pattern: Pattern = {
        value: 'src/utils',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(true);
    });

    it('should validate existing directory path with a trailing slash', () => {
      const pattern: Pattern = {
        value: 'src/utils/',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(true);
    });

    it('should invalidate non-existent path', () => {
      const pattern: Pattern = {
        value: 'src/missing.ts',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('file_not_found');
    });
  });

  describe('glob patterns', () => {
    it('should validate matching glob pattern', () => {
      const pattern: Pattern = {
        value: 'src/**/*.ts',
        type: PatternType.GLOB,
        line: 1
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(true);
    });

    it('should validate matching wildcard pattern', () => {
      const pattern: Pattern = {
        value: '*.md',
        type: PatternType.GLOB,
        line: 1
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(true);
    });

    it('should invalidate non-matching glob pattern', () => {
      const pattern: Pattern = {
        value: 'lib/**/*.js',
        type: PatternType.GLOB,
        line: 1
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('no_matches');
    });
  });

  describe('negated patterns', () => {
    it('should skip validation for negated patterns', () => {
      const pattern: Pattern = {
        value: 'important.log',
        type: PatternType.PATH,
        line: 1,
        negated: true
      };

      const result = validatePattern(pattern, mockTree);
      expect(result.valid).toBe(true);
    });
  });

  describe('relative path resolution', () => {
    it('should resolve relative paths with configBasePath option', () => {
      const tree: FileTree = {
        files: new Set(['packages/foo/bar.ts', 'packages/foo/src/index.ts']),
        directories: new Set(['packages', 'packages/foo', 'packages/foo/src']),
        basePath: '/project'
      };

      const pattern: Pattern = {
        value: './bar.ts',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, tree, { configBasePath: 'packages/foo' });
      expect(result.valid).toBe(true);
    });

    it('should resolve parent directory references', () => {
      const tree: FileTree = {
        files: new Set(['packages/shared/utils.ts', 'packages/foo/src/index.ts']),
        directories: new Set(['packages', 'packages/shared', 'packages/foo', 'packages/foo/src']),
        basePath: '/project'
      };

      const pattern: Pattern = {
        value: '../shared',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, tree, { configBasePath: 'packages/foo' });
      expect(result.valid).toBe(true);
    });

    it('should not modify absolute paths', () => {
      const tree: FileTree = {
        files: new Set(['/absolute/path/file.ts']),
        directories: new Set(['/absolute', '/absolute/path']),
        basePath: '/project'
      };

      const pattern: Pattern = {
        value: '/absolute/path/file.ts',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, tree, { configBasePath: 'packages/foo' });
      expect(result.valid).toBe(true);
    });

    it('should handle current directory reference', () => {
      const tree: FileTree = {
        files: new Set(['packages/foo/index.ts']),
        directories: new Set(['packages', 'packages/foo']),
        basePath: '/project'
      };

      const pattern: Pattern = {
        value: './index.ts',
        type: PatternType.PATH,
        line: 1
      };

      const result = validatePattern(pattern, tree, { configBasePath: 'packages/foo' });
      expect(result.valid).toBe(true);
    });
  });
});

describe('validatePatterns', () => {
  const mockTree: FileTree = {
    files: new Set(['src/index.ts', 'README.md']),
    directories: new Set(['src']),
    basePath: '/project'
  };

  it('should return findings for stale patterns', () => {
    const patterns: Pattern[] = [
      { value: 'src/index.ts', type: PatternType.PATH, line: 1 },
      { value: 'missing.ts', type: PatternType.PATH, line: 2 },
      { value: 'lib/**/*.js', type: PatternType.GLOB, line: 3 }
    ];

    const findings = validatePatterns('.gitignore', patterns, 'gitignore', mockTree);

    expect(findings).toHaveLength(2);
    expect(findings[0].pattern).toBe('missing.ts');
    expect(findings[0].reason).toBe('file_not_found');
    expect(findings[1].pattern).toBe('lib/**/*.js');
    expect(findings[1].reason).toBe('no_matches');
  });

  it('should include parser name in findings', () => {
    const patterns: Pattern[] = [{ value: 'nonexistent', type: PatternType.PATH, line: 1 }];

    const findings = validatePatterns('.eslintignore', patterns, 'eslintignore', mockTree);

    expect(findings[0].parser).toBe('eslintignore');
  });

  describe('nested config files', () => {
    it('should resolve relative paths in nested tsconfig files', () => {
      const tree: FileTree = {
        files: new Set([
          'packages/foo/tsconfig.json',
          'packages/foo/tsconfig.app.json',
          'packages/foo/tsconfig.node.json',
          'packages/foo/src/index.ts'
        ]),
        directories: new Set(['packages', 'packages/foo', 'packages/foo/src']),
        basePath: '/project'
      };

      const patterns: Pattern[] = [
        { value: './tsconfig.app.json', type: PatternType.PATH, line: 4 },
        { value: './tsconfig.node.json', type: PatternType.PATH, line: 5 },
        { value: './missing.json', type: PatternType.PATH, line: 6 }
      ];

      const findings = validatePatterns('packages/foo/tsconfig.json', patterns, 'tsconfig', tree);

      expect(findings).toHaveLength(1);
      expect(findings[0].pattern).toBe('./missing.json');
      expect(findings[0].file).toBe('packages/foo/tsconfig.json');
    });

    it('should resolve parent directory references in nested configs', () => {
      const tree: FileTree = {
        files: new Set([
          'packages/vite/src/client/tsconfig.json',
          'packages/vite/src/types/index.d.ts',
          'packages/vite/src/node/index.ts'
        ]),
        directories: new Set([
          'packages',
          'packages/vite',
          'packages/vite/src',
          'packages/vite/src/client',
          'packages/vite/src/types',
          'packages/vite/src/node'
        ]),
        basePath: '/project'
      };

      const patterns: Pattern[] = [
        { value: '../types', type: PatternType.PATH, line: 3 },
        { value: '../node', type: PatternType.PATH, line: 4 }
      ];

      const findings = validatePatterns(
        'packages/vite/src/client/tsconfig.json',
        patterns,
        'tsconfig',
        tree
      );

      expect(findings).toHaveLength(0);
    });

    it('should handle deeply nested template configs', () => {
      const tree: FileTree = {
        files: new Set([
          'packages/create-vite/template-react-ts/tsconfig.json',
          'packages/create-vite/template-react-ts/tsconfig.app.json',
          'packages/create-vite/template-react-ts/tsconfig.node.json'
        ]),
        directories: new Set([
          'packages',
          'packages/create-vite',
          'packages/create-vite/template-react-ts'
        ]),
        basePath: '/project'
      };

      const patterns: Pattern[] = [
        { value: './tsconfig.app.json', type: PatternType.PATH, line: 4 },
        { value: './tsconfig.node.json', type: PatternType.PATH, line: 5 }
      ];

      const findings = validatePatterns(
        'packages/create-vite/template-react-ts/tsconfig.json',
        patterns,
        'tsconfig',
        tree
      );

      expect(findings).toHaveLength(0);
    });
  });
});
