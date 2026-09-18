import { MultiSelectPrompt } from "@clack/core"
import * as clack from "@clack/prompts"
import { completionResponse, help } from "comline"
import { styleText } from "node:util"
import {
	addDocuments,
	initProject,
	loadAgentsFile,
	removeDocuments,
	validateAgentsFile,
} from "./agents-file.ts"
import { agents, earlyCommand, packageVersion } from "./cli.ts"
import { describeAgentDocument, discoverAgentDocuments } from "./discover.ts"
import { cwd, formatProjectPath, resolveFromRoot } from "./paths.ts"

type DocumentOption = {
	value: string
	label: string
	disabled?: boolean
}

export async function run(argv: string[]): Promise<void> {
	const completion = await completionResponse(agents.definition, argv)
	if (completion !== undefined) {
		process.stdout.write(completion)
		return
	}

	const early = earlyCommand(argv)
	if (early === "help") {
		console.log(help(agents.definition))
		return
	}
	if (early === "version") {
		console.log(packageVersion())
		return
	}

	const { inputs, warnings } = agents(argv)
	if (warnings.length > 0) {
		throw new Error(warnings.map((warning) => warning.message).join("\n"))
	}
	const root = cwd()

	switch (inputs.case) {
		case "":
			await interactive(root)
			return
		case "help":
			console.log(help(agents.definition))
			return
		case "version":
			console.log(packageVersion())
			return
		case "init":
			await commandInit(root, inputs.opts.force)
			return
		case "discover":
			await commandDiscover(root, {
				json: inputs.opts.json,
				includeDotDirectories: inputs.opts["include-dot-directories"],
			})
			return
		case "add/$...paths":
			await commandAdd(root, inputs.params.paths)
			return
		case "remove/$...paths":
			await commandRemove(root, inputs.params.paths)
			return
		case "validate":
			await commandValidate(root, inputs.opts.json)
			return
	}
}

async function commandInit(root: string, force: boolean): Promise<void> {
	clack.intro("agents init")
	const result = await initProject(root, { force })
	clack.note(result.messages.join("\n"), "Updated")
	clack.outro("Project breadcrumb is ready.")
}

async function commandDiscover(
	root: string,
	options: { json: boolean; includeDotDirectories: boolean },
): Promise<void> {
	const documents = await discoverAgentDocuments(root, {
		includeDotDirectories: options.includeDotDirectories,
	})
	if (options.json) {
		console.log(JSON.stringify(documents, null, 2))
		return
	}

	clack.intro("agents discover")
	if (documents.length === 0) {
		clack.outro("No supplemental AGENTS.md files found.")
		return
	}

	clack.note(formatDocumentList(documents), `Found ${documents.length}`)
	clack.outro("Use agents add <path> to enable one.")
}

async function commandAdd(root: string, paths: string[]): Promise<void> {
	if (paths.length === 0) {
		throw new Error("add requires at least one AGENTS.md path")
	}

	const documents = await Promise.all(
		paths.map((path) =>
			describeAgentDocument(
				root,
				formatProjectPath(root, resolveFromRoot(root, path)),
			),
		),
	)

	const file = await addDocuments(root, documents)
	clack.intro("agents add")
	clack.note(formatDocumentList(file.documents), "Promoted documents")
	clack.outro(
		`Added ${documents.length} document${documents.length === 1 ? "" : "s"}.`,
	)
}

function formatDocumentList(
	documents: { path: string; description?: string | undefined }[],
): string {
	return documents
		.map((doc) =>
			doc.description ? `${doc.path}\n  ${doc.description}` : doc.path,
		)
		.join("\n")
}

