import { defineConfig } from "vite-plus"

export default defineConfig({
	pack: {
		clean: true,
		deps: {
			// tsdown <0.23 compatibility: resolve external dependency subpaths.
			// Remove to preserve subpath imports as written (the new default).
			// https://tsdown.dev/options/dependencies#deps-resolvedepsubpath
			resolveDepSubpath: true,
			neverBundle: true,
			onlyBundle: [],
		},
		// This executable has no library exports. `vp check` type-checks the source.
		dts: false,
		entry: ["src/index.ts"],
		format: "esm",
		outDir: "dist",
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
})
