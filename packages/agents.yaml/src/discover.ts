import { access, opendir } from 'node:fs/promises'
import path from 'node:path'
import { formatProjectPath } from './paths.ts'

export type DiscoveredDocument = {
  path: string
}

const skippedDirectories = new Set([
  '.git',
  '.hg',
  '.svn',
  '.turbo',
  '.next',
  'coverage',
  'dist',
  'build',
])

export async function discoverAgentDocuments(root: string): Promise<DiscoveredDocument[]> {
  const found: DiscoveredDocument[] = []
  await walk(root, root, found)
  return found
    .filter((document) => document.path !== './AGENTS.md')
    .sort((left, right) => left.path.localeCompare(right.path))
}

async function walk(root: string, directory: string, found: DiscoveredDocument[]): Promise<void> {
  let handle
  try {
    handle = await opendir(directory)
  } catch {
    return
  }

  for await (const entry of handle) {
    const absolutePath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') {
        await scanDirectNodeModules(root, absolutePath, found)
        continue
      }

      if (!skippedDirectories.has(entry.name)) {
        await walk(root, absolutePath, found)
      }
      continue
    }

    if (entry.isFile() && entry.name === 'AGENTS.md') {
      found.push({ path: formatProjectPath(root, absolutePath) })
    }
  }
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
    if ((!entry.isDirectory() && !entry.isSymbolicLink()) || entry.name.startsWith('.')) {
      continue
    }

    const packagePath = path.join(nodeModulesPath, entry.name)
    if (entry.name.startsWith('@')) {
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
      await addPackageAgentsDocument(root, path.join(scopePath, entry.name), found)
    }
  }
}

async function addPackageAgentsDocument(
  root: string,
  packagePath: string,
  found: DiscoveredDocument[],
): Promise<void> {
  const agentsPath = path.join(packagePath, 'AGENTS.md')
  try {
    await access(agentsPath)
    found.push({ path: formatProjectPath(root, agentsPath) })
  } catch {
    // Packages without AGENTS.md are simply not candidates.
  }
}
