import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { scanFileTree, FileTree } from '../../src/filetree/scanner.js';

describe('scanFileTree', () => {
  describe('default-ignored directories', () => {
    let tree: FileTree;

    beforeAll(async () => {
      const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'lostconf-'));
      await fs.mkdir(path.join(basePath, 'pkg', 'node_modules', 'x'), { recursive: true });
      await fs.writeFile(path.join(basePath, 'pkg', 'node_modules', 'x', 'a.js'), '');
      await fs.writeFile(path.join(basePath, 'pkg', 'node_modules', 'b.js'), '');
      await fs.mkdir(path.join(basePath, 'lib'));
      await fs.writeFile(path.join(basePath, 'lib', 'a.js'), '');
      await fs.writeFile(path.join(basePath, 'lib', 'node_modules'), '');
      tree = await scanFileTree({ paths: [basePath] });
    });

    afterAll(async () => {
      await fs.rm(tree.basePath, { recursive: true, force: true });
    });

    it('should list a nested ignored directory and its parents', () => {
      expect([...tree.directories].sort()).toEqual(['lib', 'pkg', 'pkg/node_modules']);
    });

    it('should not list the contents of an ignored directory or a file with an ignored name', () => {
      expect([...tree.files]).toEqual(['lib/a.js']);
    });

    it('should scan a base path that has an ignored directory name', async () => {
      const subtree = await scanFileTree({
        paths: [path.join(tree.basePath, 'pkg', 'node_modules')]
      });

      expect([...subtree.files].sort()).toEqual(['b.js', 'x/a.js']);
    });
  });

  describe('.git entries', () => {
    let tree: FileTree;

    beforeAll(async () => {
      const basePath = await fs.mkdtemp(path.join(os.tmpdir(), 'lostconf-'));
      await fs.mkdir(path.join(basePath, '.git'));
      await fs.writeFile(path.join(basePath, '.git', 'HEAD'), '');
      await fs.mkdir(path.join(basePath, 'sub'));
      await fs.writeFile(path.join(basePath, 'sub', '.git'), 'gitdir: ../.git/modules/sub\n');
      tree = await scanFileTree({ paths: [basePath] });
    });

    afterAll(async () => {
      await fs.rm(tree.basePath, { recursive: true, force: true });
    });

    it('should list a .git file and not a .git directory as a file', () => {
      expect([...tree.files]).toEqual(['sub/.git']);
      expect([...tree.directories].sort()).toEqual(['.git', 'sub']);
    });
  });
});
