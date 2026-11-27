/**
 * Integration tests for Gitleaks parser
 */

import { describe, it, expect } from 'vitest';
import { gitleaksParser } from '../../src/parsers/gitleaks.js';
import { PatternType } from '../../src/core/types.js';

describe('Gitleaks Parser', () => {
  it('should parse .gitleaks.toml with allowlist paths', () => {
    const content = `[allowlist]
paths = [
  "test/**",
  "vendor",
  "node_modules"
]`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0]).toMatchObject({
      value: 'test/**',
      type: PatternType.GLOB
    });
    expect(patterns[1].value).toBe('vendor');
    expect(patterns[2].value).toBe('node_modules');
  });

  it('should skip allowlist regexes, which match secrets', () => {
    const content = `[allowlist]
regexes = [
  '''219-09-9999''',
  '''dummy-token-[0-9a-f]+''',
  "^test_"
]`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should parse rule-specific allowlists', () => {
    const content = `[[rules]]
id = "aws-access-key"
description = "AWS Access Key"
regex = '''AKIA[0-9A-Z]{16}'''

[rules.allowlist]
paths = [
  "tests/**",
  "fixtures/**"
]`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('tests/**');
    expect(patterns[1].value).toBe('fixtures/**');
  });

  it('should parse both global and rule allowlists', () => {
    const content = `[allowlist]
paths = ["vendor"]

[[rules]]
id = "test-rule"
regex = "secret"

[rules.allowlist]
paths = ["tests/**"]`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    const values = patterns.map((p) => p.value);
    expect(values).toContain('vendor');
    expect(values).toContain('tests/**');
  });

  it('should handle empty allowlist', () => {
    const content = `[allowlist]
paths = []
regexes = []`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);
    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid TOML gracefully', () => {
    const content = '[allowlist invalid';
    const patterns = gitleaksParser.parse('.gitleaks.toml', content);
    expect(patterns).toHaveLength(0);
  });

  it('should detect pattern types correctly', () => {
    const content = `[allowlist]
paths = [
  "tests/**",
  "*.min.js",
  "vendor"
]`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(3);
    const hasGlob = patterns.some((p) => p.type === PatternType.GLOB);
    const hasPath = patterns.some((p) => p.type === PatternType.PATH);
    expect(hasGlob).toBe(true);
    expect(hasPath).toBe(true);
  });

  it('should parse multiple rules', () => {
    const content = `[[rules]]
id = "rule1"
[rules.allowlist]
paths = ["tests/**"]

[[rules]]
id = "rule2"
[rules.allowlist]
paths = ["fixtures/**"]`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('tests/**');
    expect(patterns[1].value).toBe('fixtures/**');
  });

  it('should handle full gitleaks config', () => {
    const content = `title = "gitleaks config"

[allowlist]
paths = [
  "vendor/**",
  "node_modules"
]
regexes = [
  "^test_.*"
]

[[rules]]
id = "aws-key"
description = "AWS Access Key"
regex = '''AKIA[0-9A-Z]{16}'''
tags = ["key", "AWS"]

[rules.allowlist]
paths = ["tests/**"]
regexes = ["test_key"]`;

    const patterns = gitleaksParser.parse('.gitleaks.toml', content);

    expect(patterns).toHaveLength(3);
    const values = patterns.map((p) => p.value);
    expect(values).toContain('vendor/**');
    expect(values).toContain('node_modules');
    expect(values).not.toContain('^test_.*');
    expect(values).toContain('tests/**');
  });
});
