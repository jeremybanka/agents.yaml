#!/usr/bin/env node

import { run } from "./run.ts"

run(process.argv.slice(2)).catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error)
	console.error(`agents: ${message}`)
	process.exitCode = 1
})
