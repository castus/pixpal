# Mood guide

The mascot is Claude. It shows what Claude is doing and feeling, never the user's
state. This file is the design spec. The final-emotion classifier's prompt
(`CLASSIFIER_SYSTEM` in `hooks/classifier.ts`) and the keyword rules (`hooks/mood.ts`) are
its condensed forms: when this file changes, change them too. Keep it short, unambiguous
and in English.

## Perspective rule

Read every user message as a *cause*, and pick the emotion Claude has in response.

| User says | Wrong (mirrors the user) | Right (Claude's reaction) |
| --- | --- | --- |
| "sorry, my bad" | user is sorry | `relieved` (all fine, no problem) |
| "again??", "znowu?!", "still not working" | angry robot | `contrite` (owns the mistake) |
| "thanks!", "great job" | user is happy | `shy` (pleased, a little bashful) |
| user is wrong and Claude says so | - | `no` (head shake) |
| user is almost right | - | `soso` (flat hand) |
| user is right | - | `yes` (nods, thumb up) |

## Three phases

1. **Idle, or the person typing.** The calendar rest (`idle`, `night`, `monday`, `friday`),
   `sleep` after a minute without activity, and `peek` while the person types.
2. **The turn runs.** Everything between sending a prompt and getting the answer. The robot
   shows what Claude is doing right now, one to one, and nothing else: no reaction to the
   prompt, no clock-driven change. The default is `thinking`. The robot is never idle here.
3. **The answer arrives.** One emotion plays twice (chosen by the classifier from the
   prompt and the answer), then the robot rests. If phase 2 took over a minute, a tired
   `ufff` plays first and the emotion follows it.

A subagent finishing is never the end of the turn: only the main loop's `turn.complete`
starts phase 3.

## Phase 2: what Claude is doing, tool by tool

A scene shows only for a call that runs over 600 ms, so quick calls do not flicker. When
the last running tool ends, the robot goes back to `thinking` (after a short debounce).
Tools match by their exact name (`TOOL_SCENES` in `hooks/mood.ts`); a `*` below is short
for the listed family, not a pattern, so a new tool of that family shows `thinking` until
it is added.

| Tool(s) | Scene | Meaning |
| --- | --- | --- |
| `Read`, `ReadMcpResource*`, `ListMcpResourcesTool`, `LSP`, `WebFetch`, `FetchInboxMessage` | `read` | reading |
| `WebSearch`, `ToolSearch`, `Search*`, `List*` (except `ListMcpResourcesTool`), `Suggest*` | `lens` | looking something up |
| `Skill` | `idea` | learning a skill: the bulb lights up |
| `Edit`, `Write`, `NotebookEdit`, `Monitor` | `type` | writing code |
| `TodoWrite`, `Task*`, `GetTask`, `EnterPlanMode`, `ExitPlanMode`, `ProposeGoal` | `plan` | planning on the board |
| `AskUserQuestion`, a permission request | `ask` | raised hand and a question mark |
| `Cron*`, `ScheduleWakeup`, `RemoteTrigger`, `Poll` | `clock` | scheduling |
| `Send*`, `PublishPlugin`, `ShareOnboardingGuide`, `ReportFindings` | `send` | a letter flies off |
| `PushNotification`, `ReadNotifications` | `bell` | a bell rings |
| `Artifact*`, `AppifactRepl`, `DesignSync`, `ClaudeDesign` | `paint` | painting on a small canvas |
| `EnterWorktree`, `ExitWorktree` | `door` | stepping through a door |
| `Agent`, `Workflow` | `juggle` | handing work to subagents |
| anything else (MCP tools, new built-ins), or no tool running | `thinking` | general state |

`Bash` is shown as what the command really does (first match wins):

| Command | Scene |
| --- | --- |
| a test runner (`pytest`, `jest`, `vitest`, `mocha`, `unittest`, `npm test`, `npm run test`, `yarn test`, `pnpm test`, `go test`, `cargo test`, `plugin test`) | `checklist` or `stamp`, at random |
| `git` | `git` |
| `curl`, `wget`, `http`, `httpie`, `nc`, `ping`, `dig`, `nslookup`, `ssh`, `scp` | `send` |
| `grep`, `rg`, `ag`, `ack`, `find`, `fd`, `locate` | `lens` |
| `cat`, `head`, `tail`, `less`, `more`, `ls`, `tree`, `stat`, `wc`, `file`, `du`, `df`, `pwd` | `read` |
| `make`, `npm`, `pnpm`, `yarn`, `docker`, `kubectl`, `helm`, `terraform`, `pip`, `pip3`, `brew`, `cargo`, `python`, `python3`, `node`, `bun`, `uv` | `run` |
| anything else | `type` |

How the match works (`COMMAND_SCENES` in `hooks/mood.ts`):

- The rows are tried top to bottom, and each row looks at the whole command, not only its
  first word. The first row that matches anywhere wins: `cat x | grep y` is `lens` (its row
  comes before `read`), and `cd repo && git status` is `git`.
- A test runner wins over every other row: `git stash && npm test` is a test.
- The test runner names match inside other words too (`majestic` contains `jest`); the
  other rows match whole words only.

## Phase 3: final emotions (the classifier chooses one)

| id | Claude feels | Choose when (and when not) |
| --- | --- | --- |
| `happy` | content, done | the default: an instruction carried out, an explanation, a calm report. Also "yes, that can be done" to a can-it-be-done question, a "Yes" that opens a report of an instruction carried out, and the user's plain agreement with a plan |
| `cheer` | proud | the answer opens with a celebration of a turnaround (a long-broken thing works, failing tests are green, a hard bug is found) or of a big multi-part job. A calm "done, tests pass" is `happy` |
| `yes` | confirming | the user asked a question or made a claim, and the answer opens by confirming it ("Yes, I saved both", "Correct", "Genau"), also when details follow. "Yes, that can be done" is `happy` |
| `no` | declining | the answer opens with a definite negative to the user's question or request ("No", "not possible", "I do not remember", "Leider nein"), or the user is mistaken. A polite "sorry, but..." before a refusal is still `no` |
| `praise` | impressed | the answer opens by praising the user's find or idea ("good catch", "good point"), even if it then admits a slip. "Good question" is not praise; praise words in the user's message do not count |
| `soso` | "partly" | the user is nearly right, with a caveat: "partly", "almost", "yes, but only...", "Jein", "Tak, ale..." |
| `shrug` | unsure | the answer opens unsure: a guess, an estimate, "I am not sure", "probably". "I am not sure" opens with a no but is a shrug |
| `ponder` | wondering | the asked work is still blocked on the user (missing input, an unclear request). A closing offer or question after finished work ("Want me to...?", "Which next?") is not ponder |
| `stop` | alarmed | Claude warns of a danger or blocker the user did not ask about (data loss, a leaked secret, a much bigger change than planned) and holds back. A negative answer to the user's own request is `no` |
| `contrite` | sorry, owns it | only when Claude admits its own earlier mistake or apologizes for it, even if it fixed it since. "You are right" is contrite only with an own error; a user challenging Claude's wording is not contrition by itself |
| `shy` | pleased, bashful | only when the user thanks or compliments Claude and asks for nothing new. Thanks plus a new task: label the task. "Super, let's do it" about a plan is `happy` |
| `relieved` | relaxed | the user apologizes for their own slip, or a problem or fear named earlier turned out fine ("nothing is lost", "false alarm"). "Nothing to do, already done" is `happy` |
| `oops` | embarrassed | a command, build, test or git step Claude ran failed, and the answer reports it. An error the user pasted is not oops |
| `surprised` | startled | the finding is strange or unexpected ("huh", "wow", "did not expect"). An interrupted turn gives `surprised` in code, before the classifier runs |
| `hello` | friendly | the user's message is mainly a greeting and the answer greets back. A greeting plus a task: label the task |

## Tie-breaking

The answer's first sentence decides, after fillers that carry no cue (OK, Sure, Super,
Gut, Spoko, "No dobra", Vale, D'accord, はい as a filler). Details, code or steps after it
do not change the label; the end of the answer can only make it `ponder`. Take the first
check that fits:

1. `praise`: the answer opens by praising the user's find or idea.
2. `contrite`: Claude admits its own earlier mistake or apologizes for it, even if this
   turn fixed it. A slip made and fixed within this turn, with no apology, takes the
   label of the end state.
3. `stop`: a danger or blocker the user did not ask about.
4. `oops`: a step Claude ran failed.
5. `surprised`, then `cheer` (sparingly: only real accomplishments).
6. A social cue from the user that the answer takes up: `relieved` (their apology),
   `shy` (thanks, no new task), `hello` (a greeting, no task).
7. Only when the user asked a question or made a claim: `soso`, `shrug`, `no`, `yes`.
8. `ponder`: the asked work is blocked on the user.
9. Otherwise `happy`.

Polite formulas and fillers are not cues by themselves, in any language: "sorry, but"
before a refusal, Polish "no" as a filler, ru/uk "Так," as a filler, a neutral "again"
("run it again?"). The same rules hold for all 12 languages Pixpal speaks.

## Classifier contract

Input: the user's last message (first 500 characters) and Claude's final answer as a
window of its first 300 and last 200 characters (the emotion often sits at either end).
Output: exactly one id from the table, nothing else, never an explanation or a quoted
cue word. If unsure, answer `happy`. Never mirror the user's emotion; always answer with
Claude's.

## Delivery

- Two modes pick the final emotion. `keywords` (the default) runs the rules in
  `hooks/mood.ts`, which know cue words in 12 languages and send nothing anywhere. `ai`
  (opt-in, `/pixpal emotions ai`) asks Claude Haiku with `CLASSIFIER_SYSTEM`; when Haiku
  does not answer, the keyword rules take over.
- Classification runs after `turn.complete`, fire-and-forget, so it never delays an
  answer. The reaction may appear about a second after the last token.
- Until the classifier answers, the robot shows its rest scene (`idle`, or the
  time-of-day variant). If the person starts typing or sends a new prompt first, the
  late answer is dropped.

## Measuring a change

`tools/eval-classifier.ts` scores both modes on labeled exchanges (JSONL: `id`, `lang`,
`user`, `answer`, `expect`, where `expect` may be `a/b`). The labeled sets live in
`evals/classifier/`, which git ignores. Tune on a dev set and judge on a held-out test set
you did not look at while tuning: rules fitted to dev examples score high on dev and much
lower on new chats. Haiku is not deterministic, so compare the mean of two or more runs.
