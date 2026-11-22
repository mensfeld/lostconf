/**
 * Integration tests for PHP parsers
 */

import { describe, it, expect } from 'vitest';
import { phpcsParser } from '../../src/parsers/php.js';
import { PatternType } from '../../src/core/types.js';

describe('PHPCS Parser', () => {
  it('should parse exclude-pattern and file elements', () => {
    const content = `<ruleset name="app">
  <file>src</file>
  <exclude-pattern>vendor/*</exclude-pattern>
</ruleset>`;

    const patterns = phpcsParser.parse('phpcs.xml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0]).toMatchObject({ value: 'src', type: PatternType.PATH, line: 2 });
    expect(patterns[1]).toMatchObject({ value: 'vendor/*', type: PatternType.GLOB, line: 3 });
  });

  it('should not extract sniff codes from exclude name', () => {
    const content = `<ruleset name="app">
  <rule ref="PSR12">
    <exclude name="Generic.Files.LineLength"/>
  </rule>
</ruleset>`;

    const patterns = phpcsParser.parse('phpcs.xml', content);

    expect(patterns).toEqual([]);
  });
});
