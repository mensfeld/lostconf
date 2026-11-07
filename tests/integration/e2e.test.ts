/**
 * End-to-end integration tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createEngine } from '../../src/core/engine.js';
import { discoverConfigs } from '../../src/core/discovery.js';
import { getBuiltinParsers } from '../../src/parsers/index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('End-to-End Integration Tests', () => {
  const testDir = path.join(__dirname, '../temp-test-dir');

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const run = async () => {
    const engine = createEngine(getBuiltinParsers(), {
      paths: [testDir],
      verbose: false
    });
    return engine.run();
  };

  it('should detect stale patterns in .gitignore', async () => {
    // Create .gitignore with stale patterns
    await fs.writeFile(
      path.join(testDir, '.gitignore'),
      `node_modules
dist
legacy-folder-that-does-not-exist
*.log`
    );

    // Create some files
    await fs.mkdir(path.join(testDir, 'node_modules'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'dist'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'app.log'), 'test');

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      verbose: false
    });

    const result = await engine.run();

    expect(result.findings.length).toBeGreaterThan(0);
    const stalePaths = result.findings.map((f) => f.pattern);
    expect(stalePaths).toContain('legacy-folder-that-does-not-exist');
  });

  it('should detect stale patterns in biome.json', async () => {
    // Create biome.json with stale patterns
    await fs.writeFile(
      path.join(testDir, 'biome.json'),
      JSON.stringify(
        {
          files: {
            ignore: ['dist', 'build', 'non-existent/**']
          }
        },
        null,
        2
      )
    );

    await fs.mkdir(path.join(testDir, 'dist'), { recursive: true });

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      verbose: false
    });

    const result = await engine.run();

    expect(result.findings.length).toBeGreaterThan(0);
    const stalePaths = result.findings.map((f) => f.pattern);
    expect(stalePaths).toContain('build');
    expect(stalePaths).toContain('non-existent/**');
  });

  it('should detect stale patterns in .flake8', async () => {
    // Create .flake8 with stale patterns
    await fs.writeFile(
      path.join(testDir, '.flake8'),
      `[flake8]
exclude =
    .git,
    __pycache__,
    old_directory,
    *.pyc`
    );

    await fs.mkdir(path.join(testDir, '.git'), { recursive: true });

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      verbose: false
    });

    const result = await engine.run();

    expect(result.findings.length).toBeGreaterThan(0);
    const stalePaths = result.findings.map((f) => f.pattern);
    expect(stalePaths).toContain('__pycache__');
    expect(stalePaths).toContain('old_directory');
    expect(stalePaths).toContain('*.pyc');
  });

  it('should not report findings for valid patterns', async () => {
    // Create config with all valid patterns
    await fs.writeFile(path.join(testDir, '.gitignore'), `*.log`);

    // Create matching file
    await fs.writeFile(path.join(testDir, 'app.log'), 'test');

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      verbose: false
    });

    const result = await engine.run();

    expect(result.findings).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });

  it('should handle multiple config files in one scan', async () => {
    // Create multiple config files
    await fs.writeFile(path.join(testDir, '.gitignore'), `stale-gitignore-pattern`);

    await fs.writeFile(path.join(testDir, '.prettierignore'), `stale-prettier-pattern`);

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      verbose: false
    });

    const result = await engine.run();

    expect(result.findings.length).toBe(2);
    expect(result.summary.files).toBe(2);

    const patterns = result.findings.map((f) => f.pattern);
    expect(patterns).toContain('stale-gitignore-pattern');
    expect(patterns).toContain('stale-prettier-pattern');
  });

  it('should respect include option', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), `stale-pattern`);
    await fs.writeFile(path.join(testDir, '.prettierignore'), `another-stale-pattern`);

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      include: ['**/.gitignore'],
      verbose: false
    });

    const result = await engine.run();

    // Should only check .gitignore
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].pattern).toBe('stale-pattern');
  });

  it('should respect exclude option', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), `stale-pattern`);
    await fs.writeFile(path.join(testDir, '.prettierignore'), `another-stale-pattern`);

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      exclude: ['**/.gitignore'],
      verbose: false
    });

    const result = await engine.run();

    // Should only check .prettierignore
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].pattern).toBe('another-stale-pattern');
  });

  it('should handle nested directories', async () => {
    // Create nested structure
    const srcDir = path.join(testDir, 'src');
    const libDir = path.join(testDir, 'lib');
    await fs.mkdir(srcDir, { recursive: true });
    await fs.mkdir(libDir, { recursive: true });

    await fs.writeFile(path.join(srcDir, '.eslintignore'), `stale-in-src`);
    await fs.writeFile(path.join(libDir, '.eslintignore'), `stale-in-lib`);

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      verbose: false
    });

    const result = await engine.run();

    expect(result.findings).toHaveLength(2);
    const patterns = result.findings.map((f) => f.pattern);
    expect(patterns).toContain('stale-in-src');
    expect(patterns).toContain('stale-in-lib');
  });

  it('should validate glob patterns correctly', async () => {
    await fs.writeFile(
      path.join(testDir, '.gitignore'),
      `*.test.js
**/*.spec.js
src/**/*.tmp`
    );

    // Create matching files
    await fs.mkdir(path.join(testDir, 'src'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'app.test.js'), 'test');
    await fs.writeFile(path.join(testDir, 'src', 'file.tmp'), 'tmp');

    const parsers = getBuiltinParsers();
    const engine = createEngine(parsers, {
      paths: [testDir],
      verbose: false
    });

    const result = await engine.run();

    // **/*.spec.js has no matches (stale)
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].pattern).toBe('**/*.spec.js');
  });

  describe('ignore file syntax', () => {
    it('should resolve anchored, trailing-slash and escaped patterns', async () => {
      await fs.writeFile(path.join(testDir, 'CHANGELOG.md'), '');
      await fs.mkdir(path.join(testDir, 'docs'));
      await fs.writeFile(path.join(testDir, 'docs', 'a.md'), '');
      await fs.writeFile(path.join(testDir, '#notes.md'), '');
      await fs.writeFile(path.join(testDir, '!bang.md'), '');
      await fs.writeFile(
        path.join(testDir, '.remarkignore'),
        '/CHANGELOG.md\ndocs/\n\\#notes.md\n\\!bang.md\n'
      );

      const result = await run();

      expect(result.findings).toHaveLength(0);
    });

    it('should anchor a leading / to the ignore file directory', async () => {
      await fs.mkdir(path.join(testDir, 'sub'));
      await fs.writeFile(path.join(testDir, 'sub', 'a.txt'), '');
      await fs.writeFile(path.join(testDir, 'sub', '.gitignore'), '/a.txt\n');

      const result = await run();

      expect(result.findings).toHaveLength(0);
    });

    it('should match an anchored glob in a root ignore file at the root only', async () => {
      await fs.mkdir(path.join(testDir, 'sub'));
      await fs.writeFile(path.join(testDir, 'sub', 'x.md'), '');
      await fs.writeFile(path.join(testDir, '.remarkignore'), '/*.md\n');

      const result = await run();

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].pattern).toBe('*.md');
    });

    it('should match an escaped leading ! in a glob literally', async () => {
      await fs.writeFile(path.join(testDir, 'x.md'), '');
      await fs.writeFile(path.join(testDir, '.remarkignore'), '\\!*.md\n');

      expect((await run()).findings).toHaveLength(1);

      await fs.writeFile(path.join(testDir, '!a.md'), '');

      expect((await run()).findings).toHaveLength(0);
    });

    it('should not match a file with a trailing slash pattern', async () => {
      await fs.writeFile(path.join(testDir, 'docs'), '');
      await fs.writeFile(path.join(testDir, '.remarkignore'), 'docs/\n');

      const result = await run();

      expect(result.findings).toHaveLength(1);
    });

    it('should report a missing anchored pattern', async () => {
      await fs.writeFile(path.join(testDir, '.remarkignore'), '/missing.md\n');

      const result = await run();

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].pattern).toBe('missing.md');
    });
  });

  describe('symlinks', () => {
    const configPaths = async () =>
      (await discoverConfigs(getBuiltinParsers(), { paths: [testDir] })).map((c) => c.path);

    const writeRubocop = async (dir: string, excludes: string[]) => {
      await fs.writeFile(
        path.join(dir, '.rubocop.yml'),
        `AllCops:\n  Exclude:\n${excludes.map((e) => `    - ${e}`).join('\n')}\n`
      );
    };

    it('should treat a symlink to a file as present', async () => {
      await fs.writeFile(path.join(testDir, 'real.rb'), '');
      await fs.symlink('real.rb', path.join(testDir, 'link.rb'));
      await writeRubocop(testDir, ['link.rb']);

      const result = await run();

      expect(result.findings).toHaveLength(0);
    });

    it('should treat a path through a directory symlink as present', async () => {
      await fs.mkdir(path.join(testDir, 'real'));
      await fs.writeFile(path.join(testDir, 'real', 'a.rb'), '');
      await fs.symlink('real', path.join(testDir, 'linked'));
      await writeRubocop(testDir, ['linked', 'linked/a.rb']);

      const result = await run();

      expect(result.findings).toHaveLength(0);
    });

    it('should match a trailing slash through a directory symlink to directories only', async () => {
      await fs.mkdir(path.join(testDir, 'real', 'sub'), { recursive: true });
      await fs.writeFile(path.join(testDir, 'real', 'a.rb'), '');
      await fs.symlink('real', path.join(testDir, 'linked'));
      await writeRubocop(testDir, ['linked/', 'linked/sub/', 'linked/a.rb/']);

      const result = await run();

      expect(result.findings.map((f) => f.pattern)).toEqual(['linked/a.rb/']);
    });

    it('should report a path through a directory symlink whose target is missing', async () => {
      await fs.mkdir(path.join(testDir, 'real'));
      await fs.symlink('real', path.join(testDir, 'linked'));
      await writeRubocop(testDir, ['linked/missing.rb']);

      const result = await run();

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].pattern).toBe('linked/missing.rb');
    });

    it('should report a dangling symlink as stale', async () => {
      await fs.symlink('nothing.rb', path.join(testDir, 'gone.rb'));
      await writeRubocop(testDir, ['gone.rb']);

      const result = await run();

      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].pattern).toBe('gone.rb');
    });

    it('should find a config once when a directory symlink points to its directory', async () => {
      await fs.mkdir(path.join(testDir, 'real'));
      await fs.writeFile(path.join(testDir, 'real', 'a.rb'), '');
      await writeRubocop(path.join(testDir, 'real'), ['a.rb']);
      await fs.symlink('real', path.join(testDir, 'linked'));

      expect(await configPaths()).toEqual(['real/.rubocop.yml']);
      expect((await run()).findings).toHaveLength(0);
    });

    it('should not loop on a symlink cycle', async () => {
      await fs.mkdir(path.join(testDir, 'a'));
      await fs.symlink('..', path.join(testDir, 'a', 'up'));
      await fs.writeFile(path.join(testDir, 'real.rb'), '');
      await writeRubocop(testDir, ['real.rb']);

      expect(await configPaths()).toEqual(['.rubocop.yml']);
      expect((await run()).findings).toHaveLength(0);
    });

    it('should discover a config file that is a symlink to a file', async () => {
      await fs.writeFile(path.join(testDir, 'real.rb'), '');
      await writeRubocop(testDir, ['real.rb', 'missing.rb']);
      await fs.rename(path.join(testDir, '.rubocop.yml'), path.join(testDir, 'shared.yml'));
      await fs.symlink('shared.yml', path.join(testDir, '.rubocop.yml'));

      expect(await configPaths()).toEqual(['.rubocop.yml']);
      const result = await run();
      expect(result.findings.map((f) => f.pattern)).toEqual(['missing.rb']);
    });

    it('should not discover a config symlink to a FIFO', async () => {
      execFileSync('mkfifo', [path.join(testDir, 'pipe')]);
      await fs.symlink('pipe', path.join(testDir, '.rubocop.yml'));

      expect(await configPaths()).toEqual([]);
      expect((await run()).findings).toHaveLength(0);
    });
  });
});
