import { describe, it, expect } from 'vitest';
import { brakemanParser } from '../../src/parsers/brakeman.js';
import { PatternType } from '../../src/core/types.js';

describe('brakemanParser', () => {
  it('should have correct name and patterns', () => {
    expect(brakemanParser.name).toBe('brakeman');
    expect(brakemanParser.filePatterns).toContain('config/brakeman.yml');
    expect(brakemanParser.filePatterns).toContain('.brakeman.yml');
  });

  it('should parse skip-files with paths', () => {
    const content = `
skip-files:
  - app/views
  - app/controllers/legacy
  - lib/deprecated
`;
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('app/views');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('app/controllers/legacy');
    expect(patterns[2].value).toBe('lib/deprecated');
  });

  it('should parse skip-files with glob patterns', () => {
    const content = `
skip-files:
  - 'app/views/**/*'
  - '*.erb'
  - 'lib/**/*.rake'
`;
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('app/views/**/*');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[2].type).toBe(PatternType.GLOB);
  });

  it('should parse only-files patterns', () => {
    const content = `
only-files:
  - app/models
  - app/controllers
`;
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('app/models');
    expect(patterns[1].value).toBe('app/controllers');
  });

  it('should parse both skip-files and only-files', () => {
    const content = `
skip-files:
  - app/views
only-files:
  - app/models
  - app/controllers
`;
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('app/views');
    expect(patterns[1].value).toBe('app/models');
    expect(patterns[2].value).toBe('app/controllers');
  });

  it('should handle empty config', () => {
    const content = '';
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config without skip-files or only-files', () => {
    const content = `
quiet: true
confidence_threshold: 2
`;
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML', () => {
    const content = 'not: valid: yaml:';
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle directory patterns with trailing slashes', () => {
    const content = `
skip-files:
  - app/views/
  - vendor/
`;
    const patterns = brakemanParser.parse('config/brakeman.yml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('app/views/');
    expect(patterns[1].value).toBe('vendor/');
  });
});
