import { defineConfig } from "vite-plus"

export default defineConfig({
	pack: {
		clean: true,
		deps: {
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
