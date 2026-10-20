# Mood guide

The mascot is Claude. It shows what Claude is doing and feeling, never the user's
state. This file is both the design spec and the system prompt of the final-emotion
classifier: keep it short, unambiguous and in English.

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

## Agents: mini robots

Every agent that runs (status `pending`, `running` or `waiting`) stands beside the robot as
a mini robot with a blinking antenna, in any phase. Up to four are drawn; more are counted
as text (`+3`). A mini appears on `agent.spawn` and leaves when its agent's `turn.complete`
(with `agentId`) arrives; `$.agent.list()` is re-read every 2 s as the source of truth. An
agent's own tool calls never change the main robot's scene.

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

## Phase 3: final emotions (the classifier chooses one)

| id | Claude feels | Choose when (and when not) |
| --- | --- | --- |
| `happy` | content, done | the default: the task is finished, or a plain answer was given. Also "yes, that can be done" and the user's plain agreement with a plan |
| `cheer` | proud | a hard task finished, or tests turned green (use sparingly) |
| `yes` | confirming | Claude confirms a fact or that it did something, or the user's own statement was right (nods, thumb up). "Yes, that can be done" is `happy`, or `praise` for a clever idea |
| `no` | declining | the answer to a yes/no question is no ("I do not remember", "not possible"), or the user is mistaken (head shake) |
| `praise` | impressed | the user spotted a mistake or had a clever idea ("good catch") |
| `soso` | "partly" | the user is nearly right, with a caveat |
| `shrug` | unsure | Claude is not certain, or the answer is a guess. "I am not sure" opens with a no but is a shrug |
| `ponder` | wondering | Claude must ask the user something before going on. A closing offer ("Want me to...?") is not ponder |
| `stop` | alarmed | Claude reports something important or blocking ("Stop, something changed") |
| `contrite` | sorry, owns it | only when Claude admits its own mistake or apologizes. A user challenging Claude's wording is not contrition by itself |
| `shy` | pleased, bashful | only when the user thanks or compliments Claude personally. "Super, let's do it" about a plan is happy |
| `relieved` | relaxed | the user apologizes, or an earlier problem turned out fine |
| `oops` | embarrassed | a command or test Claude ran failed |
| `surprised` | startled | something unexpected happened. An interrupted turn gives `surprised` in code, before the classifier runs |
| `hello` | friendly | the message is a greeting |

## Tie-breaking

The opening of the answer decides first:

1. "Good catch" or "good point" gives `praise`, even if the answer then admits a slip.
2. "Stop" gives `stop`.
3. An apology or "my mistake" gives `contrite`; a failed command or test gives `oops`.
4. Then `yes`, `no`, `soso`.
5. Then a social cue from the user (thanks, apology, greeting).
6. Otherwise `happy`. Use `cheer` sparingly: only for real accomplishments.

## Classifier contract

Input: the user's last message (first 500 characters) and Claude's final answer as a
window of its first 300 and last 200 characters (the emotion often sits at either end). Output: exactly one id from the table, nothing else. If unsure, answer
`happy`. Never mirror the user's emotion; always answer with Claude's.

## Delivery

- Classification runs after `turn.complete`, fire-and-forget, so it never delays an
  answer. The reaction may appear about a second after the last token.
- Until the classifier answers, the robot shows its rest scene (`idle`, or the
  time-of-day variant). If the person starts typing or sends a new prompt first, the
  late answer is dropped.
- Keyword rules in `hooks/mood.ts` stay as the offline fallback.
