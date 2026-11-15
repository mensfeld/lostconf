/**
 * Main orchestration engine
 */

import fs from 'fs/promises';
import path from 'path';
import type { Finding, ValidationResult } from './types.js';
import { discoverConfigs } from './discovery.js';
import type { DiscoveryOptions } from './discovery.js';
import { scanFileTree } from '../filetree/tree.js';
import type { FileTree } from '../filetree/tree.js';
import { validatePatterns } from '../validator/validator.js';
import type { Parser } from '../plugin/types.js';

export interface EngineOptions {
  /** Directories to scan */
  paths: string[];
  /** Glob patterns to include config files */
  include?: string[];
  /** Glob patterns to exclude config files */
  exclude?: string[];
  /** Enable verbose logging */
  verbose?: boolean;
  /** Show progress indicator */
  progress?: boolean;
}

export interface Engine {
  /** Run validation and return results */
  run(): Promise<ValidationResult>;
}

/** Compare strings by code unit, independent of the locale */
function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Order findings by file, line, column and pattern */
function compareFindings(a: Finding, b: Finding): number {
  return (
    compareStrings(a.file, b.file) ||
    a.line - b.line ||
    (a.column ?? 0) - (b.column ?? 0) ||
    compareStrings(a.pattern, b.pattern)
  );
}

/** Create the validation engine */
export function createEngine(parsers: Parser[], options: EngineOptions): Engine {
  const { paths, include, exclude, verbose = false, progress = false } = options;

  const log = verbose ? (msg: string) => console.error(`[lostconf] ${msg}`) : () => {};

  return {
    async run(): Promise<ValidationResult> {
      // Step 1: Discover config files
      log('Discovering config files...');
      if (progress) process.stderr.write('Discovering config files...');
      const discoveryOptions: DiscoveryOptions = { paths, include, exclude };
      const configs = await discoverConfigs(parsers, discoveryOptions);
      log(`Found ${configs.length} config files`);
      if (progress) {
        process.stderr.write('\r\x1b[K'); // Clear line
        process.stderr.write(`Found ${configs.length} config files\n`);
      }

      if (configs.length === 0) {
        return {
          findings: [],
          summary: { total: 0, files: 0 }
        };
      }

      // Step 2: Build file tree
      log('Scanning file tree...');
      if (progress) process.stderr.write('Scanning file tree...');
      const basePath = paths.length === 1 ? path.resolve(paths[0]) : process.cwd();
      const tree: FileTree = await scanFileTree({ paths: [basePath] });
      log(`Found ${tree.files.size} files`);
      if (progress) {
        process.stderr.write('\r\x1b[K'); // Clear line
        process.stderr.write(`Scanned ${tree.files.size} files\n`);
      }

      // Step 3: Parse and validate each config
      const allFindings: Finding[] = [];
      const filesWithFindings = new Set<string>();

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        log(`Processing ${config.path} with ${config.parser.name}...`);

        // Show progress
        if (progress) {
          const percent = Math.round(((i + 1) / configs.length) * 100);
          const shortPath = config.path.length > 60 ? '...' + config.path.slice(-57) : config.path;
          process.stderr.write(`\r\x1b[K`); // Clear line
          process.stderr.write(
            `Processing configs... [${i + 1}/${configs.length}] ${percent}% - ${shortPath}`
          );
        }

        try {
          const content = await fs.readFile(config.absolutePath, 'utf-8');
          const patterns = config.parser.parse(config.path, content);
          log(`  Found ${patterns.length} patterns`);

          const findings = validatePatterns(config.path, patterns, config.parser.name, tree);

          if (findings.length > 0) {
            filesWithFindings.add(config.path);
            allFindings.push(...findings);
            log(`  ${findings.length} stale patterns`);
          }
        } catch (err) {
          log(`  Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // Clear progress line
      if (progress) {
        process.stderr.write('\r\x1b[K'); // Clear line
        process.stderr.write(`Processed ${configs.length} config files\n\n`);
      }

      // Config discovery order varies between runs; sort so output is byte-stable
      allFindings.sort(compareFindings);

      return {
        findings: allFindings,
        summary: {
          total: allFindings.length,
          files: filesWithFindings.size
        }
      };
    }
  };
}
