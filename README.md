<h1 align="center"><img src="docs/pixpal-logo.svg" alt="pixpal" width="420"></h1>

<p align="center"><em>A pixel-art friend above your prompt that shows what Claude is doing, and how it feels about it.</em></p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8fa3b8?style=flat-square" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Claude%20Code-2.1.299%2B-8fa3b8?style=flat-square" alt="Claude Code 2.1.299 or later">
  <img src="https://img.shields.io/badge/characters-5-8fa3b8?style=flat-square" alt="5 characters">
  <img src="https://img.shields.io/badge/languages-any-8fa3b8?style=flat-square" alt="Any language">
</p>

<p align="center">
  <a href="#install"><strong>Install</strong></a> ·
  <a href="#characters">Characters</a> ·
  <a href="#what-it-shows">What it shows</a> ·
  <a href="#settings">Settings</a> ·
  <a href="#privacy">Privacy</a> ·
  <a href="#contributing">Contributing</a>
</p>

<p align="center"><img src="docs/pixpal-row.svg" alt="Five Pixpal characters: a robot cheering, a cat waving, Claude nodding yes, an owl blushing and a ghost surprised, each with a speech bubble" width="100%"></p>

## TL;DR

- Pixpal lives in the band above the prompt. While Claude works, it acts out the tool in use: it reads a book, searches with a lens, types, runs tests, sends a letter.
- When the answer arrives, it shows how Claude feels about it: happy, proud, sorry, unsure, surprised: one of 15 emotions, picked by keyword rules, or by Claude Haiku if you let it.
- Five characters (robot, cat, Claude, owl, ghost), a dark and a light look, and speech bubbles in any language.
- Each running subagent stands beside it as a mini robot.

## Install

Requires Claude Code **2.1.299** or later.

```bash
/plugin marketplace add castus/pixpal
/plugin install pixpal@pixpal
```

Then run `/pixpal init` to pick a character, a look, a language and how emotions are picked.

To update, run this and then `/reload` in every open session:

```bash
claude plugin marketplace update pixpal && \
claude plugin update pixpal@pixpal
```

To uninstall:

```bash
claude plugin uninstall pixpal@pixpal
```

## Characters

| | Character | Notes |
| --- | --- | --- |
| 🤖 | `robot` | the original: antenna, face screen, wheels |
| 🐱 | `cat` | ginger fur, whiskers, a tail |
| 🟧 | `claude` | a square terracotta block on four short legs |
| 🦉 | `owl` | big eye rings, a beak, ear tufts |
| 👻 | `ghost` | see-through: the panel shows through its body |

All five share one skeleton, so every scene and every emotion works for each of them. Pick one with `/pixpal skin <name>`.

## What it shows

Pixpal follows a turn in three phases.

1. **Between turns** it rests. While you type, it peeks over a fence at your prompt. After a minute of quiet it goes to sleep.
2. **While Claude works** it shows the tool in use, one to one: `Read` is a book, `Grep` a lens, `Edit` a keyboard, a test run a checklist, `git` its own scene, a subagent a juggling act. Quick calls (under 0.6 s) do not flicker by.
3. **When the answer arrives** it plays one emotion twice, chosen from your message and Claude's answer (by keyword rules, or by Claude Haiku with `/pixpal emotions ai`), from Claude's side: if you say sorry, it is relieved; if you say "again??", it is sorry. After a turn of over a minute it lets out a tired *phew* first.
4. **Agents in the background** each running subagent stands beside it as a mini robot (up to four). More than that shows as a `+N` count next to the last one; when an agent finishes, its mini leaves.

A speech bubble names each emotion ("Yay!", "Sort of", "No worries") and each kind of work ("Reading…", "Testing…"), typed out letter by letter.

## Settings

| Command | What it does |
| --- | --- |
| `/pixpal init` | set everything up |
| `/pixpal skin [robot\|cat\|claude\|owl\|ghost]` | who Pixpal is |
| `/pixpal theme [auto\|dark\|light]` | the look; `auto` follows your system's light or dark mode |
| `/pixpal language <name> \| auto` | the bubbles' language: any language, e.g. `french`, `japanese`; `auto` follows your prompt in Polish, English, German, Spanish, French, Italian, Portuguese, Ukrainian, Russian, Japanese, Chinese or Korean |
| `/pixpal bubbles [on\|off]` | speech bubbles on or off |
| `/pixpal emotions [ai\|keywords]` | who picks the emotion: keyword rules (default, sends nothing) or Claude Haiku (see Privacy) |
| `/pixpal help` | all of the above, with the current values |

Give a setting without a value (`/pixpal language`) to pick it from a list: ↑↓ move, Enter picks, Esc closes. In the language list, the last row takes any language you type.

Each conversation keeps its own choices, so a resumed session comes back with the same character. A new session starts from your latest choices.

## Privacy

Pixpal runs inside Claude Code and makes no network calls of its own. By default nothing you write leaves your machine because of it: keyword rules pick the emotions.

Two features use Claude Code's own model access, only when you turn them on. They go through the same client, account and provider as your conversation (Anthropic, Amazon Bedrock or Google Vertex, under the same terms):

- **Emotions, with `/pixpal emotions ai`:** after each answer, the first 500 characters of your message and the opening and closing of Claude's answer (300 + 200 characters when it is long) go to Claude Haiku, which names one emotion. About 900 tokens per answer. If Haiku is blocked or does not answer, the keyword rules take over. Aborted or empty turns never call the model.
- **Languages, with `/pixpal language <name>`:** the first time you choose a language without built-in lines, the built-in English bubble lines (not your conversation) are translated once by Claude Haiku and kept on your machine. `auto` and the twelve built-in languages send nothing.

On macOS, `theme auto` runs `defaults read -g AppleInterfaceStyle` once a minute to read your system's appearance.

## Limitations

- **A short terminal cuts Pixpal.** Pixpal draws in the band above the prompt, and Claude Code decides how many rows the band gets. In fullscreen, the band shares the bottom slot with the tasks list and the panes of other mods, and that slot takes at most half of the terminal's height. When there are fewer rows than the picture needs, Pixpal drops the least important rows first (wheels, antenna, arms) and keeps the eyes and the mouth for as long as it can. Make the window taller or close other panes to see all of it.
- **Pixpal hides during a survey.** When Claude Code asks how it is doing (the 1–3 rating), the survey takes the band. Pixpal steps aside and comes back when the survey closes.
- **No band in the VS Code extension.** Claude Code draws the band only in the terminal and the desktop app, so Pixpal does not show in the VS Code extension.

## Contributing

Pull requests are very welcome. If something breaks or feels off, please [open an issue](https://github.com/castus/pixpal/issues).

`MOOD_GUIDE.md` is the design of what Pixpal shows and when.

## License

[MIT](LICENSE).

<sub>Pixpal is a fan-made project, not affiliated with or endorsed by Anthropic. Claude is a trademark of Anthropic.</sub>
