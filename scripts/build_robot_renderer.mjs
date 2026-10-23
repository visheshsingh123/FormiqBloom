/* Optional maintenance only. The website serves the prebuilt local renderer. */
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await build({entryPoints: [resolve(root, 'src/robot-model.js')], outfile: resolve(root, 'vendor/robot-renderer.js'),
  bundle: true, format: 'esm', minify: true, target: 'es2020', legalComments: 'eof'});
