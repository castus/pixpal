# Contributing to Pixpal

Thanks for helping. Pull requests are welcome, big or small.

## Set up

You need Claude Code 2.1.299 or later and Node 22+. There is nothing to install.

```bash
git clone https://github.com/castus/pixpal
cd pixpal
claude plugin test .
```

To try your changes live, load the folder as a plugin (`claude --plugin-dir .`), then `/reload` after each edit. `npm run gallery` shows every scene without starting a session.

## Before you open a PR

1. `claude plugin test .` and `claude plugin validate .` pass.
2. A rule or behaviour change comes with a test, and with an update to `MOOD_GUIDE.md` if it changes what Pixpal shows.
3. The commit message starts with `feat:`, `fix:` or `docs:`.
4. If you changed how it looks, add a `npm run gallery -- --still` capture or a screenshot to the PR.

## Common additions

- **A new emotion or work scene:** add the rule in `hooks/mood.ts`, the animation in `hooks/scenes.ts`, a bubble line in every language in `hooks/sayings.ts`, and describe it in `MOOD_GUIDE.md`.
- **A new character (skin):** add it to `SKINS` in `hooks/sprites.ts`. It must draw every scene; the tests fail until it does. Then add it to the README's table and to `CAST` in `tools/render-svg.ts` if you want it in the banner.
- **A new built-in language:** add it to `LANGS` and give it a full set of lines in `hooks/sayings.ts`, plus keyword rules in `hooks/mood.ts` if the language needs them.

## Reporting a bug

Open an issue with the template. Paste the block that `/pixpal report` prints (versions and settings, never your messages) and name your terminal.

## Conduct

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
