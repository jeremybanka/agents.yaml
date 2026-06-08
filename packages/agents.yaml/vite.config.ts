import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    clean: true,
    deps: {
      dts: {
        neverBundle: [/^[\w@]/],
      },
      onlyBundle: [],
      skipNodeModulesBundle: true,
    },
    dts: true,
    entry: ['src/index.ts'],
    format: 'esm',
    outDir: 'dist',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
