// El plugin se llamaba «gremio»; desde la v0.21 se llama «guild» y Claude Code le
// da un almacén nuevo. La primera vez se traen el libro, la experiencia y los
// ajustes del almacén viejo, para que nadie pierda su historia.

/** Los almacenes viejos dentro de la carpeta de almacenes de Claude Code. */
export const OLD_STORE = /^gremio_.*\.json$/

/** Las claves que no se traen: los latidos del reino se rehacen solos. */
function isTransient(key: string): boolean {
  return key.startsWith('reino.')
}

/** Cuántas misiones cuenta un almacén (para elegir el que tiene más historia). */
function missionsOf(store: Record<string, unknown>): number {
  const book = store.libro as { missions?: unknown } | undefined
  return typeof book?.missions === 'number' ? book.missions : 0
}

/** Lo que se trae: del almacén viejo con más misiones, todo salvo lo pasajero. */
export function pickImport(stores: ReadonlyArray<unknown>): Record<string, unknown> {
  const valid = stores.filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null && !Array.isArray(s))
  const best = [...valid].sort((a, b) => missionsOf(b) - missionsOf(a))[0]
  if (!best) return {}
  return Object.fromEntries(Object.entries(best).filter(([k]) => !isTransient(k)))
}
