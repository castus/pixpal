# Pixpal

Pixpal is a Claude Code mod: a pixel-art character in the band above the prompt. While Claude works it acts out the tool in use; when the answer arrives it shows one of 15 emotions. It has no runtime dependencies and no build step: Claude Code loads the TypeScript in `hooks/` directly.

## Commands

```bash
claude plugin test .       # the tests (hooks/*.test.ts); also `npm test`
claude plugin validate .   # manifest checks; also `npm run validate`
npm run gallery -- --still # every scene in the terminal (see the header of tools/gallery.ts for flags)
npm run render-svg         # redraws the README SVGs in docs/ (--logo for the logo)
npm run eval -- --data x.jsonl   # scores the emotion classifier (needs a local dataset, see MOOD_GUIDE.md)
```

The tools run on plain Node 22+ with `--experimental-strip-types`, so imports between `.ts` files keep their `.ts` extension.

## Where things are

| File | What it holds |
| --- | --- |
| `hooks/register.tsx` | the mod's entry: state atoms, slash commands, event handlers, the classifier call |
| `hooks/client/pixpal.tsx` | the component drawn in the band |
| `hooks/mood.ts` | keyword rules: tool -> work scene, answer -> emotion |
| `hooks/classifier.ts` | the Haiku prompt and the parser of its answer |
| `hooks/scenes.ts` | scene animations (which frames, for how long) |
| `hooks/sprites.ts` | pixel art, skins, themes, layout of the band |
| `hooks/sayings.ts` | speech bubbles in 12 languages, translation of the rest |
| `hooks/golden.ts` | recorded frames the tests compare the robot against |
| `hooks/fixtures.ts` | the few labelled exchanges behind `/pixpal test` |
| `tools/` | developer scripts (gallery, README SVGs, classifier eval) |
| `MOOD_GUIDE.md` | the design: what Pixpal shows and when. Read it before changing a rule |

`.claude-plugin/types/` is written by the engine on every load. Never edit or commit it.

## Conventions

- Commit messages are `feat:`, `fix:` or `docs:` plus a lowercase summary, as in `git log`.
- Comments explain why, not what. Match the surrounding density and idiom.
- User-facing text (README, bubbles, help) is plain and short. No marketing words.
- A change to a rule in `mood.ts` or the classifier prompt updates `MOOD_GUIDE.md` in the same commit, and adds or changes a test.
- A change to sprites or scenes that moves the robot's pixels needs the golden frames in `hooks/golden.ts` updated on purpose, not to make the test pass.
- Every skin must draw every scene, and every scene needs a bubble line in every built-in language (the tests check both).

## Releasing

The version lives in three places: `.claude-plugin/plugin.json`, `package.json` and `PIXPAL_VERSION` in `hooks/register.tsx` (a module cannot read the JSON). Bump all three, move the `[Unreleased]` notes in `CHANGELOG.md` under the new version, commit, then `claude plugin tag .`.

## Privacy rules

Pixpal makes no network calls of its own. The only text that leaves the machine goes through Claude Code's own model client, and only when the user turns on `/pixpal emotions ai` or picks a language without built-in lines. Keep it so; if a change sends more, update the Privacy section of the README.

Never commit classifier eval data (`evals/`), real conversations or anything from `.claude/`; they are ignored on purpose.
