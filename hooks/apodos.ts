// Apodos de fantasía para los aventureros, según su misión. Sin modelo: por
// palabras clave del encargo, siempre el mismo para el mismo encargo.

import type { GremioClass } from '../types'

const BY_WORD: Array<[RegExp, string]> = [
  [/(dise[ñn]|arquitect|planific|\bplan\b|design)/i, 'el Arquitecto'],
  [/(depur|debug|arregl|corr[ií]g|\bfix|\bbug|error|falla)/i, 'el Sanador'],
  [/(audit|segur|security|revis|review)/i, 'el Centinela'],
  [/(prueb|\btest|verific|comprueb|\bcheck|valid)/i, 'el Vigía'],
  [/(traduc|translat)/i, 'el Políglota'],
  [/(resum|summar|cr[oó]nica)/i, 'el Cronista'],
  [/(escrib|redact|\bwrite|document)/i, 'el Escriba'],
  [/(investig|research|analiz|estudi|compar)/i, 'el Erudito'],
  [/(refactor|limpi|orden|simplific)/i, 'el Pulidor'],
  [/(impl[eé]ment|constr[uú]y|\bbuild|cr[eé][aá]|gener)/i, 'el Artesano'],
  [/(\blist|enumer|cuenta|cont[aá]r|\bcount|inventari)/i, 'el Contador'],
  [/(busc|b[uú]squ|encuentr|localiz|\bfind|search|locate|d[oó]nde)/i, 'el Rastreador'],
]

const BY_CLASS: Record<GremioClass, string> = {
  maestro: 'el Grande',
  archimago: 'el Eterno',
  mago: 'el Sabio',
  bardo: 'el Viajero',
  picaro: 'el Sigiloso',
}

/** «el Rastreador», «el Sanador»…: lo primero que calce en la descripción y el comienzo del encargo. */
export function epithet(cls: GremioClass, description: string, prompt: string): string {
  const text = `${description}\n${prompt.slice(0, 240)}`
  for (const [re, name] of BY_WORD) if (re.test(text)) return name
  return BY_CLASS[cls]
}
