#!/usr/bin/env node

/**
 * CLI entry point for lostconf
 */

import { parseArgs } from 'node:util';
import fs from 'fs/promises';
import { createEngine } from './core/engine.js';
import { getBuiltinParsers } from './parsers/index.js';
import { createTextFormatter } from './output/text.js';
import { createJsonFormatter } from './output/json.js';
import { createSarifFormatter } from './output/sarif.js';
import type { Formatter } from './output/formatter.js';
import { Severity } from './core/types.js';

const VERSION = '0.4.1';

const HELP = `Usage: lostconf [options] [paths...]

A meta-linter that detects stale references in configuration files

Arguments:
  paths                          Paths to scan (default: current directory)

Options:
  -V, --version                  output the version number
  -f, --format <fmt>             Output format: text, json, sarif (default: "text")
  -o, --output <file>            Write to file instead of stdout
  --include <glob>               Only check matching config files (repeatable)
  --exclude <glob>               Skip matching config files (repeatable)
  --skip-ignore-files            Skip .gitignore, .prettierignore, etc. (reduces noise)
  --exclude-parsers <name>       Skip specific parsers (repeatable, e.g., gitignore prettierignore)
  --min-severity <level>         Minimum severity to show: low, medium, high (default: "medium")
  --show-all                     Show all findings including low severity (same as --min-severity=low)
  --fail-on-stale                Exit code 1 if stale patterns found
  -q, --quiet                    Suppress non-error output
  -v, --verbose                  Show debug info
  --no-progress                  Disable progress indicator
  -h, --help                     display help for command
`;

const options = {
  version: { type: 'boolean' as const, short: 'V' },
  help: { type: 'boolean' as const, short: 'h' },
  format: { type: 'string' as const, short: 'f', default: 'text' },
  output: { type: 'string' as const, short: 'o' },
  include: { type: 'string' as const, multiple: true },
  exclude: { type: 'string' as const, multiple: true },
  'skip-ignore-files': { type: 'boolean' as const, default: false },
  'exclude-parsers': { type: 'string' as const, multiple: true },
  'min-severity': { type: 'string' as const, default: 'medium' },
  'show-all': { type: 'boolean' as const, default: false },
  'fail-on-stale': { type: 'boolean' as const, default: false },
  quiet: { type: 'boolean' as const, short: 'q', default: false },
  verbose: { type: 'boolean' as const, short: 'v', default: false },
  progress: { type: 'boolean' as const, default: true }
};

let values: Record<string, unknown>;
let positionals: string[];
try {
  const parsed = parseArgs({ options, allowPositionals: true, strict: true });
  values = parsed.values as Record<string, unknown>;
  positionals = parsed.positionals;
} catch (err) {
  console.error(`error: ${err instanceof Error ? err.message : String(err)}`);
  console.error(`Try 'lostconf --help' for more information.`);
  process.exit(2);
}

if (values.help) {
  process.stdout.write(HELP);
  process.exit(0);
}

if (values.version) {
  console.log(VERSION);
  process.exit(0);
}

interface CliOptions {
  format: string;
  output?: string;
  include?: string[];
  exclude?: string[];
  skipIgnoreFiles?: boolean;
  excludeParsers?: string[];
  minSeverity?: string;
  showAll?: boolean;
  failOnStale?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  progress?: boolean;
}

const cliOptions: CliOptions = {
  format: (values.format as string | undefined) ?? 'text',
  output: values.output as string | undefined,
  include: values.include as string[] | undefined,
  exclude: values.exclude as string[] | undefined,
  skipIgnoreFiles: values['skip-ignore-files'] as boolean | undefined,
  excludeParsers: values['exclude-parsers'] as string[] | undefined,
  minSeverity: values['min-severity'] as string | undefined,
  showAll: values['show-all'] as boolean | undefined,
  failOnStale: values['fail-on-stale'] as boolean | undefined,
  quiet: values.quiet as boolean | undefined,
  verbose: values.verbose as boolean | undefined,
  progress: values.progress as boolean | undefined
};

