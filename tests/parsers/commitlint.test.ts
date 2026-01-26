import { describe, it, expect } from 'vitest';
import { commitlintParser } from '../../src/parsers/commitlint.js';
import { PatternType } from '../../src/core/types.js';

describe('commitlintParser', () => {
  it('should have correct name and patterns', () => {
    expect(commitlintParser.name).toBe('commitlint');
    expect(commitlintParser.filePatterns).toContain('.commitlintrc');
    expect(commitlintParser.filePatterns).toContain('.commitlintrc.json');
  });

  it('should parse ignores with regex patterns', () => {
    const content = `{
  "ignores": [
    "^WIP:",
    "^Merge branch",
    "^Revert"
  ]
}`;
    const patterns = commitlintParser.parse('.commitlintrc.json', content);

    expect(patterns).toHaveLength(3);
    expect(patterns[0].value).toBe('^WIP:');
    expect(patterns[0].type).toBe(PatternType.REGEX);
    expect(patterns[1].value).toBe('^Merge branch');
    expect(patterns[2].value).toBe('^Revert');
  });

  it('should parse extends with file paths', () => {
    const content = `{
  "extends": [
    "./custom-config.js",
    "../shared/commitlint.config.js"
  ]
}`;
    const patterns = commitlintParser.parse('.commitlintrc.json', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].value).toBe('./custom-config.js');
    expect(patterns[0].type).toBe(PatternType.PATH);
    expect(patterns[1].value).toBe('../shared/commitlint.config.js');
  });

  it('should skip npm package names in extends', () => {
    const content = `{
  "extends": [
    "@commitlint/config-conventional",
    "@commitlint/config-angular"
  ]
}`;
    const patterns = commitlintParser.parse('.commitlintrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle empty config', () => {
    const content = '{}';
    const patterns = commitlintParser.parse('.commitlintrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid JSON', () => {
    const content = 'not valid json';
    const patterns = commitlintParser.parse('.commitlintrc.json', content);

    expect(patterns).toHaveLength(0);
  });

  it('should track line numbers', () => {
    const content = `{
  "ignores": [
    "^WIP:",
    "^Merge"
  ]
}`;
    const patterns = commitlintParser.parse('.commitlintrc.json', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0].line).toBe(3);
    expect(patterns[1].line).toBe(4);
  });

  it('should handle mixed extends with packages and paths', () => {
    const content = `{
  "extends": [
    "@commitlint/config-conventional",
    "./local-config.js"
  ]
}`;
    const patterns = commitlintParser.parse('.commitlintrc.json', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].value).toBe('./local-config.js');
    expect(patterns[0].type).toBe(PatternType.PATH);
  });
});