async function commandRemove(root: string, paths: string[]): Promise<void> {
	if (paths.length === 0) {
		throw new Error("remove requires at least one path")
	}

	const normalizedPaths = paths.map((path) =>
		formatProjectPath(root, resolveFromRoot(root, path)),
	)
	const result = await removeDocuments(root, normalizedPaths)
	clack.intro("agents remove")
	clack.note(
		result.removed.join("\n") || "No matching documents were listed.",
		"Removed",
	)
	clack.outro(
		`agents.yaml now has ${result.file.documents.length} promoted document${result.file.documents.length === 1 ? "" : "s"}.`,
	)
}

async function commandValidate(root: string, json: boolean): Promise<void> {
	const result = await validateAgentsFile(root)
	if (!result.ok) {
		process.exitCode = 1
	}
	if (json) {
		console.log(JSON.stringify(result, null, 2))
		return
	}

	clack.intro("agents validate")
	if (result.errors.length > 0) {
		clack.note(result.errors.join("\n"), "Errors")
	}
	if (result.warnings.length > 0) {
		clack.note(result.warnings.join("\n"), "Warnings")
	}

	clack.outro(
		result.ok ? "agents.yaml is valid." : "agents.yaml needs attention.",
	)
}

async function interactive(root: string): Promise<void> {
	clack.intro("agents")
	const action = await clack.select({
		message: "What would you like to do?",
		options: [
			{ value: "discover", label: "Discover and enable AGENTS.md files" },
			{ value: "validate", label: "Validate agents.yaml" },
			{ value: "init", label: "Initialize breadcrumb files" },
		],
	})

	if (clack.isCancel(action)) {
		clack.cancel("Cancelled.")
		return
	}

	if (action === "init") {
		await commandInit(root, false)
		return
	}

	if (action === "validate") {
		await commandValidate(root, false)
		return
	}

	const existing = await loadAgentsFile(root)
	const discovered = await discoverAgentDocuments(root)
	const candidates = discovered.filter(
		(doc) => !existing.documents.some((active) => active.path === doc.path),
	)

	if (candidates.length === 0) {
		clack.outro("No unlisted supplemental AGENTS.md files found.")
		return
	}

	const selected = await chooseDocumentsToEnable(
		candidates.map((doc) => ({ value: doc.path, label: doc.path })),
	)

	if (
		clack.isCancel(selected) ||
		selected === undefined ||
		selected.length === 0
	) {
		clack.cancel("No documents selected.")
		return
	}

	await commandAdd(root, selected)
}

async function chooseDocumentsToEnable(
	options: DocumentOption[],
): Promise<string[] | typeof clack.CANCEL_SYMBOL | undefined> {
	const selected = await new MultiSelectPrompt<DocumentOption>({
		options,
		required: false,
		render() {
			const prefix = `${styleText("cyan", clack.S_BAR)}  `
			const selected = this.value ?? []

			return `${styleText("gray", clack.S_BAR)}
${clack.symbol(this.state)}  Choose documents to enable
${prefix}${clack.limitOptions({
				options: this.options,
				cursor: this.cursor,
				columnPadding: prefix.length,
				style: (option, active) =>
					styleDocumentOption(option, {
						active,
						selected: selected.includes(option.value),
					}),
			}).join(`
${prefix}`)}
${styleText("cyan", clack.S_BAR_END)}
`
		},
	}).prompt()

	return typeof selected === "symbol" ? clack.CANCEL_SYMBOL : selected
}

function styleDocumentOption(
	option: DocumentOption,
	state: { active: boolean; selected: boolean },
): string {
	if (option.disabled) {
		return `${styleText("gray", clack.S_CHECKBOX_INACTIVE)} ${styleText(
			["strikethrough", "gray"],
			option.label,
		)}`
	}

	const checkbox = state.selected
		? styleText("green", clack.S_CHECKBOX_SELECTED)
		: state.active
			? styleText("cyan", clack.S_CHECKBOX_ACTIVE)
			: styleText("dim", clack.S_CHECKBOX_INACTIVE)
	const cursor = state.active ? styleText("cyan", ">") : " "
	const label = state.active ? option.label : styleText("dim", option.label)
	return `${cursor} ${checkbox} ${label}`
}
