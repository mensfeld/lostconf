import { describe, it, expect } from 'vitest';
import { alexIgnoreParser, alexRcParser } from '../../src/parsers/alex.js';
import { PatternType } from '../../src/core/types.js';

describe('alexIgnoreParser', () => {
  it('should have correct name and patterns', () => {
    expect(alexIgnoreParser.name).toBe('alexignore');
    expect(alexIgnoreParser.filePatterns).toContain('.alexignore');
  });

  it('should parse simple paths', () => {
    const content = `
node_modules
dist
coverage
`;
    const patterns = alexIgnoreParser.parse('.alexignore', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('node_modules');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('dist');
    expect(patterns[2].value).toBe('coverage');
  });

  it('should parse glob patterns', () => {
    const content = `
*.md
docs/**/*.txt
`;
    const patterns = alexIgnoreParser.parse('.alexignore', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].type).toBe(PatternType.GLOB);
    expect(patterns[0].value).toBe('*.md');
    expect(patterns[1].type).toBe(PatternType.GLOB);
    expect(patterns[1].value).toBe('docs/**/*.txt');
  });

  it('should handle negated patterns', () => {
    const content = `
*.md
!README.md
`;
    const patterns = alexIgnoreParser.parse('.alexignore', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[1].negated).toBe(true);
    expect(patterns[1].value).toBe('README.md');
  });

  it('should skip comments and empty lines', () => {
    const content = `
# This is a comment
*.md

# Another comment
docs/
`;
    const patterns = alexIgnoreParser.parse('.alexignore', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('*.md');
    expect(patterns[1].value).toBe('docs/');
  });
});

describe('alexRcParser', () => {
  it('should have correct name and patterns', () => {
    expect(alexRcParser.name).toBe('alexrc');
    expect(alexRcParser.filePatterns).toContain('.alexrc');
    expect(alexRcParser.filePatterns).toContain('.alexrc.json');
  });

  it('should not parse allow list (linguistic terms, not paths)', () => {
    const content = `{
  "allow": ["boogeyman", "garbageman", "mailman"]
}`;
    const patterns = alexRcParser.parse('.alexrc', content);

    // The 'allow' field contains words to allow, not file paths
    expect(patterns).toHaveLength(0);
  });

  it('should handle empty config', () => {
    const content = '{}';
    const patterns = alexRcParser.parse('.alexrc', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle config with profanitySureness', () => {
    const content = `{
  "profanitySureness": 1
}`;
    const patterns = alexRcParser.parse('.alexrc', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid JSON', () => {
    const content = 'not valid json';
    const patterns = alexRcParser.parse('.alexrc', content);

    expect(patterns).toHaveLength(0);
  });
});
