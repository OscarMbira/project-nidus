import { build } from 'esbuild';
import { argv } from 'process';
try {
  await build({ entryPoints: [argv[2]], bundle: false, write: false, loader: { '.jsx': 'jsx' } });
  console.log('OK:', argv[2]);
} catch (e) {
  console.error('FAIL:', argv[2]);
  process.exit(1);
}
