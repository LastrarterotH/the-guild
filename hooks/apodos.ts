// Apodos de fantasía para los aventureros, según su misión. Sin modelo: por
// palabras clave del encargo, siempre el mismo para el mismo encargo.

import type { GremioClass } from '../types'
import { tr } from './i18n'

const BY_WORD: Array<[RegExp, () => string]> = [
  [/(dise[ñn]|arquitect|planific|\bplan\b|design|architect|blueprint|\bplanning)/i, () => tr('el Arquitecto', 'the Architect')],
  [/(depur|debug|arregl|corr[ií]g|\bfix|\bbug|error|falla|repair|\bheal|\bpatch|troubleshoot|\bresolv)/i, () => tr('el Sanador', 'the Healer')],
  [/(audit|segur|security|revis|review|inspect|\bvet\b)/i, () => tr('el Centinela', 'the Sentinel')],
  [/(prueb|\btest|verific|comprueb|\bcheck|valid|\bverif|\bensure|\bconfirm)/i, () => tr('el Vigía', 'the Lookout')],
  [/(traduc|translat|\blocali[sz]e)/i, () => tr('el Políglota', 'the Polyglot')],
  [/(resum|summar|cr[oó]nica|chronicle|\brecap|\bdigest)/i, () => tr('el Cronista', 'the Chronicler')],
  [/(escrib|redact|\bwrite|document|\bdraft|\bcompos|\bdocs\b)/i, () => tr('el Escriba', 'the Scribe')],
  [/(investig|research|analiz|estudi|compar|analy[sz]|\bstudy|\bexplor|\bexamin)/i, () => tr('el Erudito', 'the Scholar')],
  [/(refactor|limpi|orden|simplific|\bclean|\btidy|\bpolish|\bsimplif|\breorgani[sz]|\bsort\b)/i, () => tr('el Pulidor', 'the Polisher')],
  [/(impl[eé]ment|constr[uú]y|\bbuild|cr[eé][aá]|gener|\bmake\b|\bcraft|\bdevelop|\bscaffold)/i, () => tr('el Artesano', 'the Artisan')],
  [/(\blist|enumer|cuenta|cont[aá]r|\bcount|inventari|\btally|\bhow many)/i, () => tr('el Contador', 'the Counter')],
  [/(busc|b[uú]squ|encuentr|localiz|\bfind|search|locate|d[oó]nde|\bwhere\b|look for|\btrack|\bhunt|\bseek|\bgrep)/i, () => tr('el Rastreador', 'the Tracker')],
]

const BY_CLASS: Record<GremioClass, () => string> = {
  maestro: () => tr('el Grande', 'the Great'),
  archimago: () => tr('el Eterno', 'the Eternal'),
  mago: () => tr('el Sabio', 'the Wise'),
  bardo: () => tr('el Viajero', 'the Traveler'),
  picaro: () => tr('el Sigiloso', 'the Stealthy'),
}

/** «el Rastreador», «el Sanador»…: lo primero que calce en la descripción y el comienzo del encargo. */
export function epithet(cls: GremioClass, description: string, prompt: string): string {
  const text = `${description}\n${prompt.slice(0, 240)}`
  for (const [re, name] of BY_WORD) if (re.test(text)) return name()
  return BY_CLASS[cls]()
}
