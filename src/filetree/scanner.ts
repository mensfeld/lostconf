/**
 * File tree scanner using fast-glob
 */

import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

export interface ScanOptions {
  /** Directories to scan */
  paths: string[];
  /** Glob patterns to exclude */
  ignore?: string[];
  /** Follow symlinks */
  followSymlinks?: boolean;
}

export interface FileTree {
  /** All files in the tree (relative paths) */
  files: Set<string>;
  /** All directories in the tree (relative paths) */
  directories: Set<string>;
  /** Symlinks to directories (relative paths), not followed during the scan */
  directorySymlinks?: Set<string>;
  /** Base path for the tree */
  basePath: string;
}

/** Default ignore patterns */
const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/.next/**',
  '**/coverage/**',
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**',
  '**/.tox/**',
  '**/vendor/**'
];

/** Files and directory symlinks among fast-glob entries */
export interface ClassifiedEntries {
  /** Regular files and symlinks to anything but a directory */
  files: string[];
  /** Symlinks to directories */
  directorySymlinks: Set<string>;
}

/** Split fast-glob object-mode entries into files and directory symlinks */
export async function classifyEntries(
  basePath: string,
  entries: fg.Entry[]
): Promise<ClassifiedEntries> {
  const files: string[] = [];
  const directorySymlinks = new Set<string>();
  const symlinks: string[] = [];
  for (const entry of entries) {
    if (entry.dirent.isFile()) {
      files.push(entry.path);
    } else if (entry.dirent.isSymbolicLink()) {
      symlinks.push(entry.path);
    }
  }

  // Dangling symlinks are left out, so references to them stay stale
  const targets = await Promise.all(
    symlinks.map((link) => fs.promises.stat(path.join(basePath, link)).catch(() => null))
  );
  symlinks.forEach((link, i) => {
    const target = targets[i];
    if (target?.isDirectory()) {
      directorySymlinks.add(link);
    } else if (target) {
      files.push(link);
    }
  });

  return { files, directorySymlinks };
}

/** Scan a directory and build a file tree */
export async function scanFileTree(options: ScanOptions): Promise<FileTree> {
  const { paths, ignore = [], followSymlinks = false } = options;
  const basePath = paths.length === 1 ? path.resolve(paths[0]) : process.cwd();

  const allIgnore = [...DEFAULT_IGNORE, ...ignore];

  // Scan for all entries; symlinks are listed but not followed unless requested
  const entries = await fg('**/*', {
    cwd: basePath,
    dot: true,
    onlyFiles: false,
    objectMode: true,
    ignore: allIgnore,
    followSymbolicLinks: followSymlinks
  });

  const { files, directorySymlinks } = await classifyEntries(basePath, entries);

  // Build directory set from file paths
  const directories = new Set<string>();
  for (const file of files) {
    const dir = path.dirname(file);
    if (dir !== '.') {
      // Add all parent directories
      const parts = dir.split('/');
      let current = '';
      for (const part of parts) {
        current = current ? `${current}/${part}` : part;
        directories.add(current);
      }
    }
  }

  for (const link of directorySymlinks) {
    directories.add(link);
  }

  return {
    files: new Set(files),
    directories,
    directorySymlinks,
    basePath
  };
}

/** Check if a path exists in the file tree */
export function pathExists(tree: FileTree, targetPath: string): boolean {
  const normalized = targetPath.replace(/\\/g, '/').replace(/^\.\//, '');
  if (tree.files.has(normalized) || tree.directories.has(normalized)) {
    return true;
  }
  return existsThroughDirectorySymlink(tree, normalized);
}

/** Check a path below a directory symlink with one stat of the full path */
function existsThroughDirectorySymlink(tree: FileTree, normalized: string): boolean {
  if (!tree.directorySymlinks || tree.directorySymlinks.size === 0) {
    return false;
  }

  const parts = normalized.split('/');
  let current = '';
  for (let i = 0; i < parts.length - 1; i++) {
    current = current ? `${current}/${parts[i]}` : parts[i];
    if (tree.directorySymlinks.has(current)) {
      return fs.existsSync(path.join(tree.basePath, normalized));
    }
  }
  return false;
}

/** Get all files matching a glob pattern */
export function matchGlob(tree: FileTree, pattern: string): string[] {
  // This is handled by the validator using micromatch
  // This function is just for direct lookups
  const normalized = pattern.replace(/\\/g, '/').replace(/^\.\//, '');
  const matches: string[] = [];

  for (const file of tree.files) {
    if (file === normalized || file.startsWith(normalized + '/')) {
      matches.push(file);
    }
  }

  return matches;
}
