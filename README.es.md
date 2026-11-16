# Operator

[English](README.md) · **Español**

Un mod para Claude Code. Tú eres **el Operador**: quien mira las pantallas, ve qué hace cada uno dentro de la Matrix y conecta las llamadas. Tu sesión principal es **el Arquitecto**, y cada agente que conecta es un **programa** cuyo tipo depende del modelo:

| Programa | Modelo | Aspecto |
|---|---|---|
| el Arquitecto | la sesión principal | pelo y barba blancos, lentes redondos, traje claro |
| Neo | Fable | abrigo largo oscuro y lentes pequeños |
| el Oráculo | Opus | pelo gris, chaleco verde azulado |
| un Agente | Sonnet | traje oscuro, camisa blanca, corbata y lentes oscuros |
| un Centinela | Haiku | una cúpula de metal con ojos rojos y tentáculos que se mueven |

## Qué hace

- **Panel en vivo** con pixel art animado: el Arquitecto, los programas conectados con lo que hace cada uno y cuánto llevan, el Constructo con los que se desconectaron y un registro corto (al tocarlo se abre entero). Sobre el Arquitecto cae una franja de lluvia digital, en verde fósforo, todo el rato que el panel está abierto.
- **Retratos:** en una terminal que dibuja imágenes (Ghostty, kitty, iTerm2 3.5+, WezTerm) cada programa es un retrato de cómic (`art/`); en las demás, pixel art.
- **Qué hace cada uno, en claro:** cada programa muestra para qué lo conectaron (🎯 su encargo, fijo) y en qué va ahora, en dos líneas como máximo. El paso lleva el ícono de su fase, deducida de sus últimas herramientas: 🔎 investigando, 📝 escribiendo, 🧪 probando (un comando que huele a test, build, lint o tsc), 💻 ejecutando, 📡 con un conector, 🔗 delegando, ⏸ esperando permiso, ⏳ esperando a otro programa, 💤 quieto. Los conectores se leen como se habla: "consulta Gmail", "escribe en ClickUp", "usa Notion". El Arquitecto igual: su fase y su paso, y "esperando a 2 programas" cuando solo espera.
- **Cierre en una línea:** cuando un programa se desconecta, el registro dice en una línea qué trajo y qué archivos tocó ("tocó 3 archivos: a.ts, b.ts, c.ts").
- **Trabajo duplicado:** si dos programas en curso leen los mismos tres archivos o hacen la misma búsqueda con menos de dos minutos de diferencia, el registro lo avisa una vez ("⚠ Agente 1 y Centinela 2 revisan lo mismo: tema.ts, reino.ts…").
- **La ficha de cada programa:** su conexión, lo que hace o la descarga que trajo, el tiempo, las acciones y lo que gastó. Lo técnico (quién lo conectó, modelo, versión, esfuerzo, permisos, tokens, encargo completo) va en "▸ Más".
- **Agentes retomados:** si se le vuelve a escribir a un programa que ya se desconectó, se conecta de nuevo con su nombre y su historia, en otra ronda.
- **🌐 La Red:** con varias sesiones abiertas, una línea muestra en qué está cada una: ❓ te pide algo (una pregunta, un plan o un permiso), ⏳ trabajando, ✅ terminó hace un rato, 💤 tranquila. Cada sesión es una nave de Zion (Nabucodonosor, Logos, Osiris, Vigilante, Ícaro…): la misma cada vez que se vuelve a abrir esa sesión, y nunca dos naves vivas con el mismo nombre. La línea cerrada muestra además lo que está haciendo ahora cada sesión que trabaja ("escribiendo armar.py"). Al tocarla, una fila por sesión (la tuya con ●), las que te necesitan primero: hace cuánto, ♥ señal, 🔋 su parte de la jornada y 🔌 conectados o 💾 descargas sin leer; al tocar una fila, el nombre real de la sesión, qué te pide o lo último que pasó, y su carpeta. La que te pregunta algo se avisa arriba del panel y en la línea de estado de todas. El nombre real de cada sesión es el título de su pestaña de Terminal (el que le pone Claude Code); con `/operador nombre` le pones el que quieras.
- **🗺 El mapa de la Red:** `/operador red` (o tocar la línea de la Red) abre un panel propio con las naves vivas como árbol (├─ └─): cada nave con su carpeta, su estado, su fase y su paso y 🔋 lo gastado, y debajo sus programas (clase, número, fase y encargo), anidados bajo quien los conectó y agrupados cuando los conectó un Workflow. Las sesiones que trabajan en la misma carpeta van juntas bajo 📁. Los enlaces entre sesiones muestran la dirección (→ salió de aquí, ← llegó, ⇄ ambas), cuántos mensajes, el asunto del último y hace cuánto. Una línea de tiempo del turno, plegada, dice cuándo salió cada programa, cuándo volvió y cuánto tardó. En el panel principal la Red es una sola línea ("3 naves · 1 te necesita · 1 enlace · ⚠ 1 choque"); si el mapa no tiene lugar en pantalla, la lista se abre ahí mismo.
- **⚠ Choques:** si dos sesiones vivas editan el mismo archivo en menos de 10 minutos, "⚠ Logos y Osiris editan el mismo archivo: tema.ts" aparece arriba del mapa y bajo la línea de la Red del panel principal sin abrir nada, y queda en el registro una vez por par y archivo.
- **🚪 Ir a la sesión:** en la Red, al tocar una sesión aparece "🚪 Ir a la sesión", y el aviso ❓ de arriba también se toca: Terminal salta a la pestaña de esa sesión. La primera vez, macOS te pregunta si el mod puede controlar Terminal.
- **☎️ Quién sonó y dónde:** cuando el Arquitecto termina, su pestaña de Terminal queda marcada ("☎️ Recetario") hasta que la sesión vuelve a trabajar; si el turno duró más de 20 s, llega además una notificación de macOS sin sonido ("Operador · Recetario: El Arquitecto terminó"). En el panel de las demás sesiones aparece arriba, por dos minutos, qué sonó y dónde ("☎️ El Arquitecto terminó · Osiris", "💾 Centinela 2 se desconectó con la descarga · Logos"); tocarlo lleva a esa pestaña. El sonido sigue diciendo quién: cada programa tiene el suyo.
- **Aviso de macOS al preguntar:** si una sesión lleva más de un minuto esperando tu respuesta (una pregunta, un plan o un permiso), te llega una notificación del sistema, sin sonido, una vez por pregunta.
- **💬 Bocadillo:** el programa que se desconecta muestra unos segundos la primera frase de su descarga.
- **📜 Descarga completa:** en la ficha del programa, abre su informe entero y con formato en un panel aparte, con "📋 Copiar".
- **🔋 Gasto por proyecto:** el Archivo muestra la parte de cada proyecto en el gasto de hoy y de la semana.
- **Retomar con memoria:** al empezar cada turno, el Arquitecto sabe qué programas se desconectaron hace poco y se pueden retomar con SendMessage; si lo nuevo sigue lo que hicieron, los retoma en vez de conectar uno nuevo, y conservan lo que aprendieron.
- **El plantel del día:** si hay un Centinela libre en el Constructo, se conecta ese mismo (su nombre, su apodo y su historial del día); solo si todos están conectados se suma uno nuevo, que también queda. En el Constructo cada programa aparece una vez y desteñido mientras descansa. Cada conexión sigue siendo un agente nuevo: lo que continúa es el programa.
- **Fin de la jornada:** a medianoche todos se van a casa: el Constructo queda vacío, la numeración vuelve a 1 y el registro lo cuenta ("🌙 Fin de la jornada: 9 conexiones, 8 con descarga"). El Archivo guarda la historia.
- **Apodos:** cada programa recibe un apodo según su conexión ("Centinela 2, el Rastreador", "Agente 1, el Sanador"), sin gastar modelo.
- **La desconexión:** el que se desconecta se queda unos segundos en el campo con su 💾 (o 🩹 si se desconectó herido) antes de entrar al Constructo.
- **El déjà vu:** cuando la conversación se llena, Claude Code la resume sola (o la resumes tú con `/compact`). Mientras tanto el Arquitecto duerme (ojos cerrados y una "Z", "😴 en un déjà vu…", y 😴 en la Red) y al despertar el registro dice cuánta señal recuperó ("🌅 El Arquitecto despertó de su déjà vu: la señal pasó de 27 % a 92 %").
- **Avisos suaves, una vez:** cuando al Arquitecto le queda poca señal (menos de 20 % de contexto) se cansa (párpados caídos y una gotita) y sugiere `/compact`; si al ritmo actual la celda de la jornada no alcanza, lo dice una vez por ventana, aunque tengas varias sesiones abiertas.
- **Pronóstico del déjà vu:** la señal del Arquitecto dice en cuántos turnos, a este ritmo, se resumirá la conversación ("déjà vu en ~3 turnos"), para hacer /compact antes de algo grande.
- **Sesión sin guardar:** si la terminal heredó la marca de sesión hija (Claude Code no guarda la conversación), el panel lo avisa arriba y dice cómo arreglarlo.
- **Ghostty:** la marca ☎️ en la pestaña e "Ir a la sesión" funcionan también en Ghostty (la pestaña se busca por System Events; macOS pide una vez el permiso de Accesibilidad).
- **Línea de estado:** con el panel cerrado se ve "♥ 68 · 🔋 72 · 🔌 2", y "📜✗ sin Código" si lo apagaste.
- **Se recuerda lo que apagas:** el sonido y el Código quedan como los dejaste en la sesión siguiente.
- **📋 Copiar descarga:** en la ficha de cada programa, copia su informe al portapapeles.
- **💤 Quieto:** si un programa lleva más de 5 minutos sin acciones ni herramientas en curso, dice "quieto hace N min", y su ficha ofrece "✂ Desconectar", que le pide al Arquitecto que lo detenga (TaskStop).
- **Todo se toca:** las líneas del registro abren la ficha del programa; "+N más" abre el Constructo entero.
- **El Código explica lo que aprende:** cuando un tipo de programa falla seguido y el Código empieza a conectar el siguiente, el registro lo dice (y también cuando se recupera).
- **Varias sesiones a la vez:** el Archivo cuenta la cuota una sola vez aunque tengas varias sesiones abiertas, y las escrituras van en fila.
- **La ficha del Arquitecto:** su señal es el contexto que le queda (♥, cada uno el 10 %; al tocarla dice cuántos tokens lleva), el turno en curso con su tiempo y sus acciones, y **Hoy**: conexiones del día, las que volvieron con descarga y las que no has leído (tocarla abre la primera sin leer). El sonido 🔊 y el Código 📜 son iconos junto al título y se apagan tocándolos (🔇, 📜✗).
- **El Código de la Matrix** decide modelo y esfuerzo de cada conexión: buscar va a un Centinela con esfuerzo bajo y sin herramientas de edición (Bash sigue sujeto a los permisos normales de Claude Code), investigar a un Agente, diseñar al Oráculo. Acota cada conexión y frena las copias de toda la conversación para tareas livianas.
- **Neo (Fable) siempre pide tu permiso:** la píldora roja.
- **Experiencia:** Haiku clasifica cada conexión. Si un tipo de programa falla seguido en un tipo de tarea, la siguiente parecida sube un nivel. En la ficha de cada programa que se desconectó, "¿Te sirvió lo que trajo?" (👍/👎, una sola vez) le enseña al Código: un 👎 cuenta como conexión fallida.
- **Energía de la Matrix:** tu cuota del plan como una barra de carga por ventana (la jornada de 5 h si tu plan la tiene, y la semana), verde que pasa a ámbar bajo 50 % y a rojo bajo 20 %, con lo que queda, cuándo se acaba a este ritmo ("se acaba el jue 18:00") o cuándo se recarga (↻). Los planes sin ventana de 5 h (Ultra) se cuentan por semana. Sobre el 95 % de la semana el Código conecta solo Centinelas y Agentes, lo dice una vez y la línea de estado muestra ⛔; el detalle de la semana dice dónde se fue la energía por proyecto. Con varias sesiones abiertas, "esta sesión gastó" es su parte de lo que subió la cuota, repartida según lo que gastó cada una. Al tocar una celda se abre el detalle: cuánto gastas por hora, el reparto estimado entre el Arquitecto y cada tipo de programa, y cuánto te ahorró el Código. El botón 🗄️ Archivo abre la historia de todas las sesiones.
- **Sonidos,** sintetizados por el propio mod (nada de las películas): un teléfono suave cuando el Arquitecto termina, un sonido propio para cada programa al desconectarse (un barrido de tiempo bala para Neo, una cucharita contra la taza para el Oráculo, dos pitidos de auricular para un Agente, un zumbido mecánico grave para un Centinela) y estática cuando algo falla.
- **Zoom:** con muchos agentes, el panel pasa a versión mini y luego a una fila por tipo de programa.

