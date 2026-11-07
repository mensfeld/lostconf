/**
 * Config file auto-discovery
 */

import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';
import type { Parser } from '../plugin/types.js';

export interface DiscoveryOptions {
  /** Directories to scan */
  paths: string[];
  /** Glob patterns to include */
  include?: string[];
  /** Glob patterns to exclude */
  exclude?: string[];
}

export interface DiscoveredConfig {
  /** Path to the config file (relative to base) */
  path: string;
  /** Absolute path */
  absolutePath: string;
  /** Parser that can handle this file */
  parser: Parser;
}

/** Discover config files that can be parsed */
export async function discoverConfigs(
  parsers: Parser[],
  options: DiscoveryOptions
): Promise<DiscoveredConfig[]> {
  const { paths, include, exclude = [] } = options;
  const basePath = paths.length === 1 ? path.resolve(paths[0]) : process.cwd();

  // Build patterns from all parsers
  const allPatterns = new Set<string>();
  for (const parser of parsers) {
    for (const pattern of parser.filePatterns) {
      allPatterns.add(pattern);
    }
  }

  // Apply include filter if specified
  let searchPatterns: string[];
  if (include && include.length > 0) {
    searchPatterns = include;
  } else {
    searchPatterns = Array.from(allPatterns);
  }

  // Default excludes
  const defaultExclude = ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'];

  // Find all matching config files; directory symlinks are not followed, so a
  // config is found once, at its real path, and symlink cycles cannot loop
  const entries = await fg(searchPatterns, {
    cwd: basePath,
    dot: true,
    onlyFiles: false,
    objectMode: true,
    followSymbolicLinks: false,
    ignore: [...defaultExclude, ...exclude]
  });

  const files: string[] = [];
  for (const entry of entries) {
    if (entry.dirent.isFile()) {
      files.push(entry.path);
    } else if (entry.dirent.isSymbolicLink() && (await isFileTarget(basePath, entry.path))) {
      files.push(entry.path);
    }
  }

  // Match files to parsers
  const discovered: DiscoveredConfig[] = [];

  for (const file of files) {
    for (const parser of parsers) {
      if (fileMatchesParser(file, parser)) {
        discovered.push({
          path: file,
          absolutePath: path.join(basePath, file),
          parser
        });
        break; // Only use first matching parser
      }
    }
  }

  return discovered;
}

/** Check if a symlink points to a file */
async function isFileTarget(basePath: string, link: string): Promise<boolean> {
  try {
    return (await fs.promises.stat(path.join(basePath, link))).isFile();
  } catch {
    return false;
  }
}

/** Check if a file matches a parser's patterns */
function fileMatchesParser(file: string, parser: Parser): boolean {
  const basename = path.basename(file);

  for (const pattern of parser.filePatterns) {
    // Exact match
    if (pattern === basename || pattern === file) {
      return true;
    }

    // Handle **/pattern
    if (pattern.startsWith('**/')) {
      const suffix = pattern.slice(3);
      if (basename === suffix || file.endsWith('/' + suffix)) {
        return true;
      }
    }

    // Handle *.extension patterns
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (file.endsWith(ext)) {
        return true;
      }
    }
  }

  return false;
}
