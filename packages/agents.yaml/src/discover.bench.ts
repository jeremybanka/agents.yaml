import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { performance } from "node:perf_hooks"
import { discoverAgentDocuments, type DiscoverOptions } from "./discover.ts"

type BenchmarkCase = {
	name: string
	options?: DiscoverOptions
}

type BenchmarkResult = {
	name: string
	docs: number
	medianMs: number
	minMs: number
	maxMs: number
}

const hiddenDirectories = readPositiveInteger("AGENTS_BENCH_HIDDEN_DIRS", 250)
const filesPerHiddenDirectory = readPositiveInteger(
	"AGENTS_BENCH_FILES_PER_HIDDEN_DIR",
	8,
)
const visiblePackages = readPositiveInteger("AGENTS_BENCH_VISIBLE_PACKAGES", 25)
const iterations = readPositiveInteger("AGENTS_BENCH_ITERATIONS", 7)
const warmups = readPositiveInteger("AGENTS_BENCH_WARMUPS", 1)

const cases: BenchmarkCase[] = [
	{ name: "default" },
	{
		name: "include dot directories",
		options: { includeDotDirectories: true },
	},
]

const root = await mkdtemp(path.join(tmpdir(), "agents-yaml-bench-"))

try {
	await createFixture(root)
	const results: BenchmarkResult[] = []

	for (const benchmarkCase of cases) {
		for (let index = 0; index < warmups; index += 1) {
			await discoverAgentDocuments(root, benchmarkCase.options)
		}

		results.push(await runCase(root, benchmarkCase))
	}

	printResults(results)
} finally {
	await rm(root, { recursive: true, force: true })
}

async function createFixture(root: string): Promise<void> {
	await writeFile(
		path.join(root, "agents.yaml"),
		"version: 1\n\ndocuments: []\n",
		"utf8",
	)
	await writeFile(path.join(root, "AGENTS.md"), "# Root guidance\n", "utf8")

	await createDirectDependency(root)
	await createVisibleProjectDocuments(root)
	await createHiddenCache(root)
}

async function createDirectDependency(root: string): Promise<void> {
	const dependencyPath = path.join(root, "node_modules", "direct-lib")
	await mkdir(dependencyPath, { recursive: true })
	await writeFile(
		path.join(dependencyPath, "AGENTS.md"),
		"# Direct dependency guidance\n",
		"utf8",
	)
	await writeFile(
		path.join(dependencyPath, "package.json"),
		JSON.stringify({
			name: "direct-lib",
			description: "Direct fixture dependency.",
		}),
		"utf8",
	)
}

async function createVisibleProjectDocuments(root: string): Promise<void> {
	for (let index = 0; index < visiblePackages; index += 1) {
		const packagePath = path.join(root, "packages", `visible-${index}`)
		await mkdir(packagePath, { recursive: true })
		await writeFile(
			path.join(packagePath, "AGENTS.md"),
			"# Visible project guidance\n",
			"utf8",
		)
	}
}

async function createHiddenCache(root: string): Promise<void> {
	for (let index = 0; index < hiddenDirectories; index += 1) {
		const cachePath = path.join(root, ".cache", `entry-${index}`, "nested")
		await mkdir(cachePath, { recursive: true })
		await writeFile(
			path.join(cachePath, "AGENTS.md"),
			"# Hidden cache guidance\n",
			"utf8",
		)

		for (
			let fileIndex = 0;
			fileIndex < filesPerHiddenDirectory;
			fileIndex += 1
		) {
			await writeFile(
				path.join(cachePath, `file-${fileIndex}.txt`),
				"x".repeat(100),
				"utf8",
			)
		}
	}
}

async function runCase(
	root: string,
	benchmarkCase: BenchmarkCase,
): Promise<BenchmarkResult> {
	const durations: number[] = []
	let docs = 0

	for (let index = 0; index < iterations; index += 1) {
		const start = performance.now()
		const discovered = await discoverAgentDocuments(root, benchmarkCase.options)
		const duration = performance.now() - start

		docs = discovered.length
		durations.push(duration)
	}

	const sorted = [...durations].sort((left, right) => left - right)
	const medianMs = sorted[Math.floor(sorted.length / 2)]
	const minMs = sorted[0]
	const maxMs = sorted[sorted.length - 1]

	if (medianMs === undefined || minMs === undefined || maxMs === undefined) {
		throw new Error("Benchmark did not record any durations")
	}

	return {
		name: benchmarkCase.name,
		docs,
		medianMs,
		minMs,
		maxMs,
	}
}

function printResults(results: BenchmarkResult[]): void {
	console.log("agents discover benchmark")
	console.log(
		[
			`fixture: hiddenDirectories=${hiddenDirectories}`,
			`filesPerHiddenDirectory=${filesPerHiddenDirectory}`,
			`visiblePackages=${visiblePackages}`,
			`iterations=${iterations}`,
			`warmups=${warmups}`,
		].join(", "),
	)
	console.log("")
	console.log(
		[
			pad("case", 24),
			pad("docs", 8),
			pad("median", 10),
			pad("min", 10),
			pad("max", 10),
		].join(""),
	)
	console.log("-".repeat(62))

	for (const result of results) {
		console.log(
			[
				pad(result.name, 24),
				pad(String(result.docs), 8),
				pad(formatMs(result.medianMs), 10),
				pad(formatMs(result.minMs), 10),
				pad(formatMs(result.maxMs), 10),
			].join(""),
		)
	}

	const defaultResult = results.find((result) => result.name === "default")
	const includeDotResult = results.find(
		(result) => result.name === "include dot directories",
	)
	if (defaultResult && includeDotResult && defaultResult.medianMs > 0) {
		const ratio = includeDotResult.medianMs / defaultResult.medianMs
		console.log("")
		console.log(`include dot directories median: ${ratio.toFixed(1)}x default`)
	}
}

function readPositiveInteger(name: string, fallback: number): number {
	const raw = process.env[name]
	if (!raw) return fallback

	const value = Number.parseInt(raw, 10)
	if (Number.isInteger(value) && value > 0) return value

	throw new Error(`${name} must be a positive integer`)
}

function formatMs(value: number): string {
	return `${value.toFixed(1)}ms`
}

function pad(value: string, width: number): string {
	return value.padEnd(width, " ")
}