## Comandos

- `/operador` abre el panel (si la sesión habla inglés, el comando es `/operator`).
- `/operador sonidos` toca todos los sonidos en orden (`sounds`).
- `/operador cuentas` muestra la energía de la Matrix y el Archivo (`accounts`).
- `/operador red` abre el mapa de la Red (`net`, `map`, `mapa`).
- `/operador cerrar` cierra el panel (`close`).
- `/operador nombre <texto>` le pone nombre a esta sesión (si no, se llama como su carpeta o sus primeros pedidos) (`name <text>`).
- `/operador idioma es|en|auto` cambia el idioma del mod (`language es|en|auto`).

Los subcomandos se aceptan en los dos idiomas.

El panel se acomoda junto a la conversación desde 110 columnas.

## Idioma / Language

El Operador habla español e inglés. Sigue el ajuste Language de Claude Code (`/config` → Language); si está vacío, el idioma del sistema; si no, inglés. `/operador idioma es|en|auto` lo cambia (auto = vuelve a seguir a Claude Code) y se recuerda entre sesiones.

## Instalación

En la terminal, dentro de Claude Code:

```
/plugin install operator --marketplace LastrarterotH/the-guild
```

O en dos pasos:

```
/plugin marketplace add LastrarterotH/the-guild
/plugin install operator@the-guild
```

