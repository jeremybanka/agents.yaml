import { defineConfig } from "vite-plus"

export default defineConfig({
	pack: {
		clean: true,
		deps: {
			dts: {
				neverBundle: [/^[\w@]/],
			},
			neverBundle: true,
			onlyBundle: [],
		},
		dts: true,
		entry: ["src/index.ts"],
		format: "esm",
		outDir: "dist",
	},
	test: {
		include: ["src/**/*.test.ts"],
	},
})
