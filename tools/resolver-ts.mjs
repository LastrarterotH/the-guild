// Deja que node importe './i18n' como './i18n.ts' (los módulos del mod van sin extensión).
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if (/^\.\.?\//.test(specifier) && !/\.[a-z]+$/.test(specifier) && context.parentURL) {
    const url = new URL(specifier, context.parentURL)
    if (!existsSync(fileURLToPath(url)) && existsSync(fileURLToPath(url) + '.ts')) return nextResolve(specifier + '.ts', context)
  }
  return nextResolve(specifier, context)
}
