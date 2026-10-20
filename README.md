# The Guild · El Gremio de Clawd

Un mod para Claude Code. Clawd es el **Gran Maestre** del gremio (tu sesión principal) y cada agente que envía es un **aventurero** cuya clase depende del modelo:

| Clase | Modelo | Vestimenta |
|---|---|---|
| Gran Maestre (Clawd) | la sesión principal | corona de cinco puntas con perlas, rubí y zafiros |
| Archimago | Fable | sombrero violeta alto con estrellas y cinta de oro, y barba blanca |
| Mago | Opus | sombrero azul con la punta doblada, estrella y cinta dorada |
| Bardo | Sonnet | gorra verde con hebilla dorada y pluma roja |
| Pícaro | Haiku | capucha gris que enmarca la cara y pañuelo verde azulado sobre la boca |

## Qué hace

- **Panel en vivo** con pixel art animado: Clawd, los aventureros en misión con lo que hace cada uno y cuánto llevan, la taberna con los que volvieron y una crónica corta (al tocarla se abre entera).
- **La ficha de cada aventurero:** su misión, lo que hace o el botín que trajo, el tiempo, las acciones y lo que gastó. Lo técnico (quién lo envió, modelo, esfuerzo, permisos, tokens, encargo completo) va en «▸ Más».
- **Agentes retomados:** si se le vuelve a escribir a un aventurero que ya volvió, sale de nuevo con su nombre y su historia, en otra ronda.
- **🏰 El reino:** con varias sesiones abiertas, una línea muestra en qué está cada una: ❓ te pide algo (una pregunta, un plan o un permiso), ⏳ trabajando, ✅ terminó hace un rato, 💤 tranquila. Al tocarla, una fila por sesión (la tuya con ●), las que te necesitan primero: hace cuánto, ♥ vida, 🪙 su parte de la jornada y 🧭 en misión o 💰 botines sin leer; al tocar una fila, qué te pide o lo último que pasó, y su carpeta. La que te pregunta algo se avisa arriba del panel y en la línea de estado de todas. Cada sesión se llama como su pestaña de Terminal (el título que le pone Claude Code); con `/gremio nombre` le pones el que quieras.
- **🚪 Ir a la sesión:** en el reino, al tocar una sesión aparece «🚪 Ir a la sesión», y el aviso ❓ de arriba también se toca: Terminal salta a la pestaña de esa sesión. La primera vez, macOS te pregunta si gremio puede controlar Terminal.
- **🔔 Quién sonó y dónde:** cuando Clawd termina, su pestaña de Terminal queda marcada («🔔 Recetario») hasta que la sesión vuelve a trabajar; si el turno duró más de 20 s, llega además una notificación de macOS sin sonido («Gremio · Recetario — Clawd terminó»). En el panel de las demás sesiones aparece arriba, por dos minutos, qué sonó y dónde («🔔 Recetario · Clawd terminó», «💰 Bitácora · Pícaro 2 volvió con el botín»); tocarlo lleva a esa pestaña. El sonido sigue diciendo quién: la melodía es Clawd y cada clase tiene el suyo.
- **🔔 Aviso de macOS al preguntar:** si una sesión lleva más de un minuto esperando tu respuesta (una pregunta, un plan o un permiso), te llega una notificación del sistema, sin sonido, una vez por pregunta.
- **💬 Bocadillo:** el aventurero que vuelve muestra unos segundos la primera frase de su botín.
- **📜 Pergamino:** en la ficha del aventurero, abre su botín completo y con formato en un panel aparte, con «📋 Copiar».
- **🪙 Gasto por proyecto:** el Libro muestra la parte de cada proyecto en el gasto de hoy y de la semana.
- **Retomar con memoria:** al empezar cada turno, Clawd sabe qué aventureros volvieron hace poco y se pueden retomar con SendMessage; si lo nuevo sigue lo que hicieron, los retoma en vez de mandar uno nuevo, y conservan lo que aprendieron.
- **El plantel del día:** si hay un Pícaro libre en la taberna, sale ese mismo (su nombre, su apodo y su historial del día); solo si todos están en misión se suma uno nuevo, que también queda. En la taberna cada aventurero aparece una vez y desteñido mientras descansa. Cada misión sigue siendo un agente nuevo: lo que continúa es el aventurero.
- **Fin de la jornada:** a medianoche todos se van a casa: la taberna queda vacía, la numeración vuelve a 1 y la crónica lo cuenta («🌙 Fin de la jornada: 9 misiones, 8 con botín»). El Libro guarda la historia.
- **Apodos:** cada aventurero recibe un apodo según su misión («Pícaro 2, el Rastreador», «Bardo 1, el Sanador»), sin gastar modelo.
- **La vuelta:** el que vuelve se queda unos segundos en el campo con su 💰 (o 🩹 si volvió herido) antes de entrar a la taberna.
- **La siesta:** cuando la conversación se llena, Claude Code la resume sola (o la resumes tú con `/compact`). Mientras tanto Clawd duerme (ojos cerrados y una «Z», «😴 durmiendo una siesta…», y 😴 en el reino) y al despertar la crónica dice cuánta vida recuperó («🌅 Clawd despertó de su siesta: la vida pasó de 27 % a 92 %»).
- **Avisos suaves, una vez:** cuando a Clawd le queda poca vida (menos de 20 % de contexto) se cansa (párpados caídos y una gotita) y sugiere `/compact`; si al ritmo actual la bolsa de la jornada no alcanza, lo dice una vez por ventana, aunque tengas varias sesiones abiertas.
- **Línea de estado:** con el panel cerrado se ve «♥ 68 · 🪙 72 · 🧭 2», y «📜✗ sin Código» si lo apagaste.
- **Se recuerda lo que apagas:** el sonido y el Código quedan como los dejaste en la sesión siguiente.
- **📋 Copiar botín:** en la ficha de cada aventurero, copia su informe al portapapeles.
- **💤 Quieto:** si un aventurero lleva más de 5 minutos sin acciones ni herramientas en curso, se ve «quieto hace N min».
- **Todo se toca:** las líneas de la crónica abren la ficha del aventurero; «+N más» abre la taberna entera.
- **El Código explica lo que aprende:** cuando una clase falla seguido y el Código empieza a mandar la siguiente, la crónica lo dice (y también cuando se recupera).
- **Varias sesiones a la vez:** el libro cuenta la cuota una sola vez aunque tengas varias sesiones abiertas, y las escrituras van en fila.
- **La ficha del Gran Maestre:** su vida es el contexto que le queda (♥, cada uno el 10 %; al tocarla dice cuántos tokens lleva), el turno en curso con su tiempo y sus acciones, y **Hoy**: misiones del día, las que volvieron con botín y las que no has leído (tocarla abre la primera sin leer). El sonido 🔊 y el Código 📜 son iconos junto al título y se apagan tocándolos (🔇, 📜✗).
- **El Código del Gremio** decide modelo y esfuerzo de cada misión: buscar va a un Pícaro con esfuerzo bajo y sin herramientas de edición (Bash sigue sujeto a los permisos normales de Claude Code), investigar a un Bardo, diseñar a un Mago. Acota cada misión y frena las copias de toda la conversación para tareas livianas.
- **El Archimago (Fable) siempre pide tu permiso.**
- **Experiencia:** Haiku clasifica cada misión. Si una clase falla seguido en un tipo de misión, la siguiente parecida sube de clase. En la ficha de cada aventurero que volvió, «¿Te sirvió lo que trajo?» (👍/👎, una sola vez) le enseña al Código: un 👎 cuenta como misión fallida.
- **Tesoro del gremio:** tu cuota del plan en 🪙 (cada una, 10 %), una línea para la jornada de 5 horas y otra para la semana, con lo que queda y cuándo se rellena (↻). Con varias sesiones abiertas, «esta sesión gastó» es su parte de lo que subió la cuota, repartido según lo que gastó cada una. Al tocar una bolsa se abre el detalle: cuánto gastas por hora, el reparto estimado entre Clawd y cada clase y cuánto te ahorró el Código. El botón 📕 Libro abre la historia de todas las sesiones.
- **Sonidos:** una melodía suave de marimba cuando Clawd termina, un sonido propio por clase al volver y una trompeta triste cuando algo falla.
- **Zoom:** con muchos agentes, el panel pasa a versión mini y luego a una fila por clase.

