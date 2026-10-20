// Lo que el gremio guarda durante la sesión.

export type GremioClass = 'maestro' | 'archimago' | 'mago' | 'bardo' | 'picaro'

export type GremioStatus = 'running' | 'done' | 'failed' | 'aborted'

export type GremioEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

/** El tipo de misión, que decide la clase de partida. */
export type GremioTask = 'identificar' | 'investigar' | 'disenar'

/** Tokens de un uso, como los cobra la API. */
export type GremioUsage = { input: number; output: number; cacheRead: number; cacheWrite: number }

/** Cómo le fue a una clase: misiones, buen y mal botín, gasto. */
export type GremioClassStats = { missions: number; good: number; bad: number; cost: number; tokens: number }

/** El libro del gremio: lo acumulado entre sesiones. */
export type GremioBook = {
  missions: number
  good: number
  bad: number
  /** Lo que costaron los aventureros, en dólares de la API. */
  cost: number
  /** Lo que se ahorró frente a hacerlo todo con el modelo del Maestro. */
  saved: number
  /** Lo que costaron los turnos del Maestro. */
  masterCost: number
  /** Lo que costó el Código al clasificar misiones con Haiku. */
  codeCost: number
  byClass: Record<string, GremioClassStats>
  /** Puntos de ventanas de 5 h y de 7 días que consumieron las sesiones con el gremio. */
  fivePoints: number
  weekPoints: number
  /** Por ventana, el porcentaje más bajo y el más alto vistos (ver hooks/libro.ts). */
  fiveSeen?: Record<string, [number, number]>
  weekSeen?: Record<string, [number, number]>
  /** Lo contado de ventanas ya olvidadas (y lo de antes de contar así). */
  fiveBase?: number
  weekBase?: number
  /** Por día (AAAA-MM-DD), lo que gastó cada proyecto (dólares de la API, estimado). */
  projects?: Record<string, Record<string, number>>
}

/** La cuota del plan: ventanas, muestras del ritmo y lo consumido en la sesión. */
export type GremioQuota = {
  windows: Array<{ kind: string; percent: number; resetsAt: string | null }>
  /** Lecturas de la ventana de 5 h, para medir el ritmo. */
  samples: Array<{ at: number; five: number }>
  /** Puntos de la ventana de 5 h consumidos en esta sesión. */
  sessionFive: number
  /** Puntos de la ventana de 7 días consumidos en esta sesión. */
  sessionWeek: number
}

/** La tesorería de esta sesión: el peso de cada uno, para repartir la cuota. */
export type GremioTreasury = {
  masterCost: number
  masterTokens: number
  heroesCost: number
  codeCost: number
  saved: number
}

/** Un agente de la sesión, visto como aventurero. */
export type GremioHero = {
  id: string
  /** El aventurero que lo envió; null cuando lo envió el Maestro. */
  parentId: string | null
  /** "Pícaro 2", "Mago 1". */
  name: string
  cls: GremioClass
  /** Nombre corto del modelo: "Haiku 5.5". */
  model: string
  /** El id completo del modelo, para el precio. */
  modelId: string
  /** El modelo con que se compara el ahorro: el del Maestro al enviarlo. */
  baseline: string
  /** El tipo de misión, si el Código lo supo. */
  task: GremioTask | null
  /** Si la experiencia lo subió de clase, por qué. */
  promoted: string | null
  usage: GremioUsage | null
  /** Lo que costó, en dólares de la API. */
  cost: number | null
  /** Lo que ahorró frente al modelo del Maestro (negativo: costó más). */
  saved: number | null
  /** Tu calificación del botín. */
  rating: 'up' | 'down' | null
  /** Cómo se decidió el modelo: el Código, el Maestro, o tú (Fable). */
  modelChoice: string
  /** El esfuerzo que le asignó el Maestro; null si no le asignó. */
  effort: GremioEffort | null
  /** El Código lo dejó en solo lectura: no edita ni crea archivos. */
  isReadOnly: boolean
  /** Si llevó misión acotada, el largo máximo de su informe en palabras. */
  briefWords: number | null
  description: string
  /** El encargo completo, recortado. */
  mission: string
  kind: string
  isBackground: boolean
  status: GremioStatus
  doing: string
  actions: string[]
  actionCount: number
  startedAt: number
  endedAt: number | null
  tokens: number | null
  report: string | null
  /** El informe completo (para el pergamino); `report` es su versión corta. */
  reportFull?: string | null
  /** Cuántas veces salió: 1 al enviarlo, +1 cada vez que se le vuelve a escribir. */
  round?: number
  /** Cuándo empezó la ronda en curso (o la última). */
  roundStartedAt?: number
  /** El último mensaje con que lo retomaron. */
  lastMessage?: string | null
  /** Su apodo de fantasía, según la misión: «el Rastreador». */
  epithet?: string
  /** Cuándo hizo su última acción (para saber si está quieto). */
  lastActionAt?: number
  /** Cuándo abriste su ficha después de que volvió (si no, su botín está «sin leer»). */
  seenAt?: number | null
}

