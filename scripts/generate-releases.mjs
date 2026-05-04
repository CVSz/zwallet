#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const defaultOutput = 'docs/releases/RELEASE_NOTES.md';
const outputArgIndex = process.argv.findIndex((arg) => arg === '--output');
const outputPath = outputArgIndex > -1 && process.argv[outputArgIndex + 1]
  ? process.argv[outputArgIndex + 1]
  : defaultOutput;

const now = new Date().toISOString();

const run = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const latestTag = run('git describe --tags --abbrev=0 2>/dev/null || true');
const range = latestTag ? `${latestTag}..HEAD` : 'HEAD';
const history = run(`git log ${range} --pretty=format:%h%x09%s%x09%an --no-merges`);

const lines = history
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [sha, subject, author] = line.split('\t');
    return `- ${subject} (${sha}, @${author})`;
  });

const notes = [
  '# zWallet Release Notes',
  '',
  `Generated at: ${now}`,
  latestTag ? `Base tag: ${latestTag}` : 'Base tag: none (full history)',
  '',
  '## Changes',
  '',
  ...(lines.length ? lines : ['- No commits found.'])
].join('\n');

const outputAbsolute = resolve(outputPath);
mkdirSync(dirname(outputAbsolute), { recursive: true });
writeFileSync(outputAbsolute, `${notes}\n`, 'utf8');

console.log(`Release notes written to ${outputPath}`);
