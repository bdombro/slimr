import {defineConfig} from 'tsup'

export default defineConfig({
  dts: true,
  entry: ['src'],
  // esbuildPlugins: [YourPlugin],
  esbuildOptions(options) {
    // https://esbuild.github.io/api/#external
    options.external = ['react', 'react-dom']
  },
  format: ['cjs', 'esm'],
  minify: true,
  outDir: 'src',
  splitting: false,
  sourcemap: true,
  target: 'es2020',
})