Desde una shell:

```
claude plugin marketplace add LastrarterotH/the-guild
claude plugin install operator@the-guild
```

En la app de escritorio, donde `/plugin` no funciona: haz clic en + junto al cuadro de texto, luego Plugins, Add marketplace con `LastrarterotH/the-guild`, y después Add plugin.

Al agregar el marketplace, Claude Code pregunta `Add marketplace?`: responde `y` y elige el alcance.

Para actualizarlo: `/plugin marketplace update the-guild`. Para quitarlo: `/plugin uninstall operator@the-guild`.

**Si vienes de `guild` (o del antiguo `gremio`):** ejecuta `/plugin uninstall guild@the-guild` (o `gremio@the-guild`) y luego instala `operator`. El Archivo, la experiencia y tus ajustes se traen solos la primera vez que arranca.

El panel funciona en cualquier sistema. Lo que toca Terminal (ir a la pestaña de una sesión, marcarla con ☎️ y los avisos del sistema) es solo para macOS con Terminal.app o Ghostty; en otros sistemas esas funciones simplemente no hacen nada.

## Privacidad y permisos

- **Todo queda en tu computador.** El Operador guarda su estado en el almacén local de Claude Code y no se conecta a ningún servicio fuera de Claude.
- **Usa tu cuenta de Claude para dos cosas pequeñas:** Haiku clasifica cada conexión que se hace (lee su descripción y su encargo) y le pone nombre a una sesión que partió en tu carpeta de inicio (lee sus tres primeros pedidos). Lo que cuesta aparece en el Archivo como "Código".
- **Lee solo la conversación de la sesión en curso** (su archivo en `~/.claude/projects`), para tomar su título y sus primeros pedidos. Los únicos otros archivos que lee son los almacenes de los plugins anteriores `guild` y `gremio`, una vez, para traer tu Archivo.
- **La Red se comparte solo entre tus sesiones** de este computador, por el almacén local de Claude Code: nombre, carpeta, estado y la última línea del registro de cada una y, desde la 0.29, el encargo de sus programas en curso, el asunto de los mensajes entre sesiones y las rutas completas de los archivos editados en los últimos 10 minutos. Nada sale de la máquina.
- **En macOS ejecuta `osascript`** para cambiar de pestaña en Terminal, marcar su título y mostrar notificaciones. La primera vez macOS te pregunta si lo permites; si dices que no, el resto del mod sigue igual.
- **El Código de la Matrix se suma a las instrucciones de Claude** para elegir modelo y esfuerzo de cada agente, y puede frenar un clon de toda la conversación para algo liviano. Se apaga tocando 📜 en el panel. Aparte, conectar a Neo (Fable) siempre te pide permiso, con el Código encendido o apagado.

## Desarrollo

- Sprites: `node tools/ver-sprites.mjs` los pinta como la terminal en `.vista/sprites.png`. Cada figura se dibuja con letras en `hooks/sprites-matrix.ts`; cada celda (2x2 píxeles) admite dos colores, contando el vacío, y una prueba lo revisa.
- Retratos: `python3 tools/retratos.py <imágenes>` los recorta y escribe en `art/` las variantes en reposo y caído.
- Pruebas: `claude plugin test .`
- Validación: `claude plugin validate .`
- Sonidos: `python3 tools/sonidos.py` los regenera en `sounds/`.
- Idiomas: los comentarios del código van en español, y todo texto visible pasa por `tr(es, en)` en `hooks/i18n.ts`.
