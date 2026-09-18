import {
	cli,
	interpretArguments,
	optional,
	options,
	parseBooleanOption,
	required,
	type CliOption,
} from "comline"
import { readFileSync } from "node:fs"
import { z } from "zod"
import { loadAgentsFile } from "./agents-file.ts"
import { cwd } from "./paths.ts"

function parseBooleanSwitch(value: string): boolean {
	// Comline joins repeated occurrences with commas. The last switch wins.
	const last = value.split(",").at(-1) ?? ""
	if (!["", "true", "false", "0", "1"].includes(last)) {
		throw new Error(
			`Expected a boolean switch, received ${JSON.stringify(last)}`,
		)
	}
	return parseBooleanOption(last)
}

function booleanSwitch(
	description: string,
	example: string,
): CliOption<boolean> {
	return { description, example, parse: parseBooleanSwitch, required: false }
}

const commonSchema = z.object({
	help: z.boolean().default(false),
	version: z.boolean().default(false),
})

const commonOptions = {
	help: {
		...booleanSwitch("Show usage", "--help"),
		flag: "h",
	},
	version: {
		...booleanSwitch("Show the installed version", "--version"),
		flag: "v",
	},
} satisfies Record<string, CliOption<boolean>>

const jsonOption = booleanSwitch("Print JSON", "--json")

function common(description: string) {
	return options(description, commonSchema, commonOptions)
}

export const agents = cli({
	cliName: "agents",
	cliDescription:
		"Discover and curate agent-readable documentation in agents.yaml.",
	routes: optional({
		init: null,
		discover: null,
		add: required({ "$...paths": null }),
		remove: required({ "$...paths": null }),
		validate: null,
		help: null,
		version: null,
	}),
	routeOptions: {
		"": common("Choose an action interactively"),
		init: options(
			"Initialize breadcrumb files",
			commonSchema.extend({ force: z.boolean().default(false) }),
			{
				...commonOptions,
				force: booleanSwitch(
					"Append the breadcrumb even if already mentioned",
					"--force",
				),
			},
		),
		discover: options(
			"Discover supplemental AGENTS.md files",
			commonSchema.extend({
				json: z.boolean().default(false),
				"include-dot-directories": z.boolean().default(false),
			}),
			{
				...commonOptions,
				json: jsonOption,
				"include-dot-directories": booleanSwitch(
					"Search hidden directories",
					"--include-dot-directories",
				),
			},
		),
		"add/$...paths": common("Promote one or more AGENTS.md files"),
		"remove/$...paths": common("Remove one or more promoted paths"),
		validate: options(
			"Validate agents.yaml",
			commonSchema.extend({ json: z.boolean().default(false) }),
			{ ...commonOptions, json: jsonOption },
		),
		help: common("Show usage"),
		version: common("Show the installed version"),
	},
	positionalCompletions: {
		"add/$...paths": { fileSystem: "files" },
		"remove/$...paths": {
			provide: async () => {
				const { documents } = await loadAgentsFile(cwd())
				return documents.map(({ path, description }) => ({
					value: path,
					...(description ? { description } : {}),
				}))
			},
		},
	},
})

export function earlyCommand(argv: string[]): "help" | "version" | undefined {
	// Interpret before validation so `add --help` does not require a path.
	// Using Comline's occurrences also respects grouped flags and literal `--`.
	const { options: occurrences } = interpretArguments(
		agents.definition,
		argv.slice(2),
	)
	for (const key of ["help", "version"] as const) {
		const occurrence = occurrences.findLast((option) => option.key === key)
		if (occurrence && parseBooleanSwitch(occurrence.value)) return key
	}
	return undefined
}

export function packageVersion(): string {
	const source = readFileSync(
		new URL("../package.json", import.meta.url),
		"utf8",
	)
	return z.object({ version: z.string() }).parse(JSON.parse(source)).version
}
