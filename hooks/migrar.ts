// El plugin se llamó «gremio» hasta la v0.20 y «guild» hasta la v0.27; desde la
// v0.28 se llama «operator» y Claude Code le da un almacén nuevo. La primera vez
// se traen el libro, la experiencia y los ajustes del almacén viejo con más
// historia (primero «guild», que ya traía lo de «gremio»), para que nadie pierda
// lo acumulado.

/** Los almacenes viejos dentro de la carpeta de almacenes de Claude Code, del más nuevo al más viejo. */
export const OLD_STORES = ['guild', 'gremio'] as const

/** Si un archivo es un almacén viejo («guild_….json» o «gremio_….json»). */
export const OLD_STORE = /^(guild|gremio)_.*\.json$/

/** Las claves que no se traen: los latidos de la Red se rehacen solos. */
function isTransient(key: string): boolean {
  return key.startsWith('reino.')
}

/** Cuántas conexiones cuenta un almacén (para elegir el que tiene más historia). */
function missionsOf(store: Record<string, unknown>): number {
  const book = store.libro as { missions?: unknown } | undefined
  return typeof book?.missions === 'number' ? book.missions : 0
}

/** Lo que se trae: del almacén viejo con más conexiones (a igualdad, el primero), todo salvo lo pasajero. */
export function pickImport(stores: ReadonlyArray<unknown>): Record<string, unknown> {
  const valid = stores.filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && !Array.isArray(s))
  const best = [...valid].sort((a, b) => missionsOf(b) - missionsOf(a))[0]
  if (!best) return {}
  return Object.fromEntries(Object.entries(best).filter(([k]) => !isTransient(k)))
}
