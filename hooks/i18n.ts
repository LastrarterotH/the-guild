// El gremio habla español e inglés. Todo texto que lee una persona o el modelo
// pasa por tr(es, en). El idioma se elige una vez por sesión (langFrom) y se
// cambia con `/guild language`.

export type Lang = 'es' | 'en'

// Español hasta que la sesión diga otra cosa (así las pruebas leen los textos originales).
let current: Lang = 'es'

/** El idioma en que habla el gremio ahora. */
export function lang(): Lang {
  return current
}

/** Cambia el idioma de esta sesión. */
export function setLang(next: Lang): void {
  current = next
}

/** El texto en el idioma actual: tr('Gremio abierto.', 'Guild opened.'). */
export function tr(es: string, en: string): string {
  return current === 'en' ? en : es
}

/** Si un nombre de idioma o un locale es español («Español», "Spanish", "es-CL", "es_ES.UTF-8"). */
function isSpanish(text: string): boolean {
  return /^\s*(es\b|es[-_]|espa|spanish|castellano)/i.test(text)
}

/**
 * El idioma de una sesión: primero el ajuste `language` de Claude Code, luego el
 * locale del sistema (LC_ALL / LC_MESSAGES / LANG) y, si nada dice, inglés.
 */
export function langFrom(setting: string | null | undefined, locales: ReadonlyArray<string | null | undefined> = []): Lang {
  const chosen = setting?.trim()
  if (chosen) return isSpanish(chosen) ? 'es' : 'en'
  for (const locale of locales) {
    if (!locale || /^(C|POSIX)(\.|$)/i.test(locale)) continue
    return isSpanish(locale) ? 'es' : 'en'
  }
  return 'en'
}

/** Lo que pide `/guild language <x>`: un idioma, 'auto' para seguir a Claude Code, o null si no se entiende. */
export function langChoice(text: string): Lang | 'auto' | null {
  const t = text.trim().toLowerCase()
  if (/^(auto|automático|automatico)$/.test(t)) return 'auto'
  if (/^(en|english|inglés|ingles)$/.test(t)) return 'en'
  if (/^(es|español|espanol|spanish|castellano)$/.test(t)) return 'es'
  return null
}