## Comandos

- `/gremio` abre el panel.
- `/gremio sonidos` toca todos los sonidos en orden.
- `/gremio cuentas` muestra el tesoro y el libro del gremio.
- `/gremio cerrar` cierra el panel.
- `/gremio nombre <texto>` le pone nombre a esta sesión en el reino (si no, se nombra por su carpeta o por sus primeros pedidos).

El panel se acopla al costado de la conversación desde 110 columnas.

## Instalación

En la terminal, dentro de Claude Code:

```
/plugin install gremio --marketplace LastrarterotH/the-guild
```

Desde una shell:

```
claude plugin install gremio --marketplace LastrarterotH/the-guild
```

En la app de escritorio, donde `/plugin` no funciona: haz clic en + junto al cuadro de texto, luego Plugins, Add marketplace con `LastrarterotH/the-guild`, y después Add plugin.

Al instalar, Claude Code pregunta `Add marketplace?`: responde `y` y elige el alcance.

Para actualizarlo: `/plugin marketplace update the-guild`. Para quitarlo: `/plugin uninstall gremio`.

El panel funciona en cualquier sistema. Lo que toca Terminal (ir a la pestaña de una sesión, marcarla con 🔔 y los avisos del sistema) es solo para macOS con Terminal.app; en otros sistemas esas funciones simplemente no hacen nada.

## Privacidad y permisos

- **Todo queda en tu computador.** El gremio guarda su estado en el almacén local de Claude Code y no se conecta a ningún servicio fuera de Claude.
- **Usa tu cuenta de Claude para dos cosas pequeñas:** Haiku clasifica cada misión que se envía (lee su descripción y su encargo) y le pone nombre a una sesión que partió en tu carpeta de inicio (lee sus tres primeros pedidos). Lo que cuesta aparece en el Libro como «Código».
- **Lee solo la conversación de la sesión en curso** (su archivo en `~/.claude/projects`), para tomar su título y sus primeros pedidos. No lee otros archivos tuyos.
- **El reino se comparte solo entre tus sesiones** de este computador: nombre, carpeta, estado y la última línea de la crónica de cada una.
- **En macOS ejecuta `osascript`** para cambiar de pestaña en Terminal, marcar su título y mostrar notificaciones. La primera vez macOS te pregunta si lo permites; si dices que no, el resto del gremio sigue igual.
- **El Código del Gremio se suma a las instrucciones de Claude** para elegir modelo y esfuerzo de cada agente, y puede frenar un clon de toda la conversación para algo liviano. Se apaga tocando 📜 en el panel. Aparte, enviar al Archimago (Fable) siempre te pide permiso, con el Código encendido o apagado.

## Desarrollo

- Sprites: `node tools/ver-sprites.mjs` los pinta como la terminal en `.vista/sprites.png`. Cada vestimenta se dibuja con letras en `hooks/sprites.ts`; cada celda (2x2 píxeles) admite dos colores, contando el vacío, y una prueba lo revisa.

- Pruebas: `claude plugin test .`
- Validación: `claude plugin validate .`
- Sonidos: `node tools/sonidos.mjs` los vuelve a generar en `sounds/`.
