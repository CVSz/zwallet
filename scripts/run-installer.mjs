#!/usr/bin/env node
import { open } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const DEFAULT_CONFIG = 'scripts/installer.config.json';

function resolveConfigPath() {
  const cliArg = process.argv.find((arg) => arg.startsWith('--config='));
  const rawPath = cliArg ? cliArg.split('=')[1] : process.env.ZWALLET_INSTALLER_CONFIG ?? DEFAULT_CONFIG;
  return path.resolve(process.cwd(), rawPath);
}

function run(command) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { stdio: 'inherit', shell: true });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`Command failed (${code}): ${command}`));
    });
  });
}

function assertNodeMajor(requiredMajor) {
  const actual = Number.parseInt(process.versions.node.split('.')[0], 10);
  if (actual < requiredMajor) {
    throw new Error(`Node.js ${requiredMajor}+ is required. Current: ${process.versions.node}`);
  }
}

const configPath = resolveConfigPath();
const fd = await open(configPath, constants.O_RDONLY | constants.O_NOFOLLOW);
const raw = await fd.readFile('utf8');
await fd.close();
const config = JSON.parse(raw);

if (!Array.isArray(config.steps) || config.steps.length === 0) {
  throw new Error('Installer config must contain non-empty "steps" array.');
}

if (config.node?.requiredMajor) {
  assertNodeMajor(config.node.requiredMajor);
}

console.log(`Using installer config: ${path.relative(process.cwd(), configPath)}`);

for (const step of config.steps) {
  if (!step.command || !step.id) {
    throw new Error('Each step must include "id" and "command".');
  }
  console.log(`\n▶ ${step.id}`);
  await run(step.command);
}

console.log('\n✅ Automated installer setup completed successfully.');
