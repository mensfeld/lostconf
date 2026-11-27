/**
 * Integration tests for Hadolint parser
 */

import { describe, it, expect } from 'vitest';
import { hadolintParser } from '../../src/parsers/hadolint.js';

describe('Hadolint Parser', () => {
  it('should not extract rule codes from ignored', () => {
    const content = `ignored:
  - DL3008
  - SC2086`;

    const patterns = hadolintParser.parse('.hadolint.yaml', content);
    expect(patterns).toHaveLength(0);
  });

  it('should not extract registry hosts from trustedRegistries', () => {
    const content = `trustedRegistries:
  - docker.io
  - registry.local
  - https://gcr.io`;

    const patterns = hadolintParser.parse('.hadolint.yaml', content);
    expect(patterns).toHaveLength(0);
  });

  it('should not extract anything from a full config', () => {
    const content = `ignored:
  - DL3008
trustedRegistries:
  - docker.io
failure-threshold: error
override:
  error:
    - DL3001`;

    const patterns = hadolintParser.parse('hadolint.yml', content);
    expect(patterns).toHaveLength(0);
  });

  it('should handle invalid YAML gracefully', () => {
    const content = 'ignored: [[[';
    const patterns = hadolintParser.parse('.hadolint.yaml', content);
    expect(patterns).toHaveLength(0);
  });
});
