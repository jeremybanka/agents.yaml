import { access, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import * as YAML from 'yaml'
import { z } from 'zod'
import { resolveFromRoot } from './paths.ts'

export type AgentsDocumentEntry = {
  path: string
  description?: string | undefined
}

export type AgentsFile = {
  version: 1
  documents: AgentsDocumentEntry[]
}

export type ValidationResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
}

const fileSchema = z.object({
  version: z.literal(1),
  documents: z.array(
    z.object({
      path: z.string().min(1),
      description: z.string().min(1).optional(),
    }),
  ),
})

const breadcrumb = `For dependency-specific and supplemental guidance, consult \`./agents.yaml\`.

Only the documents listed there should be considered active external guidance for this project.`

export async function loadAgentsFile(root: string): Promise<AgentsFile> {
  const filePath = agentsPath(root)

  try {
    const source = await readFile(filePath, 'utf8')
    const parsed = YAML.parse(source) as unknown
    return fileSchema.parse(parsed)
  } catch (error) {
    if (isNotFound(error)) {
      return { version: 1, documents: [] }
    }

    if (error instanceof z.ZodError) {
      throw new Error(
        `Invalid agents.yaml: ${error.issues.map((issue) => issue.message).join(', ')}`,
      )
    }

    throw error
  }
}

export async function saveAgentsFile(root: string, file: AgentsFile): Promise<void> {
  const normalized = {
    version: file.version,
    documents: file.documents.map((doc) => ({
      path: doc.path,
      ...(doc.description ? { description: doc.description } : {}),
    })),
  }

  await writeFile(agentsPath(root), YAML.stringify(normalized, { lineWidth: 0 }), 'utf8')
}

export async function addDocuments(
  root: string,
  documents: AgentsDocumentEntry[],
): Promise<AgentsFile> {
  const file = await loadAgentsFile(root)
  const byPath = new Map(file.documents.map((doc) => [doc.path, doc]))

  for (const document of documents) {
    const existing = byPath.get(document.path)
    byPath.set(document.path, {
      path: document.path,
      ...(existing?.description ? { description: existing.description } : {}),
      ...(document.description ? { description: document.description } : {}),
    })
  }

  const next = {
    version: 1 as const,
    documents: [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path)),
  }

  await saveAgentsFile(root, next)
  return next
}

export async function removeDocuments(
  root: string,
  paths: string[],
): Promise<{ file: AgentsFile; removed: string[] }> {
  const file = await loadAgentsFile(root)
  const pathSet = new Set(paths)
  const removed: string[] = []
  const documents = file.documents.filter((doc) => {
    if (pathSet.has(doc.path)) {
      removed.push(doc.path)
      return false
    }

    return true
  })

  const next = { version: 1 as const, documents }
  await saveAgentsFile(root, next)
  return { file: next, removed }
}

export async function validateAgentsFile(root: string): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  let file: AgentsFile

  try {
    file = await loadAgentsFile(root)
  } catch (error) {
    return {
      ok: false,
      errors: [error instanceof Error ? error.message : String(error)],
      warnings,
    }
  }

  const seen = new Set<string>()
  for (const [index, document] of file.documents.entries()) {
    const label = `documents[${index}] ${document.path}`

    if (seen.has(document.path)) {
      errors.push(`${label}: duplicate path`)
    }
    seen.add(document.path)

    if (path.basename(document.path) !== 'AGENTS.md') {
      warnings.push(`${label}: path does not end with AGENTS.md`)
    }

    try {
      await access(resolveFromRoot(root, document.path))
    } catch {
      errors.push(`${label}: file does not exist`)
    }
  }

  try {
    const source = await readFile(path.join(root, 'AGENTS.md'), 'utf8')
    if (!source.includes('./agents.yaml') && !source.includes('agents.yaml')) {
      warnings.push('AGENTS.md does not mention agents.yaml')
    }
  } catch {
    warnings.push('AGENTS.md is missing the agents.yaml breadcrumb')
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
  }
}

export async function initProject(
  root: string,
  options: { force: boolean },
): Promise<{ messages: string[] }> {
  const messages: string[] = []

  try {
    await access(agentsPath(root))
    messages.push('agents.yaml already exists')
  } catch {
    await saveAgentsFile(root, { version: 1, documents: [] })
    messages.push('created agents.yaml')
  }

  const projectAgentsPath = path.join(root, 'AGENTS.md')
  try {
    const source = await readFile(projectAgentsPath, 'utf8')
    if (source.includes('agents.yaml') && !options.force) {
      messages.push('AGENTS.md already mentions agents.yaml')
      return { messages }
    }

    const next =
      source.trimEnd().length === 0
        ? `# Project Instructions\n\n${breadcrumb}\n`
        : `${source.trimEnd()}\n\n${breadcrumb}\n`
    await writeFile(projectAgentsPath, next, 'utf8')
    messages.push('updated AGENTS.md')
  } catch (error) {
    if (!isNotFound(error)) throw error
    await writeFile(projectAgentsPath, `# Project Instructions\n\n${breadcrumb}\n`, 'utf8')
    messages.push('created AGENTS.md')
  }

  return { messages }
}

function agentsPath(root: string): string {
  return path.join(root, 'agents.yaml')
}

function isNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
