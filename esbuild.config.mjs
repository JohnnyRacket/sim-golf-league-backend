import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  outdir: 'dist',
  sourcemap: true,
  // Native/binary packages must stay external (resolved from node_modules at runtime)
  external: ['pg-native', 'bcrypt'],
  // Mark all bare-specifier imports as external so they resolve from node_modules
  // This avoids bundling everything into one giant file and keeps native deps working
  packages: 'external',
  banner: {
    // Polyfill require() for ESM — needed by some deps that use createRequire internally
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
});

console.log('Build complete → dist/');
