/**
 * Integration tests for Bandit parser
 */

import { describe, it, expect } from 'vitest';
import { banditParser } from '../../src/parsers/bandit.js';
import { PatternType } from '../../src/core/types.js';

describe('Bandit Parser', () => {
  it('should parse .bandit with exclude_dirs', () => {
    const content = `exclude_dirs:
  - /test
  - /build
  - /dist/**`;

    const patterns = banditParser.parse('.bandit', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('/test');
    expect(patterns[1].value).toBe('/build');
    expect(patterns[2]).toMatchObject({
      value: '/dist/**',
      type: PatternType.GLOB
    });
  });

  it('should parse exclude patterns', () => {
    const content = `exclude:
  - '*/test_*.py'
  - '*.pyc'
  - '.git'`;

    const patterns = banditParser.parse('.bandit', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0]).toMatchObject({
      value: '*/test_*.py',
      type: PatternType.GLOB
    });
    expect(patterns[1]).toMatchObject({
      value: '*.pyc',
      type: PatternType.GLOB
    });
    expect(patterns[2]).toMatchObject({
      value: '.git',
      type: PatternType.PATH
    });
  });

  it('should not extract test IDs from tests', () => {
    const content = `tests:
  - B201
  - B301
exclude_dirs:
  - tests/fixtures`;

    const patterns = banditParser.parse('.bandit', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      value: 'tests/fixtures',
      type: PatternType.PATH
    });
  });

  it('should handle both exclude_dirs and exclude', () => {
    const content = `exclude_dirs:
  - /build
  - /dist
exclude:
  - '*.min.js'
  - 'vendor/**'`;

    const patterns = banditParser.parse('.bandit', content);

    expect(patterns).toHaveLength(4);
    expect(patterns[0].value).toBe('/build');
    expect(patterns[1].value).toBe('/dist');
    expect(patterns[2].value).toBe('*.min.js');
    expect(patterns[3].value).toBe('vendor/**');
  });

  it('should handle empty lists', () => {
    const content = `exclude_dirs: []
skips:
  - B201`;

    const patterns = banditParser.parse('.bandit', content);
    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML gracefully', () => {
    const content = 'not: valid: yaml: [[[';
    const patterns = banditParser.parse('.bandit', content);
    expect(patterns).toHaveLength(0);
  });

  it('should handle complex paths', () => {
    const content = `exclude_dirs:
  - ./tests/integration/**
  - src/generated
  - node_modules`;

    const patterns = banditParser.parse('.bandit', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0]).toMatchObject({
      value: './tests/integration/**',
      type: PatternType.GLOB
    });
    expect(patterns[1]).toMatchObject({
      value: 'src/generated',
      type: PatternType.PATH
    });
    expect(patterns[2]).toMatchObject({
      value: 'node_modules',
      type: PatternType.PATH
    });
  });
});
