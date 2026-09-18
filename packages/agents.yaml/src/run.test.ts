import * as clack from "@clack/prompts"
import { spawnSync } from "node:child_process"
import {
	mkdir,
	mkdtemp,
	readFile,
	readdir,
	rm,
	writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { loadAgentsFile, saveAgentsFile } from "./agents-file.ts"
import { agents } from "./cli.ts"
import { run } from "./run.ts"

vi.mock("@clack/prompts", async (importOriginal) => ({
	...(await importOriginal<typeof import("@clack/prompts")>()),
	intro: vi.fn(),
	select: vi.fn(),
	cancel: vi.fn(),
}))

const entry = fileURLToPath(new URL("./index.ts", import.meta.url))
let root: string

beforeEach(async () => {
	root = await mkdtemp(path.join(tmpdir(), "agents-cli-"))
})

afterEach(async () => {
	vi.clearAllMocks()
	await rm(root, { recursive: true, force: true })
})

function invoke(...args: string[]) {
	const result = spawnSync(process.execPath, [entry, ...args], {
		cwd: root,
		encoding: "utf8",
		env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: undefined },
		timeout: 10_000,
	})
	if (result.error) throw result.error
	return result
}

describe("agents command-line interface", () => {
	it("keeps the no-command interactive flow and cancellation", async () => {
		vi.mocked(clack.select).mockResolvedValueOnce(clack.CANCEL_SYMBOL)
		await run([process.execPath, entry])
		expect(clack.select).toHaveBeenCalledWith(
			expect.objectContaining({ message: "What would you like to do?" }),
		)
		expect(clack.cancel).toHaveBeenCalledWith("Cancelled.")
	})

	it("adds and removes multiple paths without splitting special characters", async () => {
		const paths = ["./space name/AGENTS.md", "./comma,equals=/AGENTS.md"]
		for (const document of paths) {
			await mkdir(path.dirname(path.join(root, document)), { recursive: true })
			await writeFile(path.join(root, document), "# Instructions\n")
		}

		expect(invoke("init").status).toBe(0)
		expect(invoke("add", ...paths).status).toBe(0)
		const added = await loadAgentsFile(root)
		expect(added.documents.map((document) => document.path).sort()).toEqual(
			paths.toSorted(),
		)
		expect(invoke("remove", ...paths).status).toBe(0)
		expect((await loadAgentsFile(root)).documents).toEqual([])
	})

	it("treats help and version spellings after -- as literal paths", async () => {
		const paths = ["--help", "-v", "-dash/AGENTS.md"]
		expect(invoke("add", "--", ...paths).status).toBe(0)
		expect(
			(await loadAgentsFile(root)).documents
				.map((document) => document.path)
				.sort(),
		).toEqual(paths.map((document) => `./${document}`).sort())
		expect(invoke("remove", "--", ...paths).status).toBe(0)
		expect((await loadAgentsFile(root)).documents).toEqual([])
	})

	it.each([
		["add"],
		["remove"],
		["discovr"],
		["--unknown"],
		["init", "--json"],
		["init", "--force=maybe"],
		["add", "./AGENTS.md", "--typo"],
		["validate", "--json", "--force"],
	])(
		"rejects invalid usage without executing a command: %j",
		async (...args) => {
			const result = invoke(...args)
			expect(result.status).toBe(1)
			expect(result.stdout).toBe("")
			expect(result.stderr).toContain("agents:")
			expect(await readdir(root)).toEqual([])
		},
	)

	it.each([
		["help"],
		["--help"],
		["-h"],
		["add", "--help"],
		["remove", "-h"],
		["add", "-vh"],
	])("shows generated help without requiring paths: %j", async (...args) => {
		// Help must work even in a project with an invalid document index.
		await writeFile(path.join(root, "agents.yaml"), "not: [valid yaml")
		const result = invoke(...args)
		expect(result.status).toBe(0)
		expect(result.stderr).toBe("")
		expect(result.stdout).toContain("add <paths...>")
		expect(result.stdout).toContain("remove <paths...>")
		expect(result.stdout).toContain("--include-dot-directories")
	})

	it.each([["version"], ["--version"], ["-v"], ["add", "--version"]])(
		"prints the package version: %j",
		async (...args) => {
			const manifest = JSON.parse(
				await readFile(new URL("../package.json", import.meta.url), "utf8"),
			) as { version: string }
			const result = invoke(...args)
			expect(result.status).toBe(0)
			expect(result.stderr).toBe("")
			expect(result.stdout).toBe(`${manifest.version}\n`)
		},
	)

	it("honors explicit booleans and the last repeated switch", async () => {
		expect(invoke("init").status).toBe(0)
		const breadcrumb = await readFile(path.join(root, "AGENTS.md"), "utf8")
		expect(
			invoke("init", "--force", "--force=false", "--force=false").status,
		).toBe(0)
		expect(await readFile(path.join(root, "AGENTS.md"), "utf8")).toBe(
			breadcrumb,
		)
		expect(invoke("init", "--force=false", "--force").status).toBe(0)
		expect(
			(await readFile(path.join(root, "AGENTS.md"), "utf8")).match(/Consult/g),
		).toHaveLength(2)
	})

	it("discovers hidden directories on request and keeps JSON output clean", async () => {
		await mkdir(path.join(root, ".hidden"))
		await writeFile(
			path.join(root, ".hidden", "AGENTS.md"),
			"# Hidden instructions\n",
		)
		const ordinary = invoke("discover", "--json")
		expect(ordinary.status).toBe(0)
		expect(JSON.parse(ordinary.stdout)).toEqual([])
		const hidden = invoke("--json", "discover", "--include-dot-directories")
		expect(hidden.status).toBe(0)
		expect(hidden.stderr).toBe("")
		expect(JSON.parse(hidden.stdout)).toEqual([{ path: "./.hidden/AGENTS.md" }])
	})

	it("sets the validation exit status in both text and JSON modes", async () => {
		expect(invoke("init").status).toBe(0)
		const valid = invoke("validate", "--json")
		expect(valid.status).toBe(0)
		expect(JSON.parse(valid.stdout)).toMatchObject({ ok: true, errors: [] })
		await saveAgentsFile(root, {
			version: 1,
			documents: [{ path: "./missing/AGENTS.md" }],
		})
		const invalid = invoke("validate", "--json")
		expect(invalid.status).toBe(1)
		expect(invalid.stderr).toBe("")
		expect(JSON.parse(invalid.stdout)).toMatchObject({
			ok: false,
			errors: [expect.stringContaining("file does not exist")],
		})
		expect(invoke("validate").status).toBe(1)
	})

	it("generates completion scripts without loading the document index or changing files", async () => {
		await writeFile(path.join(root, "agents.yaml"), "not: [valid yaml")
		const result = invoke("completion", "bash")
		expect(result.status).toBe(0)
		expect(result.stderr).toBe("")
		expect(result.stdout).toContain("_comline")
		expect(result.stdout).not.toContain("What would you like to do?")
		expect(await readdir(root)).toEqual(["agents.yaml"])
		expect(await readFile(path.join(root, "agents.yaml"), "utf8")).toBe(
			"not: [valid yaml",
		)
	})

	it("completes listed paths after each remove argument without removing documents", async () => {
		const file = {
			version: 1 as const,
			documents: [
				{ path: "./one/AGENTS.md" },
				{ path: "./two/AGENTS.md", description: "Second document" },
			],
		}
		await saveAgentsFile(root, file)
		const result = invoke("__complete", "remove", "./one/AGENTS.md", "./t")
		expect(result.status).toBe(0)
		expect(result.stderr).toBe("")
		expect(result.stdout).toContain("./two/AGENTS.md\tSecond document")
		expect(await loadAgentsFile(root)).toEqual(file)
	})

	it("offers filesystem completion for every add argument", async () => {
		for (const words of [
			["add", ""],
			["add", "./one/AGENTS.md", ""],
		]) {
			const result = await agents.complete({ words })
			expect(result.fileSystem).toBe("files")
		}
	})
})
