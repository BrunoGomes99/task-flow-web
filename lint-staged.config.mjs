import { spawnSync } from 'node:child_process';
import path from 'node:path';

const root = import.meta.dirname;

function isGenerated(file) {
  return file.replaceAll('\\', '/').includes('/src/app/core/api/generated/');
}

function run(script, args) {
  const result = spawnSync(process.execPath, [path.join(root, script), ...args], {
    cwd: root,
    stdio: 'inherit',
  });
  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

export default {
  '*.{ts,html}': (filenames) => {
    const files = filenames.filter((file) => !isGenerated(file));
    if (files.length === 0) {
      return [];
    }
    run('node_modules/eslint/bin/eslint.js', ['--max-warnings=0', '--fix', ...files]);
    run('node_modules/prettier/bin/prettier.cjs', ['--write', ...files]);
    return [];
  },
  '*.{css,js,mjs,cjs,json,md}': (filenames) => {
    run('node_modules/prettier/bin/prettier.cjs', ['--write', ...filenames]);
    return [];
  },
};
