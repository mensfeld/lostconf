/**
 * CLI integration tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('CLI Integration Tests', () => {
  const testDir = path.join(__dirname, '../temp-cli-test');
  const cliPath = path.join(__dirname, '../../dist/cli.js');

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should run successfully with --help', async () => {
    const { stdout, stderr } = await execAsync(`node ${cliPath} --help`);

    expect(stdout).toContain('lostconf');
    expect(stdout).toContain('Options:');
    expect(stdout).toContain('--format');
    expect(stderr).toBe('');
  });

  it('should show version with --version', async () => {
    const { stdout } = await execAsync(`node ${cliPath} --version`);

    expect(stdout).toContain('0.3.0');
  });

  it('should output text format by default', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-pattern');

    const { stdout } = await execAsync(`node ${cliPath} ${testDir} --show-all`);

    expect(stdout).toContain('stale-pattern');
    expect(stdout).toContain('Found');
  });

  it('should output JSON format', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-pattern');

    const { stdout } = await execAsync(`node ${cliPath} ${testDir} --format json --show-all`);

    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('findings');
    expect(result).toHaveProperty('summary');
    expect(result.findings).toBeInstanceOf(Array);
    expect(result.findings[0]).toHaveProperty('pattern', 'stale-pattern');
  });

  it('should output SARIF format', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-pattern');

    const { stdout } = await execAsync(`node ${cliPath} ${testDir} --format sarif`);

    const result = JSON.parse(stdout);
    expect(result).toHaveProperty('version', '2.1.0');
    expect(result).toHaveProperty('runs');
    expect(result.runs[0].tool.driver.name).toBe('lostconf');
  });

  it('should write output to file', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-pattern');

    const outputFile = path.join(testDir, 'output.json');
    await execAsync(`node ${cliPath} ${testDir} --format json --output ${outputFile}`);

    const content = await fs.readFile(outputFile, 'utf-8');
    const result = JSON.parse(content);
    expect(result).toHaveProperty('findings');
  });

  it('should exit with code 1 when --fail-on-stale and stale patterns found', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-pattern');

    try {
      await execAsync(`node ${cliPath} ${testDir} --fail-on-stale --show-all`);
      expect.fail('Should have thrown');
    } catch (error: any) {
      expect(error.code).toBe(1);
    }
  });

  it('should exit with code 0 when --fail-on-stale but no stale patterns', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), '*.log');
    // Create matching file
    await fs.writeFile(path.join(testDir, 'test.log'), 'content');

    const { code } = await execAsync(`node ${cliPath} ${testDir} --fail-on-stale`).then(
      () => ({ code: 0 }),
      (error) => ({ code: error.code })
    );

    expect(code).toBe(0);
  });

  it('should suppress output with --quiet', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-pattern');

    const { stdout } = await execAsync(`node ${cliPath} ${testDir} --quiet`);

    expect(stdout).toBe('');
  });

  it('should respect --include option', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-git');
    await fs.writeFile(path.join(testDir, '.prettierignore'), 'stale-prettier');

    const { stdout } = await execAsync(
      `node ${cliPath} ${testDir} --format json --include "**/.gitignore" --show-all`
    );

    const result = JSON.parse(stdout);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].pattern).toBe('stale-git');
  });

  it('should respect --exclude option', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-git');
    await fs.writeFile(path.join(testDir, '.prettierignore'), 'stale-prettier');

    const { stdout } = await execAsync(
      `node ${cliPath} ${testDir} --format json --exclude "**/.gitignore" --show-all`
    );

    const result = JSON.parse(stdout);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].pattern).toBe('stale-prettier');
  });

  it('should scan multiple paths', async () => {
    const dir1 = path.join(testDir, 'dir1');
    const dir2 = path.join(testDir, 'dir2');
    await fs.mkdir(dir1, { recursive: true });
    await fs.mkdir(dir2, { recursive: true });

    await fs.writeFile(path.join(dir1, '.gitignore'), 'stale1');
    await fs.writeFile(path.join(dir2, '.gitignore'), 'stale2');

    const { stdout } = await execAsync(`node ${cliPath} ${dir1} ${dir2} --format json --show-all`);

    const result = JSON.parse(stdout);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    const patterns = result.findings.map((f: any) => f.pattern);
    expect(patterns).toContain('stale1');
    expect(patterns).toContain('stale2');
  });

  it('should handle no stale patterns found', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), '*.log');
    // Create matching file
    await fs.writeFile(path.join(testDir, 'test.log'), 'content');

    const { stdout } = await execAsync(`node ${cliPath} ${testDir} --show-all`);

    expect(stdout).toContain('No stale patterns found');
  });

  it('should show verbose output with --verbose', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale');

    const { stderr } = await execAsync(`node ${cliPath} ${testDir} --verbose`);

    expect(stderr).toContain('[lostconf]');
    expect(stderr).toContain('Discovering config files');
  });

  it('should skip ignore files with --skip-ignore-files', async () => {
    await fs.writeFile(path.join(testDir, '.gitignore'), 'stale-git');
    await fs.writeFile(path.join(testDir, '.prettierignore'), 'stale-prettier');
    await fs.writeFile(path.join(testDir, '.eslintignore'), 'stale-eslint');
    await fs.writeFile(path.join(testDir, '.stylelintignore'), 'stale-stylelint');
    await fs.writeFile(path.join(testDir, '.dockerignore'), 'stale-docker');
    await fs.writeFile(path.join(testDir, '.remarkignore'), 'stale-remark');
    await fs.writeFile(path.join(testDir, '.lycheeignore'), 'stale-lychee');
    await fs.writeFile(path.join(testDir, '.secretlintignore'), 'stale-secretlint');
    await fs.writeFile(path.join(testDir, '.vscodeignore'), 'stale-vscode');
    await fs.writeFile(path.join(testDir, '.ignoresecrets'), 'stale-ignoresecrets');
    await fs.writeFile(path.join(testDir, 'tsconfig.json'), '{"exclude": ["stale-ts"]}');

    const { stdout } = await execAsync(
      `node ${cliPath} ${testDir} --format json --skip-ignore-files --show-all`
    );

    const result = JSON.parse(stdout);
    // Should only find the tsconfig.json stale pattern, not the ignore files
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].pattern).toBe('stale-ts');
  });

  it('should skip stylelintignore specifically with --skip-ignore-files', async () => {
    await fs.writeFile(path.join(testDir, '.stylelintignore'), 'stale-stylelint-pattern');

    // Without --skip-ignore-files, should find the stale pattern
    const { stdout: withoutSkip } = await execAsync(
      `node ${cliPath} ${testDir} --format json --show-all`
    );
    const resultWithout = JSON.parse(withoutSkip);
    expect(resultWithout.findings.length).toBeGreaterThan(0);
    expect(resultWithout.findings[0].pattern).toBe('stale-stylelint-pattern');

    // With --skip-ignore-files, should skip .stylelintignore
    const { stdout: withSkip } = await execAsync(
      `node ${cliPath} ${testDir} --format json --skip-ignore-files --show-all`
    );
    const resultWith = JSON.parse(withSkip);
    expect(resultWith.findings).toHaveLength(0);
  });
});
