# The Guild · Clawd's Guild

**English** · [Español](README.es.md)

A mod for Claude Code. Clawd is the **Grand Master** of the guild (your main session) and every agent it sends is an **adventurer** whose class depends on the model:

| Class | Model | Outfit |
|---|---|---|
| Grand Master (Clawd) | the main session | five-point crown with pearls, ruby and sapphires |
| Archmage | Fable | tall violet hat with stars and a gold ribbon, and a white beard |
| Mage | Opus | blue hat with a bent tip, a star and a golden ribbon |
| Bard | Sonnet | green cap with a golden buckle and a red feather |
| Rogue | Haiku | gray hood framing the face and a teal scarf over the mouth |

## What it does

- **Live panel** with animated pixel art: Clawd, the adventurers on a quest with what each one is doing and how long they have been at it, the tavern with those who came back, and a short chronicle (tap it to open it whole).
- **Each adventurer's sheet:** their quest, what they are doing or the loot they brought, the time, the actions and what they spent. The technical side (who sent them, model, effort, permissions, tokens, full assignment) lives under "▸ More".
- **Resumed agents:** if you write again to an adventurer who already came back, they head out again with their name and their story, in another round.
- **🏰 The realm:** with several sessions open, one line shows what each is up to: ❓ needs you (a question, a plan or a permission), ⏳ working, ✅ finished a while ago, 💤 quiet. Tap it for one row per session (yours marked with ●), the ones that need you first: how long ago, ♥ HP, 🪙 its share of the shift, and 🧭 on a quest or 💰 unread loot; tap a row to see what it asks or the last thing that happened, and its folder. The session that asks you something is flagged at the top of the panel and in every status line. Each session is named after its Terminal tab (the title Claude Code gives it); with `/guild name` you set whatever you like.
- **🚪 Go to session:** in the realm, tapping a session shows "🚪 Go to session", and the ❓ notice at the top is tappable too: Terminal jumps to that session's tab. The first time, macOS asks whether the guild may control Terminal.
- **🔔 Who rang and where:** when Clawd finishes, its Terminal tab is marked ("🔔 Recipe box") until the session starts working again; if the turn lasted more than 20 s, a silent macOS notification arrives as well ("Guild · Recipe box: Clawd finished"). In the panel of your other sessions, what rang and where shows at the top for two minutes ("🔔 Recipe box · Clawd finished", "💰 Logbook · Rogue 2 came back with the loot"); tap it to go to that tab. The sound still tells you who: the melody is Clawd and each class has its own.
- **🔔 macOS notice on a question:** if a session has been waiting for your answer (a question, a plan or a permission) for more than a minute, you get a silent system notification, once per question.
- **💬 Speech bubble:** the adventurer who comes back shows the first sentence of their loot for a few seconds.
- **📜 Scroll:** on the adventurer's sheet, opens their full loot, formatted, in a separate panel, with "📋 Copy".
- **🪙 Spending by project:** the Ledger shows each project's share of today's and this week's spending.
- **Resume with memory:** at the start of each turn, Clawd knows which adventurers came back recently and can be resumed with SendMessage; if the new task follows what they did, it resumes them instead of sending a new one, and they keep what they learned.
- **Today's roster:** if a Rogue is free in the tavern, that same one heads out (their name, their epithet and their history of the day); only if all are on quests does a new one join, who also stays. In the tavern each adventurer appears once, faded while resting. Each quest is still a new agent: what continues is the adventurer.
- **End of the day:** at midnight everyone goes home: the tavern empties, numbering goes back to 1 and the chronicle tells it ("🌙 End of the day: 9 quests, 8 with loot"). The Ledger keeps the history.
- **Epithets:** each adventurer gets an epithet from their quest ("Rogue 2, the Tracker", "Bard 1, the Healer"), without spending any model.
- **The return:** the one who comes back stays a few seconds in the field with their 💰 (or 🩹 if they came back wounded) before entering the tavern.
- **The nap:** when the conversation fills up, Claude Code summarizes it by itself (or you do with `/compact`). Meanwhile Clawd sleeps (closed eyes and a "Z", "😴 taking a nap…", and 😴 in the realm) and on waking the chronicle says how much HP came back ("🌅 Clawd woke from its nap: HP went from 27% to 92%").
- **Gentle warnings, once:** when Clawd is low on HP (under 20% of context left) it gets tired (drooping eyelids and a little drop) and suggests `/compact`; if at the current pace the shift purse will not last, it says so once per window, even with several sessions open.
- **Status line:** with the panel closed you see "♥ 68 · 🪙 72 · 🧭 2", and "📜✗ no Code" if you turned it off.
- **It remembers what you turn off:** sound and the Code stay as you left them in the next session.
- **📋 Copy loot:** on each adventurer's sheet, copies their report to the clipboard.
- **💤 Idle:** if an adventurer has gone more than 5 minutes with no actions or tools running, it shows "idle for N min".
- **Everything is tappable:** chronicle lines open the adventurer's sheet; "+N more" opens the whole tavern.
- **The Code explains what it learns:** when a class fails often and the Code starts sending the next one up, the chronicle says so (and also when it recovers).
- **Several sessions at once:** the Ledger counts the quota only once even with several sessions open, and writes are queued.
- **The Grand Master's sheet:** their HP is the context they have left (♥, each one 10%; tap it to see how many tokens it holds), the current turn with its time and actions, and **Today**: the day's quests, those that came back with loot and those you have not read (tap it to open the first unread). Sound 🔊 and the Code 📜 are icons next to the title and are turned off by tapping them (🔇, 📜✗).
- **The Guild Code** decides the model and effort of each quest: searching goes to a Rogue with low effort and no editing tools (Bash is still subject to Claude Code's normal permissions), researching to a Bard, designing to a Mage. It scopes each quest and stops full-conversation copies for light tasks.
- **The Archmage (Fable) always asks your permission.**
- **Experience:** Haiku classifies each quest. If a class fails often at a type of quest, the next similar one moves up a class. On the sheet of each adventurer who came back, "Was the loot useful?" (👍/👎, only once) teaches the Code: a 👎 counts as a failed quest.
- **Guild treasury:** your plan quota in 🪙 (each one, 10%), one line for the 5-hour shift and another for the week, with what is left and when it refills (↻). With several sessions open, "this session spent" is its share of what the quota went up, split by what each one spent. Tap a purse to open the detail: how much you spend per hour, the estimated split between Clawd and each class, and how much the Code saved you. The 📕 Ledger button opens the history of all sessions.
- **Sounds:** a soft marimba melody when Clawd finishes, a sound of its own for each class on return, and a sad trumpet when something fails.
- **Zoom:** with many agents, the panel switches to a mini version and then to one row per class.

## Commands

- `/guild` opens the panel (`/gremio` also works).
- `/guild sounds` plays all the sounds in order (`sonidos`).
- `/guild accounts` shows the guild's treasury and ledger (`cuentas`).
- `/guild close` closes the panel (`cerrar`).
- `/guild name <text>` names this session in the realm (otherwise it is named after its folder or its first requests) (`nombre <texto>`).
- `/guild language en|es|auto` changes the guild's language (`idioma en|es|auto`).

Subcommands are accepted in both languages.

The panel docks beside the conversation from 110 columns.

## Language / Idioma

The guild speaks English and Spanish. It follows Claude Code's Language setting (`/config` → Language); if that is empty, the system locale; otherwise English. `/guild language es|en|auto` changes it (auto = follow Claude Code again) and it is remembered between sessions.

## Installation

In the terminal, inside Claude Code:

```
/plugin marketplace add LastrarterotH/the-guild
/plugin install guild@the-guild
```

From a shell:

```
claude plugin marketplace add LastrarterotH/the-guild
claude plugin install guild@the-guild
```

In the desktop app, where `/plugin` does not work: click + next to the text box, then Plugins, Add marketplace with `LastrarterotH/the-guild`, and then Add plugin.

When adding the marketplace, Claude Code asks `Add marketplace?`: answer `y` and choose the scope.

To update it: `/plugin marketplace update the-guild`. To remove it: `/plugin uninstall guild@the-guild`.

**Upgrading from the old `gremio` plugin:** run `/plugin uninstall gremio@the-guild`, then install `guild`. The ledger and settings carry over on their own.

The panel works on any system. What touches Terminal (going to a session's tab, marking it with 🔔 and system notices) is only for macOS with Terminal.app; on other systems those features simply do nothing.

## Privacy and permissions

- **Everything stays on your computer.** The guild keeps its state in Claude Code's local store and connects to no service outside Claude.
- **It uses your Claude account for two small things:** Haiku classifies each quest that is sent (it reads its description and assignment) and names a session that started in your home folder (it reads its first three requests). What that costs shows in the Ledger as "Code".
- **It reads only the current session's conversation** (its file in `~/.claude/projects`), to take its title and first requests. The only other file it reads is the old `gremio` plugin's store, once, to carry your ledger over.
- **The realm is shared only between your sessions** on this computer: name, folder, state and the last line of each one's chronicle.
- **On macOS it runs `osascript`** to switch tabs in Terminal, mark its title and show notifications. The first time macOS asks whether you allow it; if you say no, the rest of the guild carries on the same.
- **The Guild Code is added to Claude's instructions** to choose the model and effort of each agent, and it can stop a clone of the whole conversation for something light. Turn it off by tapping 📜 in the panel. Separately, sending the Archmage (Fable) always asks your permission, with the Code on or off.

## Development

- Sprites: `node tools/ver-sprites.mjs` paints them as the terminal does into `.vista/sprites.png`. Each outfit is drawn with letters in `hooks/sprites.ts`; each cell (2x2 pixels) allows two colors, counting empty, and a test checks it.
- Tests: `claude plugin test .`
- Validation: `claude plugin validate .`
- Sounds: `node tools/sonidos.mjs` regenerates them in `sounds/`.
- Languages: code comments are in Spanish, and every visible text goes through `tr(es, en)` in `hooks/i18n.ts`.