/** El contexto de la sesión: la vida del Maestro. */
export type GremioContext = { percent: number | null; tokens: number | null; window: number }
/** La sesión principal, vista como el Maestro del Gremio. */
export type GremioMaster = {
  doing: string
  isBusy: boolean
  model: string
  actionCount: number
  actions: string[]
  /** Cuándo empezó el turno en curso, o el último. */
  turnStartedAt?: number | null
  /** Cuánto duró el último turno terminado. */
  lastTurnMs?: number | null
  /** Cuándo terminó el último turno (para el reino: «terminó hace…»). */
  lastTurnEndAt?: number | null
  /** Acciones del turno en curso, o del último. */
  turnActions?: number
  /** Lo lleno del contexto, según la última medición. */
  context?: GremioContext | null
  /** Durmiendo la siesta: la conversación se está resumiendo. */
  napping?: boolean
  /** Cuándo empezó la siesta. */
  napStartedAt?: number | null
}

/** En qué está una sesión del reino: te pide algo, duerme la siesta (resume), trabaja, terminó o está tranquila. */
export type GremioRealmState = 'asking' | 'napping' | 'working' | 'ready' | 'idle'
/** El latido de una sesión con gremio, que leen las demás. */
export type GremioRealmEntry = {
  /** El id de la sesión. */
  key: string
  /** Su nombre corto: la carpeta, o un nombre según su primer pedido. */
  label: string
  state: GremioRealmState
  /** Desde cuándo está en ese estado (o cuándo terminó su último turno). */
  since: number
  /** Aventureros en misión. */
  running: number
  /** La vida (contexto libre, %), si se conoce. */
  life: number | null
  /** Cuándo latió por última vez. */
  at: number
  /** La ventana de 5 h en que gastó (su hora de relleno, redondeada; ver hooks/libro.ts). */
  windowKey?: string
  /** Lo que gastó en esa ventana, en dólares de la API (estimado, para repartir la jornada). */
  cost?: number
  /** Su parte de la jornada, en monedas (estimada). */
  coins?: number | null
  /** Aventureros que volvieron y cuya ficha no se abrió. */
  unread?: number
  /** Qué te pide, si te pide algo: «te pide permiso: Bash», «te hace una pregunta»… */
  ask?: string | null
  /** Lo último que pasó (la última línea de su crónica). */
  last?: string | null
  /** Su carpeta. */
  folder?: string | null
  /** Sus terminales posibles (ttys004…), para ir a su pestaña. */
  ttys?: string[]
  /** Lo último que sonó en esa sesión y quién fue: «🔔 Clawd terminó», «💰 Pícaro 2 volvió…». */
  bell?: { at: number; icon: string; text: string } | null
  /** La sesión se cerró: ya no se muestra, pero su gasto cuenta hasta que pase la ventana. */
  closed?: boolean
}
/** Una línea de la crónica; `heroId` si habla de un aventurero (al tocarla se abre su ficha). */
export type GremioLogEntry = { at: number; text: string; heroId?: string }

declare module 'claude-code' {
  interface PluginState {
    guild: {
      heroes: GremioHero[]
      master: GremioMaster
      /** La ficha abierta: el id de un aventurero, "maestro" o null. */
      selected: string | null
      log: GremioLogEntry[]
      counters: Record<string, number>
      /** El Código del Gremio: encendido elige modelo y esfuerzo y acota misiones. */
      doctrine: boolean
      /** Los sonidos al volver cada aventurero y al terminar el Maestro. */
      sound: boolean
      /** Con muchos en el campo: la clase cuya lista está abierta. */
      expanded: string | null
      treasury: GremioTreasury
      quota: GremioQuota
      /** Copia del libro guardado, para dibujarlo. */
      book: GremioBook
      /** El libro del gremio abierto en el panel. */
      bookOpen: boolean
      /** La bolsa del tesoro con el detalle abierto: "five_hour", "seven_day" o null. */
      purseOpen: string | null
      /** El detalle de la vida del Maestro (el contexto) abierto. */
      lifeOpen: boolean
      /** Ya se avisó que a Clawd le queda poca vida (se rearma al subir de 30). */
      lifeWarned: boolean
      /** La ficha del aventurero con el detalle completo abierto. */
      cardMore: boolean
      /** La crónica abierta entera. */
      chronicleOpen: boolean
      /** La taberna abierta entera (no solo la primera fila). */
      tavernOpen: boolean
      /** El día de la jornada en curso (fecha local, AAAA-MM-DD); a medianoche todos se van a casa. */
      day: string
      /** Las otras sesiones con gremio (el reino), según su último latido. */
      realm: GremioRealmEntry[]
      /** El reino abierto en detalle. */
      realmOpen: boolean
      /** El aventurero cuyo botín muestra el pergamino. */
      scrollHero: string | null
      /** La sesión del reino con su detalle abierto (su id), o null. */
      realmPicked: string | null
      /** El nombre corto de esta sesión en el reino. */
      label: string
      /** Lo que gastó esta sesión en la ventana de 5 h en curso (dólares de la API, estimado). */
      spend: { key: string; cost: number }
      /** De dónde salió el nombre: tú, la carpeta, la conversación o el primer pedido visto. */
      labelSource: '' | 'manual' | 'title' | 'folder' | 'transcript' | 'prompt'
    }
  }
}
