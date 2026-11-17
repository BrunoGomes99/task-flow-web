import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const snapshotPath = path.join(root, 'api-contract/openapi.json');
const sourceUrl = 'http://localhost:8080/swagger/v1/swagger.json';

const response = await fetch(sourceUrl);
if (!response.ok) {
  console.error(`Failed to download ${sourceUrl}: HTTP ${response.status}`);
  process.exit(1);
}

const text = (await response.text()).replaceAll('\r\n', '\n');
await mkdir(path.dirname(snapshotPath), { recursive: true });
await writeFile(snapshotPath, text.endsWith('\n') ? text : `${text}\n`);

const prettier = spawnSync(
  process.execPath,
  [path.join(root, 'node_modules/prettier/bin/prettier.cjs'), '--write', snapshotPath],
  { stdio: 'inherit' },
);
if ((prettier.status ?? 1) !== 0) {
  process.exit(prettier.status ?? 1);
}

await mkdir(path.join(root, 'src/app/core/api/generated'), { recursive: true });

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error('Run this script with npm run api:refresh so it can call api:types.');
  process.exit(1);
}

const types = spawnSync(process.execPath, [npmCli, 'run', 'api:types'], {
  cwd: root,
  stdio: 'inherit',
});
if ((types.status ?? 1) !== 0) {
  process.exit(types.status ?? 1);
}

console.log(
  'Reminder: update api-contract/API_REF to the task-flow-api commit or tag this snapshot came from.',
);
