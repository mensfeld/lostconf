import { describe, it, expect } from 'vitest';
import { bufParser } from '../../src/parsers/buf.js';
import { PatternType } from '../../src/core/types.js';

describe('bufParser', () => {
  it('should have correct name and patterns', () => {
    expect(bufParser.name).toBe('buf');
    expect(bufParser.filePatterns).toContain('buf.yaml');
    expect(bufParser.filePatterns).toContain('buf.work.yaml');
  });

  it('should parse lint ignore patterns', () => {
    const content = `
version: v1
lint:
  ignore:
    - proto/legacy
    - proto/deprecated
`;
    const patterns = bufParser.parse('buf.yaml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('proto/legacy');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('proto/deprecated');
  });

  it('should parse breaking ignore patterns', () => {
    const content = `
version: v1
breaking:
  ignore:
    - proto/experimental
    - proto/v1alpha
`;
    const patterns = bufParser.parse('buf.yaml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('proto/experimental');
    expect(patterns[1].value).toBe('proto/v1alpha');
  });

  it('should parse ignore_only patterns', () => {
    const content = `
version: v1
lint:
  ignore_only:
    ENUM_ZERO_VALUE_SUFFIX:
      - proto/legacy/old.proto
    FIELD_LOWER_SNAKE_CASE:
      - proto/v1/types.proto
`;
    const patterns = bufParser.parse('buf.yaml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('proto/legacy/old.proto');
    expect(patterns[1].value).toBe('proto/v1/types.proto');
  });

  it('should parse workspace directories', () => {
    const content = `
version: v1
directories:
  - proto
  - vendor/proto
  - third_party
`;
    const patterns = bufParser.parse('buf.work.yaml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('proto');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('vendor/proto');
    expect(patterns[2].value).toBe('third_party');
  });

  it('should handle glob patterns', () => {
    const content = `
version: v1
lint:
  ignore:
    - 'proto/**/*_test.proto'
    - '*.deprecated.proto'
`;
    const patterns = bufParser.parse('buf.yaml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[1].type).toBe(PatternType.GLOB);
  });

  it('should handle empty config', () => {
    const content = `
version: v1
`;
    const patterns = bufParser.parse('buf.yaml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = bufParser.parse('buf.yaml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should parse mixed lint and breaking ignores', () => {
    const content = `
version: v1
lint:
  ignore:
    - proto/legacy
breaking:
  ignore:
    - proto/experimental
`;
    const patterns = bufParser.parse('buf.yaml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('proto/legacy');
    expect(patterns[1].value).toBe('proto/experimental');
  });
});