try {
  await run(positionals, cliOptions);
} catch (err) {
  if (!cliOptions.quiet) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  }
  process.exit(2);
}

async function run(paths: string[], options: CliOptions): Promise<void> {
  const {
    format,
    output,
    include,
    exclude,
    skipIgnoreFiles = false,
    excludeParsers = [],
    minSeverity: minSeverityStr = 'medium',
    showAll = false,
    failOnStale = false,
    quiet = false,
    verbose = false,
    progress = true
  } = options;

  // Determine minimum severity
  let minSeverity: Severity;
  if (showAll) {
    minSeverity = Severity.LOW;
  } else {
    switch (minSeverityStr.toLowerCase()) {
      case 'low':
        minSeverity = Severity.LOW;
        break;
      case 'medium':
        minSeverity = Severity.MEDIUM;
        break;
      case 'high':
        minSeverity = Severity.HIGH;
        break;
      default:
        console.error(`Invalid severity level: ${minSeverityStr}. Using 'medium'.`);
        minSeverity = Severity.MEDIUM;
    }
  }

  // Default to current directory if no paths specified
  const scanPaths = paths.length > 0 ? paths : ['.'];

  // Get formatter
  const formatter = getFormatter(format);

  // Get all built-in parsers
  let parsers = getBuiltinParsers();

  // Filter parsers based on options
  // If skipIgnoreFiles is enabled, find all parsers whose names end with 'ignore'
  // Note: This filters parser names (e.g., 'gitignore', 'stylelintignore'), not file paths.
  // Parser names are defined in code, so a directory named 'superignore' won't be affected.
  // Special case: 'ignoresecrets' doesn't end with 'ignore' but is an ignore file
  const ignoreParserNames = skipIgnoreFiles
    ? parsers
        .filter((p) => p.name.endsWith('ignore') || p.name === 'ignoresecrets')
        .map((p) => p.name)
    : [];
  const excludeParserSet = new Set([...ignoreParserNames, ...excludeParsers]);

  if (excludeParserSet.size > 0) {
    parsers = parsers.filter((p) => !excludeParserSet.has(p.name));
    if (verbose) {
      console.error(`[lostconf] Excluded parsers: ${Array.from(excludeParserSet).join(', ')}`);
    }
  }

  // Create engine
  const engine = createEngine(parsers, {
    paths: scanPaths,
    include,
    exclude,
    verbose,
    progress: progress && !quiet && !verbose && format === 'text'
  });

  // Run validation
  const rawResult = await engine.run();

  // Filter findings based on severity
  const severityOrder = { [Severity.LOW]: 0, [Severity.MEDIUM]: 1, [Severity.HIGH]: 2 };
  const minSeverityLevel = severityOrder[minSeverity];

  const filteredFindings = rawResult.findings.filter(
    (finding) => severityOrder[finding.severity] >= minSeverityLevel
  );

  const hiddenCount = rawResult.findings.length - filteredFindings.length;

  const result = {
    findings: filteredFindings,
    summary: {
      total: filteredFindings.length,
      files: new Set(filteredFindings.map((f) => f.file)).size
    }
  };

  // Format output
  let formatted = formatter.format(result);

  // Add note about hidden findings if any (only for text format)
  if (hiddenCount > 0 && !quiet && format === 'text') {
    const hiddenText = hiddenCount === 1 ? 'pattern' : 'patterns';
    formatted += `\n${hiddenCount} low severity ${hiddenText} hidden. Use --show-all to see them.`;
  }

  // Write output
  if (output) {
    await fs.writeFile(output, formatted, 'utf-8');
    if (!quiet) {
      console.log(`Results written to ${output}`);
    }
  } else if (!quiet) {
    console.log(formatted);
  }

  // Exit code
  if (failOnStale && result.findings.length > 0) {
    process.exit(1);
  }
}

function getFormatter(format: string): Formatter {
  switch (format) {
    case 'json':
      return createJsonFormatter();
    case 'sarif':
      return createSarifFormatter();
    case 'text':
    default:
      return createTextFormatter();
  }
}
