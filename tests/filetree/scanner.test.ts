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
      tree = await scanFileTree({ paths: [basePath] });
    });

    afterAll(async () => {
      await fs.rm(tree.basePath, { recursive: true, force: true });
    });

    it('should list a nested ignored directory and its parents', () => {
      expect([...tree.directories].sort()).toEqual(['pkg', 'pkg/node_modules']);
    });

    it('should not list the contents of an ignored directory', () => {
      expect(tree.files.size).toBe(0);
    });
  });
});
