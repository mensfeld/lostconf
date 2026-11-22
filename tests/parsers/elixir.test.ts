import { describe, it, expect } from 'vitest';
import { credoParser } from '../../src/parsers/elixir.js';
import { PatternType } from '../../src/core/types.js';

describe('credoParser', () => {
  it('should ignore regexes in check params', () => {
    const content =
      '%{configs: [%{name: "default", checks: [{Credo.Check.Readability.ModuleDoc, [ignore_names: [~r/(\\.\\w+Controller|\\.Repo)$/]]}]}]}';

    expect(credoParser.parse('.credo.exs', content)).toEqual([]);
  });

  it('should extract a files.excluded regex', () => {
    const content = '%{configs: [%{name: "default", files: %{excluded: [~r"^old_lib"]}}]}';
    const patterns = credoParser.parse('.credo.exs', content);

    expect(patterns).toHaveLength(1);
    expect(patterns[0].value).toBe('^old_lib');
    expect(patterns[0].type).toBe(PatternType.REGEX);
    expect(patterns[0].line).toBe(1);
  });

  it('should extract only files included and excluded values', () => {
    const content = `%{
  configs: [
    %{
      name: "default",
      # files: %{excluded: ["commented/"]}
      files: %{
        included: [
          "lib/",
          "apps/*/lib/"
        ],
        excluded: [~r"^old_lib"]
      },
      checks: %{
        enabled: [
          {Credo.Check.Readability.ModuleDoc, [ignore_names: [~r/^MyApp\\.Web$/]]},
          {Credo.Check.Design.AliasUsage, [excluded_namespaces: ["File/Path"]]}
        ]
      }
    }
  ]
}`;
    const patterns = credoParser.parse('.credo.exs', content);

    expect(patterns.map((p) => [p.value, p.type, p.line])).toEqual([
      ['lib/', PatternType.PATH, 8],
      ['apps/*/lib/', PatternType.GLOB, 9],
      ['^old_lib', PatternType.REGEX, 11]
    ]);
  });

  it('should not end the files map at a brace in a string or regex', () => {
    const content = `%{configs: [%{
  files: %{included: ["}"], excluded: [~r(^}), "legacy/"]}
}]}`;
    const patterns = credoParser.parse('.credo.exs', content);

    expect(patterns.map((p) => p.value)).toEqual(['}', 'legacy/']);
  });
});
