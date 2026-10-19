import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: false,
  splitting: false,
  // React is a peer dependency and must never be bundled.
  external: ['react', 'react-dom'],
  // Emit .js for ESM and .cjs for CommonJS so `exports` resolves cleanly.
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
