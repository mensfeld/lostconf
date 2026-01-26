import { describe, it, expect } from 'vitest';
import { reekParser } from '../../src/parsers/reek.js';
import { PatternType } from '../../src/core/types.js';

describe('reekParser', () => {
  it('should have correct name and patterns', () => {
    expect(reekParser.name).toBe('reek');
    expect(reekParser.filePatterns).toContain('.reek.yml');
    expect(reekParser.filePatterns).toContain('.reek');
  });

  it('should parse exclude_paths with directory paths', () => {
    const content = `
exclude_paths:
  - app/views
  - app/controllers/legacy
  - lib/deprecated
`;
    const patterns = reekParser.parse('.reek.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('app/views');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('app/controllers/legacy');
    expect(patterns[2].value).toBe('lib/deprecated');
  });

  it('should parse exclude_paths with glob patterns', () => {
    const content = `
exclude_paths:
  - 'lib/legacy/**/*'
  - 'vendor/**/*.rb'
  - 'spec/**/*'
`;
    const patterns = reekParser.parse('.reek.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('lib/legacy/**/*');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should handle empty config', () => {
    const content = '';
    const patterns = reekParser.parse('.reek.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config without exclude_paths', () => {
    const content = `
detectors:
  UtilityFunction:
    enabled: false
`;
    const patterns = reekParser.parse('.reek.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = reekParser.parse('.reek.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle mixed paths and globs', () => {
    const content = `
exclude_paths:
  - app/views
  - 'lib/**/*.rake'
  - vendor
  - 'spec/**/*_spec.rb'
`;
    const patterns = reekParser.parse('.reek.yml', content);

    expect(patterns).toHaveLength(4);
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.PATH);
    expect(patterns[3].type).toBe(PatternType.GLOB);
  });

  it('should track line numbers', () => {
    const content = `
exclude_paths:
  - app/views
  - lib/legacy
`;
    const patterns = reekParser.parse('.reek.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].line).toBeGreaterThan(1);
    expect(patterns[1].line).toBeGreaterThan(patterns[0].line);
  });
});
