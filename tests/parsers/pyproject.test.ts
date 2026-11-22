import { describe, it, expect } from 'vitest';
import { pyprojectParser } from '../../src/parsers/pyproject.js';
import { PatternType } from '../../src/core/types.js';

describe('pyprojectParser', () => {
  it('should have correct name and patterns', () => {
    expect(pyprojectParser.name).toBe('pyproject');
    expect(pyprojectParser.filePatterns).toContain('pyproject.toml');
  });

  it('should parse pytest testpaths', () => {
    const content = `
[tool.pytest.ini_options]
testpaths = ["tests", "integration_tests"]
`;
    const patterns = pyprojectParser.parse('pyproject.toml', content);

    expect(patterns.length).toBeGreaterThanOrEqual(2);
    expect(patterns.some((p) => p.value === 'tests')).toBe(true);
    expect(patterns.some((p) => p.value === 'integration_tests')).toBe(true);
  });

  it('should parse coverage omit patterns', () => {
    const content = `
[tool.coverage.run]
omit = ["tests/*", "setup.py"]
`;
    const patterns = pyprojectParser.parse('pyproject.toml', content);

    expect(patterns.some((p) => p.value === 'tests/*')).toBe(true);
    expect(patterns.some((p) => p.type === PatternType.GLOB)).toBe(true);
  });

  it('should parse ruff exclude patterns', () => {
    const content = `
[tool.ruff]
exclude = [".git", "node_modules", "*.pyi"]
`;
    const patterns = pyprojectParser.parse('pyproject.toml', content);

    expect(patterns.some((p) => p.value === '.git')).toBe(true);
    expect(patterns.some((p) => p.value === 'node_modules')).toBe(true);
    expect(patterns.some((p) => p.value === '*.pyi')).toBe(true);
  });

  it('should skip coverage exclude_lines, which match source lines', () => {
    const content = `
[tool.coverage.report]
exclude_lines = ["pragma: no cover", "if TYPE_CHECKING:", '^\\s*\\.\\.\\.$']
omit = ["setup.py"]
`;
    const patterns = pyprojectParser.parse('pyproject.toml', content);

    expect(patterns.map((p) => p.value)).toEqual(['setup.py']);
  });

  it('should skip pytest python_classes and python_functions, which match test names', () => {
    const content = `
[tool.pytest.ini_options]
python_files = ["test_*.py"]
python_classes = ["Test", "Describe*"]
python_functions = ["test_", "it_*"]
`;
    const patterns = pyprojectParser.parse('pyproject.toml', content);

    expect(patterns.map((p) => p.value)).toEqual(['test_*.py']);
    expect(patterns[0].type).toBe(PatternType.GLOB);
  });

  it('should handle invalid TOML gracefully', () => {
    const content = `invalid toml content [[[`;
    const patterns = pyprojectParser.parse('pyproject.toml', content);
    expect(patterns).toEqual([]);
  });
});
