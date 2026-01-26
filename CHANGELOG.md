# Changelog

All notable changes to lostconf will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.1] - 2026-01-26

### Fixed
- Minor documentation updates

## [0.2.0] - 2026-01-26

### Added
- Smart severity classification system (LOW, MEDIUM, HIGH)
- Progress indicator for scanning large repositories
- `--min-severity` option to filter findings by severity level
- `--show-all` flag to show all findings including low severity
- `--skip-ignore-files` option to skip common ignore files
- `--exclude-parsers` option to exclude specific parsers
- `--no-progress` option to disable progress indicator
- Comprehensive validation report across 10 major OSS projects
- Automated NPM publishing workflow with provenance attestation
- Release automation script for streamlined version bumping
- NPM publishing guide with setup instructions
- CHANGELOG.md following Keep a Changelog format
- `.npmignore` to control published package contents

### Changed
- Default behavior now hides LOW severity patterns (use `--show-all` to see them)
- Improved path resolution for relative patterns in nested configs
- Enhanced output formatting with severity indicators

### Fixed
- Path resolution bug causing false positives in nested configuration files
- 52% reduction in false positives for projects like Vite

## [0.1.0] - 2026-01-26

### Added
- Initial release of lostconf meta-linter
- Support for 48+ configuration file types across 15+ languages
- File path, glob pattern, and regex pattern validation
- Multiple output formats: text, JSON, SARIF
- CI/CD integration support
- GitHub Code Scanning integration via SARIF
- Built-in parsers for:
  - JavaScript/TypeScript: ESLint, Prettier, TypeScript, Jest, Stylelint, Biome, Deno
  - Python: pytest, mypy, ruff, black, isort, flake8, pylint, bandit, pyright
  - Ruby: RuboCop
  - Go: golangci-lint
  - Rust: rustfmt, clippy
  - Java: Checkstyle, PMD, SpotBugs
  - Kotlin: detekt
  - PHP: PHP_CodeSniffer, PHPStan
  - Swift: SwiftLint
  - C/C++: clang-tidy, clang-format
  - Scala: Scalafmt, Scalafix
  - Elixir: Credo
  - .NET: EditorConfig, MSBuild
  - Shell: ShellCheck
  - YAML: yamllint
  - Terraform: TFLint
  - Security: Semgrep, Gitleaks
  - Docker: Hadolint
  - General: Git (.gitignore), Docker (.dockerignore), markdownlint
- Command-line options:
  - `--format` (text, json, sarif)
  - `--output` (write to file)
  - `--include` / `--exclude` (filter config files)
  - `--fail-on-stale` (exit code 1 for CI)
  - `--quiet` / `--verbose` (output control)
- Comprehensive test suite with 168+ tests
- Full TypeScript type definitions
- MIT License

### Documentation
- README with detailed usage instructions
- API documentation for programmatic usage
- Examples for CI/CD integration
- Contributing guidelines

[Unreleased]: https://github.com/lostconf/lostconf/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/lostconf/lostconf/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/lostconf/lostconf/releases/tag/v0.2.0
[0.1.0]: https://github.com/lostconf/lostconf/releases/tag/v0.1.0
