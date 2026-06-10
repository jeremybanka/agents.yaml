import { access, opendir, readFile } from "node:fs/promises"
import path from "node:path"
import { formatProjectPath, resolveFromRoot } from "./paths.ts"

export type DiscoveredDocument = {
	path: string
	description?: string
}

export type DiscoverOptions = {
	includeDotDirectories?: boolean
}

const skippedDirectories = new Set([
	".git",
	".hg",
	".svn",
	".turbo",
	".next",
	"coverage",
	"dist",
	"build",
])

export async function discoverAgentDocuments(
	root: string,
	options: DiscoverOptions = {},
): Promise<DiscoveredDocument[]> {
	const found: DiscoveredDocument[] = []
	await walk(root, root, found, options)
	return found
		.filter((document) => document.path !== "./AGENTS.md")
		.sort((left, right) => left.path.localeCompare(right.path))
}

export async function describeAgentDocument(
	root: string,
	agentsDocumentPath: string,
): Promise<DiscoveredDocument> {
	const absolutePath = resolveFromRoot(root, agentsDocumentPath)
	return documentEntry(
		root,
		absolutePath,
		await readPackageDescription(path.dirname(absolutePath)),
	)
}

async function walk(
	root: string,
	directory: string,
	found: DiscoveredDocument[],
	options: DiscoverOptions,
): Promise<void> {
	let handle
	try {
		handle = await opendir(directory)
	} catch {
		return
	}

	for await (const entry of handle) {
		const absolutePath = path.join(directory, entry.name)

		if (entry.isDirectory()) {
			if (entry.name === "node_modules") {
				await scanDirectNodeModules(root, absolutePath, found)
				continue
			}

			if (!shouldSkipDirectory(entry.name, options)) {
				await walk(root, absolutePath, found, options)
			}
			continue
		}

		if (entry.isFile() && entry.name === "AGENTS.md") {
			found.push(
				await documentEntry(
					root,
					absolutePath,
					await readPackageDescription(path.dirname(absolutePath)),
				),
			)
		}
	}
}

function shouldSkipDirectory(name: string, options: DiscoverOptions): boolean {
	if (skippedDirectories.has(name)) return true
	return !options.includeDotDirectories && name.startsWith(".")
}

async function scanDirectNodeModules(
	root: string,
	nodeModulesPath: string,
	found: DiscoveredDocument[],
): Promise<void> {
	let handle
	try {
		handle = await opendir(nodeModulesPath)
	} catch {
		return
	}

	for await (const entry of handle) {
		if (
			(!entry.isDirectory() && !entry.isSymbolicLink()) ||
			entry.name.startsWith(".")
		) {
			continue
		}

		const packagePath = path.join(nodeModulesPath, entry.name)
		if (entry.name.startsWith("@")) {
			await scanScopedPackages(root, packagePath, found)
			continue
		}

		await addPackageAgentsDocument(root, packagePath, found)
	}
}

async function scanScopedPackages(
	root: string,
	scopePath: string,
	found: DiscoveredDocument[],
): Promise<void> {
	let handle
	try {
		handle = await opendir(scopePath)
	} catch {
		return
	}

	for await (const entry of handle) {
		if (entry.isDirectory() || entry.isSymbolicLink()) {
			await addPackageAgentsDocument(
				root,
				path.join(scopePath, entry.name),
				found,
			)
		}
	}
}

async function addPackageAgentsDocument(
	root: string,
	packagePath: string,
	found: DiscoveredDocument[],
): Promise<void> {
	const agentsPath = path.join(packagePath, "AGENTS.md")
	try {
		await access(agentsPath)
		found.push(
			await documentEntry(
				root,
				agentsPath,
				await readPackageDescription(packagePath),
			),
		)
	} catch {
		// Packages without AGENTS.md are simply not candidates.
	}
}

async function documentEntry(
	root: string,
	agentsPath: string,
	description: string | undefined,
): Promise<DiscoveredDocument> {
	return {
		path: formatProjectPath(root, agentsPath),
		...(description ? { description } : {}),
	}
}

async function readPackageDescription(
	packagePath: string,
): Promise<string | undefined> {
	try {
		const source = await readFile(
			path.join(packagePath, "package.json"),
			"utf8",
		)
		const parsed = JSON.parse(source) as unknown
		if (!isPackageJson(parsed) || typeof parsed.description !== "string")
			return undefined

		const description = parsed.description.trim()
		return description && description.length > 0 ? description : undefined
	} catch {
		return undefined
	}
}

function isPackageJson(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null
}
