import * as clack from '@clack/prompts'
import {
  addDocuments,
  initProject,
  loadAgentsFile,
  removeDocuments,
  validateAgentsFile,
} from './agents-file.js'
import { discoverAgentDocuments } from './discover.js'
import { cwd, formatProjectPath, resolveFromRoot } from './paths.js'

type Command = 'add' | 'discover' | 'help' | 'init' | 'remove' | 'validate' | 'version'

type ParsedArgs = {
  command: Command | undefined
  values: string[]
  flags: Map<string, string | boolean>
}

const helpText = `agents

Usage:
  agents
  agents init [--force]
  agents discover [--json]
  agents add <path...> --reason <text>
  agents remove <path...>
  agents validate [--json]

agents.yaml is a curated table of contents for active external AGENTS.md guidance.`

export async function run(argv: string[]): Promise<void> {
  const parsed = parseArgs(argv)
  const root = cwd()

  switch (parsed.command) {
    case undefined:
      await interactive(root)
      return
    case 'help':
      console.log(helpText)
      return
    case 'version':
      console.log('0.1.0')
      return
    case 'init':
      await commandInit(root, parsed.flags.get('force') === true)
      return
    case 'discover':
      await commandDiscover(root, parsed.flags.get('json') === true)
      return
    case 'add':
      await commandAdd(root, parsed.values, readStringFlag(parsed.flags, 'reason'))
      return
    case 'remove':
      await commandRemove(root, parsed.values)
      return
    case 'validate':
      await commandValidate(root, parsed.flags.get('json') === true)
      return
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Map<string, string | boolean>()
  const values: string[] = []
  let command: Command | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (!arg) continue

    if (arg === '--help' || arg === '-h') {
      command = 'help'
      continue
    }

    if (arg === '--version' || arg === '-v') {
      command = 'version'
      continue
    }

    if (arg.startsWith('--')) {
      const [rawName, inlineValue] = arg.slice(2).split('=', 2)
      if (!rawName) continue
      if (inlineValue !== undefined) {
        flags.set(rawName, inlineValue)
        continue
      }

      const next = argv[index + 1]
      if (next && !next.startsWith('-') && rawName === 'reason') {
        flags.set(rawName, next)
        index += 1
        continue
      }

      flags.set(rawName, true)
      continue
    }

    if (!command && isCommand(arg)) {
      command = arg
      continue
    }

    values.push(arg)
  }

  return { command, values, flags }
}

function isCommand(value: string): value is Command {
  return ['add', 'discover', 'help', 'init', 'remove', 'validate', 'version'].includes(value)
}

function readStringFlag(flags: Map<string, string | boolean>, name: string): string | undefined {
  const value = flags.get(name)
  return typeof value === 'string' ? value : undefined
}

async function commandInit(root: string, force: boolean): Promise<void> {
  clack.intro('agents init')
  const result = await initProject(root, { force })
  clack.note(result.messages.join('\n'), 'Updated')
  clack.outro('Project breadcrumb is ready.')
}

async function commandDiscover(root: string, json: boolean): Promise<void> {
  const documents = await discoverAgentDocuments(root)
  if (json) {
    console.log(JSON.stringify(documents, null, 2))
    return
  }

  clack.intro('agents discover')
  if (documents.length === 0) {
    clack.outro('No supplemental AGENTS.md files found.')
    return
  }

  clack.note(documents.map((doc) => doc.path).join('\n'), `Found ${documents.length}`)
  clack.outro('Use agents add <path> --reason <text> to enable one.')
}

async function commandAdd(root: string, paths: string[], reason?: string): Promise<void> {
  if (paths.length === 0) {
    throw new Error('add requires at least one AGENTS.md path')
  }

  const finalReason = reason ?? 'Relevant project or dependency guidance'
  const documents = paths.map((path) => ({
    path: formatProjectPath(root, resolveFromRoot(root, path)),
    reason: finalReason,
  }))

  const file = await addDocuments(root, documents)
  clack.intro('agents add')
  clack.note(
    file.documents.map((doc) => `${doc.path} - ${doc.reason}`).join('\n'),
    'Active documents',
  )
  clack.outro(`Added ${documents.length} document${documents.length === 1 ? '' : 's'}.`)
}

async function commandRemove(root: string, paths: string[]): Promise<void> {
  if (paths.length === 0) {
    throw new Error('remove requires at least one path')
  }

  const normalizedPaths = paths.map((path) => formatProjectPath(root, resolveFromRoot(root, path)))
  const result = await removeDocuments(root, normalizedPaths)
  clack.intro('agents remove')
  clack.note(result.removed.join('\n') || 'No matching documents were active.', 'Removed')
  clack.outro(
    `agents.yaml now has ${result.file.documents.length} active document${result.file.documents.length === 1 ? '' : 's'}.`,
  )
}

async function commandValidate(root: string, json: boolean): Promise<void> {
  const result = await validateAgentsFile(root)
  if (json) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  clack.intro('agents validate')
  if (result.errors.length > 0) {
    clack.note(result.errors.join('\n'), 'Errors')
  }
  if (result.warnings.length > 0) {
    clack.note(result.warnings.join('\n'), 'Warnings')
  }

  clack.outro(result.ok ? 'agents.yaml is valid.' : 'agents.yaml needs attention.')
  if (!result.ok) {
    process.exitCode = 1
  }
}

async function interactive(root: string): Promise<void> {
  clack.intro('agents')
  const action = await clack.select({
    message: 'What would you like to do?',
    options: [
      { value: 'discover', label: 'Discover and enable AGENTS.md files' },
      { value: 'validate', label: 'Validate agents.yaml' },
      { value: 'init', label: 'Initialize breadcrumb files' },
    ],
  })

  if (clack.isCancel(action)) {
    clack.cancel('Cancelled.')
    return
  }

  if (action === 'init') {
    await commandInit(root, false)
    return
  }

  if (action === 'validate') {
    await commandValidate(root, false)
    return
  }

  const existing = await loadAgentsFile(root)
  const discovered = await discoverAgentDocuments(root)
  const candidates = discovered.filter(
    (doc) => !existing.documents.some((active) => active.path === doc.path),
  )

  if (candidates.length === 0) {
    clack.outro('No inactive supplemental AGENTS.md files found.')
    return
  }

  const selected = await clack.multiselect({
    message: 'Choose documents to enable',
    options: candidates.map((doc) => ({ value: doc.path, label: doc.path })),
    required: false,
  })

  if (clack.isCancel(selected) || selected.length === 0) {
    clack.cancel('No documents selected.')
    return
  }

  const reason = await clack.text({
    message: 'Reason to record for these documents',
    placeholder: 'Dependency-specific guidance',
  })

  if (clack.isCancel(reason)) {
    clack.cancel('Cancelled.')
    return
  }

  await commandAdd(root, selected, String(reason || 'Dependency-specific guidance'))
}
