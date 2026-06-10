import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { addDocuments, loadAgentsFile } from "./agents-file.ts"
import { discoverAgentDocuments } from "./discover.ts"

const tempRoots: string[] = []

describe("agents.yaml dependency discovery", () => {
	afterEach(async () => {
		await Promise.all(
			tempRoots
				.splice(0)
				.map((root) => rm(root, { recursive: true, force: true })),
		)
	})

	it("discovers a direct dependency with an AGENTS.md and adds it to agents.yaml", async () => {
		const root = await createTempProject()
		const dependencyAgentsPath = path.join(
			root,
			"node_modules",
			"direct-lib",
			"AGENTS.md",
		)
		await mkdir(path.dirname(dependencyAgentsPath), { recursive: true })
		await writeFile(
			dependencyAgentsPath,
			"# Direct dependency guidance\n",
			"utf8",
		)
		await writeFile(
			path.join(root, "node_modules", "direct-lib", "package.json"),
			JSON.stringify({
				name: "direct-lib",
				description: "Direct fixtures for testing agent guidance.",
			}),
			"utf8",
		)

		const discovered = await discoverAgentDocuments(root)
		expect(discovered).toEqual([
			{
				path: "./node_modules/direct-lib/AGENTS.md",
				description: "Direct fixtures for testing agent guidance.",
			},
		])

		await addDocuments(root, [discovered[0]!])

		await expect(loadAgentsFile(root)).resolves.toEqual({
			version: 1,
			documents: [
				{
					path: "./node_modules/direct-lib/AGENTS.md",
					description: "Direct fixtures for testing agent guidance.",
				},
			],
		})

		await addDocuments(root, [{ path: "./node_modules/direct-lib/AGENTS.md" }])
		await expect(loadAgentsFile(root)).resolves.toEqual({
			version: 1,
			documents: [
				{
					path: "./node_modules/direct-lib/AGENTS.md",
					description: "Direct fixtures for testing agent guidance.",
				},
			],
		})
	})

	it("does not discover an indirect dependency that has an AGENTS.md", async () => {
		const root = await createTempProject()
		const directAgentsPath = path.join(
			root,
			"node_modules",
			"direct-lib",
			"AGENTS.md",
		)
		const indirectAgentsPath = path.join(
			root,
			"node_modules",
			"direct-lib",
			"node_modules",
			"indirect-lib",
			"AGENTS.md",
		)

		await mkdir(path.dirname(directAgentsPath), { recursive: true })
		await mkdir(path.dirname(indirectAgentsPath), { recursive: true })
		await writeFile(directAgentsPath, "# Direct dependency guidance\n", "utf8")
		await writeFile(
			indirectAgentsPath,
			"# Indirect dependency guidance\n",
			"utf8",
		)

		await expect(discoverAgentDocuments(root)).resolves.toEqual([
			{ path: "./node_modules/direct-lib/AGENTS.md" },
		])
	})

	it("includes scoped package descriptions when present", async () => {
		const root = await createTempProject()
		const dependencyPath = path.join(
			root,
			"node_modules",
			"@scope",
			"direct-lib",
		)
		await mkdir(dependencyPath, { recursive: true })
		await writeFile(
			path.join(dependencyPath, "AGENTS.md"),
			"# Scoped guidance\n",
			"utf8",
		)
		await writeFile(
			path.join(dependencyPath, "package.json"),
			JSON.stringify({
				name: "@scope/direct-lib",
				description: "Scoped package guidance breadcrumbs.",
			}),
			"utf8",
		)

		await expect(discoverAgentDocuments(root)).resolves.toEqual([
			{
				path: "./node_modules/@scope/direct-lib/AGENTS.md",
				description: "Scoped package guidance breadcrumbs.",
			},
		])
	})

	it("skips dot-prefixed directories by default", async () => {
		const root = await createTempProject()
		const hiddenAgentsPath = path.join(root, ".cache", "AGENTS.md")
		await mkdir(path.dirname(hiddenAgentsPath), { recursive: true })
		await writeFile(hiddenAgentsPath, "# Hidden cache guidance\n", "utf8")

		await expect(discoverAgentDocuments(root)).resolves.toEqual([])
	})

	it("can include dot-prefixed directories when requested", async () => {
		const root = await createTempProject()
		const hiddenAgentsPath = path.join(root, ".cache", "AGENTS.md")
		await mkdir(path.dirname(hiddenAgentsPath), { recursive: true })
		await writeFile(hiddenAgentsPath, "# Hidden cache guidance\n", "utf8")

		await expect(
			discoverAgentDocuments(root, { includeDotDirectories: true }),
		).resolves.toEqual([{ path: "./.cache/AGENTS.md" }])
	})
})

async function createTempProject(): Promise<string> {
	const root = await mkdtemp(path.join(tmpdir(), "agents-yaml-"))
	tempRoots.push(root)

	await writeFile(
		path.join(root, "agents.yaml"),
		"version: 1\n\ndocuments: []\n",
		"utf8",
	)
	await writeFile(
		path.join(root, "AGENTS.md"),
		"Consult ./agents.yaml.\n",
		"utf8",
	)

	return root
}
