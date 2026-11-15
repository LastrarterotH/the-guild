# Operator

**English** · [Español](README.es.md)

A mod for Claude Code. You are **the Operator**: the one who watches the screens, sees what everyone is doing inside the Matrix and patches the calls through. Your main session is **the Architect**, and every agent it jacks in is a **program** whose kind depends on the model:

| Program | Model | Look |
|---|---|---|
| the Architect | the main session | white hair and beard, round glasses, light suit |
| Neo | Fable | long dark coat and small shades |
| the Oracle | Opus | gray hair, teal cardigan |
| an Agent | Sonnet | dark suit, white shirt, tie and shades |
| a Sentinel | Haiku | a metal dome with red eyes and moving tentacles |

## What it does

- **Live panel** with animated pixel art: the Architect, the programs jacked in with what each one is doing and how long they have been at it, the Construct with those who unplugged, and a short log (tap it to open it whole). A band of digital rain falls above the Architect, in phosphor green, the whole time the panel is open.
- **Portraits:** in a terminal that draws pictures (Ghostty, kitty, iTerm2 3.5+, WezTerm) each program is a comic-book portrait (`art/`); elsewhere, pixel art.
- **What each one is doing, in plain words:** every program shows what it was jacked in for (🎯 its brief, fixed) and its current step, in two lines at most. The step carries the icon of its phase, deduced from its last tools: 🔎 investigating, 📝 writing, 🧪 testing (a command that smells like test, build, lint or tsc), 💻 running, 📡 using a connector, 🔗 delegating, ⏸ waiting for permission, ⏳ waiting for another program, 💤 idle. Connectors read like people talk: "queries Gmail", "writes to ClickUp", "uses Notion". The Architect too: its phase and step, and "waiting for 2 programs" when that is all it does.
- **Closing line:** when a program unplugs, the log says in one line what it brought and which files it touched ("touched 3 files: a.ts, b.ts, c.ts").
- **Duplicate work:** if two running programs read the same three files or run the same search within two minutes, the log says so once ("⚠ Agent 1 and Sentinel 2 are checking the same thing: tema.ts, reino.ts…").
- **Each program's sheet:** its connection, what it is doing or the download it brought back, the time, the actions and what it spent. The technical side (who jacked it in, model, version, effort, permissions, tokens, full brief) lives under "▸ More".
- **Resumed agents:** if you write again to a program that already unplugged, it jacks in again with its name and its story, in another round.
- **🌐 The Network:** with several sessions open, one line shows what each is up to: ❓ needs you (a question, a plan or a permission), ⏳ working, ✅ finished a while ago, 💤 quiet. Every session is a ship of Zion (Nabucodonosor, Logos, Osiris, Vigilante, Ícaro…, named as in the Spanish dub): the same one each time you reopen that session, and never two live ships with one name. The closed line also shows what each working session is doing right now ("writing armar.py"). Tap it for one row per session (yours marked with ●), the ones that need you first: how long ago, ♥ signal, 🔋 its share of the shift, and 🔌 jacked in or 💾 unread downloads; tap a row to see the session's real name, what it asks or the last thing that happened, and its folder. The session that asks you something is flagged at the top of the panel and in every status line. Each session's real name is its Terminal tab title (the one Claude Code gives it); with `/operator name` you set whatever you like.
- **🗺 The Network map:** `/operator net` (or tapping the Network line) opens a panel of its own with the live ships as a tree (├─ └─): each ship with its folder, state, phase and step and 🔋 spent, and below it its programs (class, number, phase and brief), nested under whoever jacked them in and grouped when a Workflow started them. Sessions working in the same folder are grouped under 📁. Links between sessions show direction (→ sent from here, ← arrived, ⇄ both), how many messages, the subject of the last one and how long ago. A folded timeline of the turn shows when each program left, came back and how long it took. On the main panel the Network is a single line ("3 ships · 1 needs you · 1 link · ⚠ 1 clash"); if the map has no room on screen, the list opens right there.
- **⚠ Clashes:** if two live sessions edit the same file within 10 minutes, "⚠ Logos and Osiris are editing the same file: tema.ts" shows at the top of the map and under the Network line of the main panel without opening anything, and goes to the log once per pair and file.
- **🚪 Go to session:** in the Network, tapping a session shows "🚪 Go to session", and the ❓ notice at the top is tappable too: Terminal jumps to that session's tab. The first time, macOS asks whether the mod may control Terminal.
- **☎️ Who rang and where:** when the Architect finishes, its Terminal tab is marked ("☎️ Recipe box") until the session starts working again; if the turn lasted more than 20 s, a silent macOS notification arrives as well ("Operator · Recipe box: The Architect finished"). In the panel of your other sessions, what rang and where shows at the top for two minutes ("☎️ The Architect finished · Osiris", "💾 Sentinel 2 unplugged with the download · Logos"); tap it to go to that tab. The sound still tells you who: each program has its own.
- **macOS notice on a question:** if a session has been waiting for your answer (a question, a plan or a permission) for more than a minute, you get a silent system notification, once per question.
- **💬 Speech bubble:** the program that unplugs shows the first sentence of its download for a few seconds.
- **📜 Full download:** on the program's sheet, opens its whole report, formatted, in a separate panel, with "📋 Copy".
- **🔋 Spending by project:** the Archive shows each project's share of today's and this week's spending.
- **Resume with memory:** at the start of each turn, the Architect knows which programs unplugged recently and can be resumed with SendMessage; if the new task follows what they did, it resumes them instead of jacking in a new one, and they keep what they learned.
- **Today's roster:** if a Sentinel is free in the Construct, that same one jacks in (its name, its epithet and its history of the day); only if all are connected does a new one join, who also stays. In the Construct each program appears once, faded while resting. Each connection is still a new agent: what continues is the program.
- **End of the day:** at midnight everyone goes home: the Construct empties, numbering goes back to 1 and the log tells it ("🌙 End of the day: 9 connections, 8 with download"). The Archive keeps the history.
- **Epithets:** each program gets an epithet from its connection ("Sentinel 2, the Tracker", "Agent 1, the Healer"), without spending any model.
- **Unplugging:** the one who unplugs stays a few seconds in the field with its 💾 (or 🩹 if it unplugged wounded) before entering the Construct.
- **The déjà vu:** when the conversation fills up, Claude Code summarizes it by itself (or you do with `/compact`). Meanwhile the Architect sleeps (closed eyes and a "Z", "😴 in a déjà vu…", and 😴 in the Network) and on waking the log says how much signal came back ("🌅 The Architect woke up from a déjà vu: signal went from 27 % to 92 %").
- **Gentle warnings, once:** when the Architect is low on signal (under 20 % of context left) it gets tired (drooping eyelids and a little drop) and suggests `/compact`; if at the current pace the shift cell will not last, it says so once per window, even with several sessions open.
- **Déjà vu forecast:** the Architect's signal says in how many turns, at the current pace, the conversation will be summarized ("déjà vu in ~3 turns"), so you can /compact before a big task.
- **Unsaved session:** if the terminal inherited the child-session marker (Claude Code then saves no transcript), the panel says so at the top and how to fix it.
- **Ghostty:** the ☎️ mark on the tab and "Go to session" also work in Ghostty (the tab is found through System Events; macOS asks once for Accessibility).
- **Status line:** with the panel closed you see "♥ 68 · 🔋 72 · 🔌 2", and "📜✗ no Code" if you turned it off.
- **It remembers what you turn off:** sound and the Code stay as you left them in the next session.
- **📋 Copy download:** on each program's sheet, copies its report to the clipboard.
- **💤 Idle:** if a program has gone more than 5 minutes with no actions or tools running, it shows "idle for N min", and its sheet offers "✂ Disconnect", which asks the Architect to stop it (TaskStop).
- **Everything is tappable:** log lines open the program's sheet; "+N more" opens the whole Construct.
- **The Code explains what it learns:** when a kind of program fails often and the Code starts jacking in the next one up, the log says so (and also when it recovers).
- **Several sessions at once:** the Archive counts the quota only once even with several sessions open, and writes are queued.
- **The Architect's sheet:** its signal is the context it has left (♥, each one 10 %; tap it to see how many tokens it holds), the current turn with its time and actions, and **Today**: the day's connections, those that came back with a download and those you have not read (tap it to open the first unread). Sound 🔊 and the Code 📜 are icons next to the title and are turned off by tapping them (🔇, 📜✗).
- **The Matrix Code** decides the model and effort of each connection: searching goes to a Sentinel with low effort and no editing tools (Bash is still subject to Claude Code's normal permissions), researching to an Agent, designing to the Oracle. It scopes each connection and stops full-conversation copies for light tasks.
- **Neo (Fable) always asks your permission:** the red pill.
- **Experience:** Haiku classifies each connection. If a kind of program fails often at a type of task, the next similar one moves up. On the sheet of each program that unplugged, "Was the download useful?" (👍/👎, only once) teaches the Code: a 👎 counts as a failed connection.
- **Matrix power:** your plan quota as a charge bar per window (the 5-hour shift if your plan has one, and the week), green that turns amber under 50 % and red under 20 %, with what is left, when it runs out at the current pace ("runs out Thu 18:00") or when it refills (↻). Plans without a 5-hour window (Ultra) are counted by the week. Over 95 % of the week the Code jacks in only Sentinels and Agents, says so once, and the status line shows ⛔; the week's detail shows where the energy went by project. With several sessions open, "this session spent" is its share of what the quota went up, split by what each one spent. Tap a cell to open the detail: how much you spend per hour, the estimated split between the Architect and each kind of program, and how much the Code saved you. The 🗄️ Archive button opens the history of all sessions.
- **Sounds,** synthesized by the mod itself (nothing from the films): a soft phone ring when the Architect finishes, a sound of its own for each program when it unplugs (a bullet-time sweep for Neo, a spoon on a cup for the Oracle, two earpiece beeps for an Agent, a low mechanical thrum for a Sentinel), and static when something fails.
- **Zoom:** with many agents, the panel switches to a mini version and then to one row per kind of program.

## Commands

- `/operator` opens the panel (`/operador` also works when the session speaks Spanish).
- `/operator sounds` plays all the sounds in order (`sonidos`).
- `/operator accounts` shows Matrix power and the Archive (`cuentas`).
- `/operator net` opens the Network map (`red`, `map`, `mapa`).
- `/operator close` closes the panel (`cerrar`).
- `/operator name <text>` names this session (otherwise it is named after its folder or its first requests) (`nombre <texto>`).
- `/operator language en|es|auto` changes the mod's language (`idioma en|es|auto`).

Subcommands are accepted in both languages.

The panel docks beside the conversation from 110 columns.

## Language / Idioma

The Operator speaks English and Spanish. It follows Claude Code's Language setting (`/config` → Language); if that is empty, the system locale; otherwise English. `/operator language es|en|auto` changes it (auto = follow Claude Code again) and it is remembered between sessions.

## Installation

In the terminal, inside Claude Code:

```
/plugin install operator --marketplace LastrarterotH/the-guild
```

Or in two steps:

```
/plugin marketplace add LastrarterotH/the-guild
/plugin install operator@the-guild
```

From a shell:

```
claude plugin marketplace add LastrarterotH/the-guild
claude plugin install operator@the-guild
```

In the desktop app, where `/plugin` does not work: click + next to the text box, then Plugins, Add marketplace with `LastrarterotH/the-guild`, and then Add plugin.

When adding the marketplace, Claude Code asks `Add marketplace?`: answer `y` and choose the scope.

To update it: `/plugin marketplace update the-guild`. To remove it: `/plugin uninstall operator@the-guild`.

**Upgrading from `guild` (or the older `gremio`):** run `/plugin uninstall guild@the-guild` (or `gremio@the-guild`), then install `operator`. The Archive, the experience and your settings carry over on their own the first time it starts.

The panel works on any system. What touches Terminal (going to a session's tab, marking it with ☎️ and system notices) is only for macOS with Terminal.app or Ghostty; on other systems those features simply do nothing.

## Privacy and permissions

- **Everything stays on your computer.** The Operator keeps its state in Claude Code's local store and connects to no service outside Claude.
- **It uses your Claude account for two small things:** Haiku classifies each connection that is made (it reads its description and brief) and names a session that started in your home folder (it reads its first three requests). What that costs shows in the Archive as "Code".
- **It reads only the current session's conversation** (its file in `~/.claude/projects`), to take its title and first requests. The only other files it reads are the stores of the earlier `guild` and `gremio` plugins, once, to carry your Archive over.
- **The Network is shared only between your sessions** on this computer, through Claude Code's local store: name, folder, state and the last line of each one's log, plus (since 0.29) the brief of its running programs, the subject of messages between sessions and the full paths of the files edited in the last 10 minutes. Nothing leaves the machine.
- **On macOS it runs `osascript`** to switch tabs in Terminal, mark its title and show notifications. The first time macOS asks whether you allow it; if you say no, the rest of the mod carries on the same.
- **The Matrix Code is added to Claude's instructions** to choose the model and effort of each agent, and it can stop a clone of the whole conversation for something light. Turn it off by tapping 📜 in the panel. Separately, jacking in Neo (Fable) always asks your permission, with the Code on or off.

## Development

- Sprites: `node tools/ver-sprites.mjs` paints them as the terminal does into `.vista/sprites.png`. Each figure is drawn with letters in `hooks/sprites-matrix.ts`; each cell (2x2 pixels) allows two colors, counting empty, and a test checks it.
- Portraits: `python3 tools/retratos.py <images>` crops them and writes the resting and fallen variants into `art/`.
- Tests: `claude plugin test .`
- Validation: `claude plugin validate .`
- Sounds: `node tools/sonidos.mjs` regenerates them in `sounds/`.
- Languages: code comments are in Spanish, and every visible text goes through `tr(es, en)` in `hooks/i18n.ts`.
