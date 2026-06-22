import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'));

function resolveElectronBuilderBin() {
  const binaryName = process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder';
  const localBin = join(rootDir, 'node_modules', '.bin', binaryName);

  if (existsSync(localBin)) {
    return localBin;
  }

  console.error('electron-builder not found. Run npm install first.');
  process.exit(1);
}

function resolvePlatformLabel(label) {
  if (label === 'auto') {
    if (process.platform === 'darwin') {
      return 'mac';
    }

    if (process.platform === 'win32') {
      return 'win';
    }

    return 'linux';
  }

  return label;
}

const [platformArg = 'auto', ...electronBuilderArgs] = process.argv.slice(2);
const platform = resolvePlatformLabel(platformArg);
const output = `release/${pkg.version}/${platform}`;
const electronBuilderBin = resolveElectronBuilderBin();

const result = spawnSync(
  electronBuilderBin,
  [...electronBuilderArgs, `--config.directories.output=${output}`],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env
  }
);

process.exit(result.status ?? 1);
