import path from 'node:path'

export function cwd(): string {
  return process.cwd()
}

export function resolveFromRoot(root: string, input: string): string {
  return path.isAbsolute(input) ? path.normalize(input) : path.resolve(root, input)
}

export function formatProjectPath(root: string, target: string): string {
  const relative = path.relative(root, target).split(path.sep).join(path.posix.sep)
  if (relative.startsWith('..')) {
    return target
  }

  return relative.startsWith('.') ? relative : `./${relative}`
}
