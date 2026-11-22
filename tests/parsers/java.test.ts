/**
 * Integration tests for Java parsers
 */

import { describe, it, expect } from 'vitest';
import { checkstyleParser, pmdParser, spotbugsParser } from '../../src/parsers/java.js';
import { PatternType } from '../../src/core/types.js';

describe('Checkstyle Parser', () => {
  it('should parse suppress files attributes', () => {
    const content = `<suppressions>
  <suppress checks="LineLength" files="generated/.*"/>
</suppressions>`;

    const patterns = checkstyleParser.parse('checkstyle-suppressions.xml', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({ value: 'generated/.*', type: PatternType.GLOB, line: 2 });
  });
});

describe('PMD Parser', () => {
  it('should parse file and path attributes', () => {
    const content = `<ruleset name="app">
  <rule ref="category/java/bestpractices.xml" file="src/A.java"/>
  <rule ref="category/java/design.xml" path="src/main/java"/>
</ruleset>`;

    const patterns = pmdParser.parse('pmd.xml', content);

    expect(patterns).toHaveLength(2);
    expect(patterns[0]).toMatchObject({ value: 'src/A.java', type: PatternType.PATH, line: 2 });
    expect(patterns[1]).toMatchObject({ value: 'src/main/java', type: PatternType.PATH, line: 3 });
  });

  it('should not extract rule names from exclude name', () => {
    const content = `<ruleset name="app">
  <rule ref="category/java/bestpractices.xml">
    <exclude name="UnusedPrivateField"/>
  </rule>
</ruleset>`;

    const patterns = pmdParser.parse('pmd.xml', content);

    expect(patterns).toEqual([]);
  });
});

describe('SpotBugs Parser', () => {
  it('should parse Source name attributes', () => {
    const content = `<FindBugsFilter>
  <Match>
    <Source name="src/main/java/App.java"/>
  </Match>
</FindBugsFilter>`;

    const patterns = spotbugsParser.parse('spotbugs-exclude.xml', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0]).toMatchObject({
      value: 'src/main/java/App.java',
      type: PatternType.PATH,
      line: 3
    });
  });

  it('should not extract bug patterns from Bug pattern', () => {
    const content = `<FindBugsFilter>
  <Match>
    <Bug pattern="DLS_DEAD_LOCAL_STORE"/>
  </Match>
</FindBugsFilter>`;

    const patterns = spotbugsParser.parse('spotbugs-exclude.xml', content);

    expect(patterns).toEqual([]);
  });
});
