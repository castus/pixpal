import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import { FIXTURES } from './fixtures.ts'
import { buildClassifierPrompt, CLASSIFIER_SYSTEM, parseEmotion } from './classifier.ts'
import { draftAfter, restForDate, sceneForExchange, sceneForTool } from './mood.ts'
import { durationOfScene, isOnce, SCENES } from './scenes.ts'
import { BUBBLE_W, bubbleWidthOf, buildTranslatePrompt, builtInBook, LANG_LABELS, LANGS, langOf, parseTranslation, TRANSLATE_SYSTEM, type Lang } from './sayings.ts'
import { bandWidth, SKINS, systemThemeOf, type SkinId } from './sprites.ts'

const scene = atom({ plugin: 'pixpal', key: 'scene' } as const, 'idle')
const seq = atom({ plugin: 'pixpal', key: 'seq' } as const, 0)
const rest = atom({ plugin: 'pixpal', key: 'rest' } as const, 'idle')
const demo = atom({ plugin: 'pixpal', key: 'demo' } as const, false)
// Shows the id of the scene that is playing under the robot.
const debug = atom({ plugin: 'pixpal', key: 'debug' } as const, false)
// Who picked the last final emotion: 'ai' (the small model) or 'kw' (keyword rules).
const source = atom({ plugin: 'pixpal', key: 'source' } as const, '')
// The reaction to an answer that is still on its way (classifier call, ufff timer). The
// module reloads at the end of any turn that edited its files, which would kill that work;
// this value is held by the host and survives, and session.start resumes it.
const pending = atom({ plugin: 'pixpal', key: 'pending' } as const, null)
// Lets a small model pick the final emotion; off falls back to keyword rules.
// Off by default: with it on, a short piece of each exchange goes to Claude Haiku (on the
// person's own Claude Code account) to pick the emotion; off, keyword rules pick it.
const smart = atom({ plugin: 'pixpal', key: 'smart' } as const, false)
// How many agents run now; each one stands beside the robot as a mini robot.
const agents = atom({ plugin: 'pixpal', key: 'agents' } as const, 0)
// A workflow's agents, which $.agent.list() leaves out: agentId -> when it was last heard
// from (its spawn or a tool call). Its turn.complete takes it off.
const workflowAgents = atom({ plugin: 'pixpal', key: 'workflowAgents' } as const, {} as Record<string, number>)
// The person's language, from their last prompt; emotions speak it in a bubble.
const lang = atom({ plugin: 'pixpal', key: 'lang' } as const, 'en' as Lang)
// Whether the robot speaks in bubbles at all (emotions and work); /pixpal bubbles toggles it.
const bubbles = atom({ plugin: 'pixpal', key: 'bubbles' } as const, true)
// Whether Pixpal shows in the band at all; hidden, it leaves the band to the other mods.
const visible = atom({ plugin: 'pixpal', key: 'visible' } as const, true)
// The robot's look: 'auto' (default, follows the system's appearance), 'dark' or 'light';
// /pixpal theme sets it. systemTheme is the system's appearance, re-read on a clock.
const theme = atom({ plugin: 'pixpal', key: 'theme' } as const, 'auto' as 'auto' | 'dark' | 'light')
const systemTheme = atom({ plugin: 'pixpal', key: 'systemTheme' } as const, 'dark' as 'dark' | 'light')
// The language the robot speaks: 'auto' (a built-in language, after the person's prompt) or
// any language by name; phrasebook holds its lines (null for auto).
const language = atom({ plugin: 'pixpal', key: 'language' } as const, 'auto')
const phrasebook = atom({ plugin: 'pixpal', key: 'phrasebook' } as const, null as Record<string, string> | null)
// Who the robot is drawn as; /pixpal skin sets it.
const skin = atom({ plugin: 'pixpal', key: 'skin' } as const, 'robot' as SkinId)
// What the settings picker pane lists: a setting given without a value opens it.
type Picker = { setting: string; options: Array<{ value: string; label: string }>; current: string; other?: string }
const picker = atom({ plugin: 'pixpal', key: 'picker' } as const, null as Picker | null)
// The first of the picker's rows in view; it follows the focus.
const pickerTop = atom({ plugin: 'pixpal', key: 'pickerTop' } as const, 0)
// The picker slot that has the focus (`slot:<k>` or `other`), so a move knows its direction.
const pickerFocus = atom({ plugin: 'pixpal', key: 'pickerFocus' } as const, null as string | null)

const DEMO_MS = 6000
// How often the system's light or dark appearance is re-read for the 'auto' theme.
const THEME_MS = 60_000
// The agent count is also re-read on this clock, in case an event was missed.
const AGENTS_MS = 2000
// A finishing agent may still be listed as running for a moment after its last event.
const AGENT_SETTLE_MS = 300
const ACTIVE_AGENT = new Set(['pending', 'running', 'waiting'])
// A workflow agent not heard from for this long is taken as gone (its end was missed).
const WORKFLOW_AGENT_STALE_MS = 30 * 60_000
const WATCH_MS = 5000
const SLEEP_AFTER_MS = 60_000
const CLASSIFIER_MODEL = 'haiku'
const CLASSIFIER_TIMEOUT_MS = 8000
// A turn longer than this ends with a tired "ufff" before the final emotion.
const TIRED_AFTER_MS = 60_000
// A tool scene shows only for calls that run longer than this, so quick calls do not flicker.
const TOOL_SCENE_DELAY_MS = 600
const TOOL_END_DEBOUNCE_MS = 350
// A reaction that a reload cut short is resumed only if it is this fresh.
const RESUME_WITHIN_MS = 30_000
// Typing counts as stopped after this many quiet ticks of TYPING_TICK_MS (about 12 s).
const TYPING_TICK_MS = 500
const TYPING_QUIET_TICKS = 24

type Ctx = Parameters<typeof read>[0]

// The robot's lines in `name`: built in, from the store, or translated once by the small model.
const phrasebookFor = async ($: Ctx, name: string): Promise<Record<string, string> | string> => {
  const kept = builtInBook(name) ?? ((await $.store.get(PHRASEBOOK_KEY(name))) as Record<string, string> | undefined)

  if (kept) {
    return kept
  }

  const reply = await $.model
    .complete({ model: CLASSIFIER_MODEL, system: TRANSLATE_SYSTEM, prompt: buildTranslatePrompt(name), maxTokens: 1500, timeoutMs: TRANSLATE_TIMEOUT_MS })
    .catch(error => ({ isAnswered: false as const, reason: String(error) }))
  const book = reply.isAnswered ? parseTranslation(reply.text) : undefined

  if (!book) {
    return reply.isAnswered ? 'the model did not answer with a list of lines' : `the model did not answer (${reply.reason})`
  }

  await $.store.set(PHRASEBOOK_KEY(name), book)

  return book
}

const THEMES = ['auto', 'dark', 'light'] as const

// The person's choices live in the store (a file), so they outlast the process: the state
// atoms only live as long as one Claude Code process, and a resumed session is a new one.
// Each session keeps its own choices (SESSIONS_KEY, by session id, so `--resume` brings
// them back); the latest choices (SETTINGS_KEY) are where a new session starts.
const SETTINGS_KEY = 'pixpal.settings'
const SESSIONS_KEY = 'pixpal.sessions'
// How many sessions' choices are kept; the oldest go first.
const SESSIONS_KEPT = 200
type Settings = { theme?: string; skin?: string; bubbles?: boolean; visible?: boolean; language?: string; emotions?: 'ai' | 'keywords' }

const saveSetting = async ($: Ctx, patch: Settings) => {
  const latest = ((await $.store.get(SETTINGS_KEY)) as Settings | undefined) ?? {}
  await $.store.set(SETTINGS_KEY, { ...latest, ...patch })

  const id = await $.session.id()
  const sessions = ((await $.store.get(SESSIONS_KEY)) as Record<string, Settings> | undefined) ?? {}
  const { [id]: mine = {}, ...others } = sessions
  const kept = Object.entries(others).slice(-(SESSIONS_KEPT - 1))
  // the changed session moves to the end, so the oldest are the ones dropped
  await $.store.set(SESSIONS_KEY, { ...Object.fromEntries(kept), [id]: { ...latest, ...mine, ...patch } })
}

// At session start: this session's choices (or the latest, for a new session) back into
// the atoms; anything unknown is skipped.
const loadSettings = async ($: Ctx) => {
  const sessions = ((await $.store.get(SESSIONS_KEY)) as Record<string, Settings> | undefined) ?? {}
  const saved = sessions[await $.session.id()] ?? ((await $.store.get(SETTINGS_KEY)) as Settings | undefined) ?? {}
  const chosenTheme = THEMES.find(option => option === saved.theme)
  const chosenSkin = (Object.keys(SKINS) as SkinId[]).find(option => option === saved.skin)

  if (chosenTheme) {
    await update($, theme, () => chosenTheme)
  }

  if (chosenSkin) {
    await update($, skin, () => chosenSkin)
  }

  if (typeof saved.bubbles === 'boolean') {
    await update($, bubbles, () => saved.bubbles!)
  }

  if (typeof saved.visible === 'boolean') {
    await update($, visible, () => saved.visible!)
  }

  if (saved.emotions === 'ai' || saved.emotions === 'keywords') {
    await update($, smart, () => saved.emotions === 'ai')
  }

  if (typeof saved.language === 'string' && saved.language) {
    await update($, language, () => saved.language!)
  }
}

// Who picks the final emotion: Claude Haiku ('ai', on the person's account) or keyword
// rules ('keywords', nothing leaves the machine); keeps the choice.
const setEmotions = async ($: Ctx, mode: 'ai' | 'keywords') => {
  await update($, smart, () => mode === 'ai')
  await saveSetting($, { emotions: mode })

  return mode === 'ai'
    ? 'Pixpal emotions: ai. After each answer, a short piece of the exchange goes to Claude Haiku on your Claude Code account to pick the emotion.'
    : 'Pixpal emotions: keywords. Keyword rules pick the emotion; nothing is sent anywhere.'
}

// Sets the bubbles on or off and keeps the choice.
const setBubbles = async ($: Ctx, isOn: boolean) => {
  await update($, bubbles, () => isOn)
  await saveSetting($, { bubbles: isOn })

  return `Pixpal speech bubbles ${isOn ? 'on' : 'off'}.`
}

// Shows or hides Pixpal in the band and keeps the choice.
const setVisible = async ($: Ctx, isShown: boolean) => {
  await update($, visible, () => isShown)
  await saveSetting($, { visible: isShown })

  return isShown ? 'Pixpal is back above the prompt.' : 'Pixpal is hidden. Bring it back with /pixpal show.'
}

// The setters behind /pixpal language, theme, skin and init; each says what it did.
const setLanguage = async ($: Ctx, name: string): Promise<string> => {
  if (name.toLowerCase() === 'auto') {
    await update($, language, () => 'auto')
    await update($, phrasebook, () => null)
    await saveSetting($, { language: 'auto' })

    return 'Pixpal speaks the language of your prompt again.'
  }

  const book = await phrasebookFor($, name)

  if (typeof book === 'string') {
    return `Could not get ${name}: ${book}. The language stays ${await read($, language)}.`
  }

  await update($, language, () => name)
  await update($, phrasebook, () => book)
  await saveSetting($, { language: name })

  return `Pixpal speaks ${name} now: ${book.happy}, ${book.thinking}, ${book.soso}.`
}

const setTheme = async ($: Ctx, next: (typeof THEMES)[number]): Promise<string> => {
  await update($, theme, () => next)
  await saveSetting($, { theme: next })

  if (next === 'auto') {
    await syncTheme($)

    return `Pixpal theme: auto (the system is ${await read($, systemTheme)} now).`
  }

  return `Pixpal theme: ${next}.`
}

const setSkin = async ($: Ctx, next: SkinId): Promise<string> => {
  await update($, skin, () => next)
  await saveSetting($, { skin: next })

  return `Pixpal skin: ${next} (all: ${Object.keys(SKINS).join(', ')}).`
}

const PICKER = 'pixpal-picker'
// The picker shows PICKER_VISIBLE options at a time; the pane wants room for them, the
// heading, the field for a language of the person's own, the hints, and the gaps between.
const PICKER_VISIBLE = 5
const PICKER_ROWS = PICKER_VISIBLE + 6
const PICKER_ACCENT = '#d97757'
const PICKER_QUESTIONS: Record<string, string> = {
  language: 'Which language should Pixpal speak?',
  theme: 'Which look should the band have?',
  skin: 'Who should Pixpal be?',
  bubbles: 'Should Pixpal speak in bubbles?',
  visible: 'Should Pixpal show above the prompt?',
  emotions: 'Who picks the emotion after each answer?',
}

// Which way a move from `from` to `to` goes in the ring as drawn: 1 down, -1 up (each
// wrapping), 0 for a jump (a click).
const directionOf = (drawn: string[], from: string, to: string) => {
  const i = drawn.indexOf(from)
  const j = drawn.indexOf(to)

  if (i < 0 || j < 0) {
    return 0
  }

  return j === (i + 1) % drawn.length ? 1 : j === (i - 1 + drawn.length) % drawn.length ? -1 : 0
}

type PickedSetting = 'language' | 'theme' | 'skin' | 'bubbles' | 'visible' | 'emotions'

// The choices of a setting, with the one it has now.
const pickerFor = async ($: Ctx, setting: PickedSetting): Promise<Picker> => {
  switch (setting) {
    case 'language':
      return {
        setting,
        options: [{ value: 'auto', label: 'Auto (the language of your prompt)' }, ...LANGS.map(code => ({ value: LANG_LABELS[code], label: LANG_LABELS[code] }))],
        current: await read($, language),
        other: 'type any language, Haiku translates it once',
      }
    case 'theme':
      return { setting, options: THEMES.map(value => ({ value, label: value === 'auto' ? 'Auto (follows the system)' : value })), current: await read($, theme) }
    case 'skin':
      return { setting, options: Object.keys(SKINS).map(value => ({ value, label: value })), current: await read($, skin) }
    case 'bubbles':
      return { setting, options: [{ value: 'on', label: 'on' }, { value: 'off', label: 'off' }], current: (await read($, bubbles)) ? 'on' : 'off' }
    case 'visible':
      return { setting, options: [{ value: 'show', label: 'show' }, { value: 'hide', label: 'hide' }], current: (await read($, visible)) ? 'show' : 'hide' }
    case 'emotions':
      return {
        setting,
        options: [
          { value: 'keywords', label: 'keywords (send nothing)' },
          { value: 'ai', label: 'ai (Claude Haiku on your account)' },
        ],
        current: (await read($, smart)) ? 'ai' : 'keywords',
      }
  }
}

// Opens the picker for `setting`; says how to set it by hand when no pane can be drawn.
const openPicker = async ($: Ctx, setting: PickedSetting): Promise<string> => {
  const spec = await pickerFor($, setting)
  const index = spec.options.findIndex(option => option.value.toLowerCase() === spec.current.toLowerCase())
  await update($, picker, () => spec)
  await update($, pickerTop, () => Math.max(0, Math.min(index - 2, spec.options.length - PICKER_VISIBLE)))
  await update($, pickerFocus, () => null)
  const opened = await $.ui.open({ id: PICKER, title: `Pixpal ${setting}`, focus: true, closeOnEscape: true, holdToasts: true, rows: PICKER_ROWS })

  return opened.isPlaced
    ? `Pick the ${setting} in the pane.`
    : `Pixpal ${setting}: ${spec.current}. Set it with /pixpal ${setting} <${spec.options.map(option => option.value).join('|')}>.`
}

// A pick in the picker: the pane closes and a toast says what changed. A language without
// built-in lines takes Haiku a few seconds, so a toast says so first.
const pickValue = async ($: Ctx, setting: string, value: string) => {
  await $.ui.close({ id: PICKER })

  if (setting === 'language' && value !== 'auto' && !builtInBook(value)) {
    $.ui.toast(`Pixpal: Haiku translates the lines into ${value}…`)
  }

  $.ui.toast(await applySetting($, setting, value))
}

// Sets `setting` to `value` (a picked or typed value) and says what it did.
const applySetting = async ($: Ctx, setting: string, value: string): Promise<string> => {
  const skinId = (Object.keys(SKINS) as SkinId[]).find(id => id === value)
  const themeName = THEMES.find(option => option === value)

  switch (setting) {
    case 'language':
      return setLanguage($, value)
    case 'theme':
      return themeName ? setTheme($, themeName) : `Unknown theme: ${value}.`
    case 'skin':
      return skinId ? setSkin($, skinId) : `Unknown skin: ${value}.`
    case 'bubbles':
      return setBubbles($, value === 'on')
    case 'visible':
      return setVisible($, value === 'show')
    case 'emotions':
      return setEmotions($, value === 'ai' ? 'ai' : 'keywords')
    default:
      return `Unknown setting: ${setting}.`
  }
}

// /pixpal help: what each option does, with the value it has now. Only the person's
// settings are listed; the development commands (debug, classify, stats, eval,
// demo, tired, <scene>) still work but stay out of help and the argument hint. The command's text is
// drawn as Markdown (single line breaks would join into one paragraph), hence the lists.
const helpText = async ($: Ctx) => {
  const now = (value: unknown) => ` *(now: ${String(value)})*`

  return [
    'Pixpal: the robot above the prompt shows what Claude does and feels.',
    '',
    '**Settings**',
    '- `/pixpal init`: set everything up in five questions',
    `- \`/pixpal language <name> | auto\`: the language of the bubbles, any language${now(await read($, language))}`,
    `- \`/pixpal theme [auto|dark|light]\`: the look; auto follows the system${now(await read($, theme))}`,
    `- \`/pixpal skin [${Object.keys(SKINS).join('|')}]\`: who the robot is${now(await read($, skin))}`,
    `- \`/pixpal bubbles [on|off]\`: speech bubbles on or off${now((await read($, bubbles)) ? 'on' : 'off')}`,
    `- \`/pixpal show\`, \`/pixpal hide\`: Pixpal above the prompt or not; \`/pixpal visible\` picks${now((await read($, visible)) ? 'shown' : 'hidden')}`,
    `- \`/pixpal emotions [ai|keywords]\`: who picks the emotion; ai sends a short piece of each exchange to Claude Haiku on your account${now((await read($, smart)) ? 'ai' : 'keywords')}`,
    '- Without a value, a setting opens a picker.',
  ].join('\n')
}

// /pixpal init: five questions in Claude Code's own dialog, each applied as soon as it is
// answered. Dismissing a question stops there and keeps what was set so far.
const runInit = async ($: Ctx): Promise<string> => {
  const done: string[] = []

  try {
    const spoken = await $.ui.ask('Which language should the robot speak in its bubbles?', {
      header: 'Language',
      options: ['Auto (the language of your prompt)', 'English', 'Polski', 'Deutsch'],
    })
    done.push(await setLanguage($, spoken.startsWith('Auto') ? 'auto' : spoken.trim()))

    const look = await $.ui.ask('Which look should the band have?', { header: 'Theme', options: ['Auto (follows the system)', 'Dark', 'Light'] })
    done.push(await setTheme($, look.startsWith('Auto') ? 'auto' : look.toLowerCase() === 'light' ? 'light' : 'dark'))

    const who = await $.ui.ask('Who should the robot be? (For the ghost, type ghost under Other.)', {
      header: 'Character',
      options: ['Robot', 'Cat', 'Claude', 'Owl'],
    })
    const skinId = (Object.keys(SKINS) as SkinId[]).find(id => id === who.trim().toLowerCase()) ?? 'robot'
    done.push(await setSkin($, skinId))

    const mood = await $.ui.ask(
      'How should it pick its emotion after each answer? Haiku reads a short piece of the exchange on your own Claude Code account; keyword rules send nothing.',
      { header: 'Emotions', options: ['Keyword rules (send nothing)', 'Claude Haiku (better guesses)'] },
    )
    done.push(await setEmotions($, mood.startsWith('Claude Haiku') ? 'ai' : 'keywords'))

    const talk = await $.ui.ask('Should it say how it feels and what it does in speech bubbles?', { header: 'Bubbles', options: ['Yes', 'No'] })
    done.push(await setBubbles($, talk !== 'No'))
  } catch {
    done.push('Setup stopped; the answers so far are kept.')
  }

  return done.join('\n')
}

// The look to draw: the forced theme, or the system's for 'auto'.
const resolvedTheme = async ($: Ctx) => {
  const chosen = await read($, theme)

  return chosen === 'auto' ? await read($, systemTheme) : chosen
}

// Reads the system's appearance (macOS) into systemTheme; elsewhere it stays dark.
const syncTheme = async ($: Ctx) => {
  const result = await $.process.run(['defaults', 'read', '-g', 'AppleInterfaceStyle'], { timeoutMs: 5000 }).catch(() => undefined)
  const found = result ? systemThemeOf(result.exitCode, result.stdout, result.stderr) : 'dark'

  if (found !== (await read($, systemTheme))) {
    await update($, systemTheme, () => found)
  }
}

// Counts the agents that run now and stores the number when it changed.
const syncAgents = async ($: Ctx) => {
  const now = await $.clock.now()
  const tracked = await read($, workflowAgents)
  const live = Object.entries(tracked).filter(([, seenAt]) => now - seenAt < WORKFLOW_AGENT_STALE_MS)

  if (live.length !== Object.keys(tracked).length) {
    await update($, workflowAgents, () => Object.fromEntries(live))
  }

  const count = (await $.agent.list()).filter(agent => ACTIVE_AGENT.has(agent.status)).length + live.length

  if (count !== (await read($, agents))) {
    await update($, agents, () => count)
  }
}

// A new seq tells the Client to restart; a loop that is already playing is left alone.
const show = async ($: Ctx, name: string) => {
  if (!isOnce(name) && (await read($, scene)) === name) {
    return
  }

  await update($, scene, () => name)
  await update($, seq, n => n + 1)
}

// What one-shot scenes fall back to: the calendar rest between turns, but while a turn
// runs the robot stays at work (thinking), never idle.
const syncRest = async ($: Ctx, now: number, isBusy: boolean) => {
  const next = isBusy ? 'thinking' : restForDate(new Date(now))

  if ((await read($, rest)) !== next) {
    await update($, rest, () => next)
  }
}

type Verdict = { id?: string; raw: string; reason?: string; inTokens: number; outTokens: number; ms: number }
type Stats = { calls: number; hits: number; misses: number; inTokens: number; outTokens: number; ms: number }

const STATS_KEY = 'pixpal.stats'
// Translated phrasebooks, one per language, kept across sessions: a language costs one call.
const PHRASEBOOK_KEY = (name: string) => `pixpal.phrasebook.${name.trim().toLowerCase()}`
const TRANSLATE_TIMEOUT_MS = 30_000
const ERROR_KEY = 'pixpal.lastError'
const NO_STATS: Stats = { calls: 0, hits: 0, misses: 0, inTokens: 0, outTokens: 0, ms: 0 }

// One classifier call. Never throws: a refused request (a blocked model, say) comes back
// as a verdict with a reason, so `/pixpal classify` can show what went wrong.
const classify = async ($: EngineInterface, user: string, answer: string): Promise<Verdict> => {
  const start = await $.clock.now()

  try {
    const reply = await $.model.complete({
      model: CLASSIFIER_MODEL,
      system: CLASSIFIER_SYSTEM,
      prompt: buildClassifierPrompt(user, answer),
      maxTokens: 12,
      timeoutMs: CLASSIFIER_TIMEOUT_MS,
    })
    const ms = (await $.clock.now()) - start
    const usage = { inTokens: reply.usage.input_tokens, outTokens: reply.usage.output_tokens, ms }

    return reply.isAnswered ? { id: parseEmotion(reply.text), raw: reply.text, ...usage } : { raw: '', reason: reply.reason, ...usage }
  } catch (error) {
    return { raw: '', reason: `rejected: ${String(error)}`, inTokens: 0, outTokens: 0, ms: (await $.clock.now()) - start }
  }
}

// Counters live in $.store, so they survive a restart.
const addStats = async ($: EngineInterface, delta: Stats) => {
  const stats = { ...NO_STATS, ...((await $.store.get(STATS_KEY)) as Partial<Stats> | undefined) }

  await $.store.set(STATS_KEY, {
    calls: stats.calls + delta.calls,
    hits: stats.hits + delta.hits,
    misses: stats.misses + delta.misses,
    inTokens: stats.inTokens + delta.inTokens,
    outTokens: stats.outTokens + delta.outTokens,
    ms: stats.ms + delta.ms,
  })
}

const statsOf = (verdict: Verdict): Stats => ({
  calls: 1,
  hits: verdict.id ? 1 : 0,
  misses: verdict.id ? 0 : 1,
  inTokens: verdict.inTokens,
  outTokens: verdict.outTokens,
  ms: verdict.ms,
})

const recordStats = ($: EngineInterface, verdict: Verdict) => addStats($, statsOf(verdict))

const statsText = async ($: EngineInterface) => {
  const stats = { ...NO_STATS, ...((await $.store.get(STATS_KEY)) as Partial<Stats> | undefined) }
  const per = (n: number) => (stats.calls ? Math.round(n / stats.calls) : 0)

  return [
    `Classifier calls: ${stats.calls} (answered ${stats.hits}, fell back ${stats.misses})`,
    `Tokens: ${stats.inTokens} in, ${stats.outTokens} out (about ${per(stats.inTokens)} in and ${per(stats.outTokens)} out per call)`,
    `Latency: ${per(stats.ms)} ms on average`,
    `Last error: ${String((await $.store.get(ERROR_KEY)) ?? 'none')}`,
  ].join('\n')
}

const verdictText = (verdict: Verdict) =>
  verdict.reason
    ? `Classifier failed: ${verdict.reason} (${verdict.ms} ms)`
    : `Classifier answered "${verdict.raw.trim()}" -> ${verdict.id ?? 'no known id'}\nmodel ${CLASSIFIER_MODEL}, ${verdict.ms} ms, tokens ${verdict.inTokens} in / ${verdict.outTokens} out`

// Runs the sample exchanges through the classifier and reports hits and misses.
const evalText = async ($: EngineInterface) => {
  const lines: string[] = []
  let hits = 0
  let inTokens = 0
  let outTokens = 0

  for (const fixture of FIXTURES) {
    const verdict = await classify($, fixture.user, fixture.answer)
    await recordStats($, verdict)
    inTokens += verdict.inTokens
    outTokens += verdict.outTokens
    const isHit = verdict.id !== undefined && fixture.expect.split('/').includes(verdict.id)
    hits += isHit ? 1 : 0
    lines.push(`${isHit ? 'ok  ' : 'MISS'} ${fixture.expect.padEnd(9)} got ${(verdict.id ?? verdict.reason ?? '-').padEnd(9)} | ${fixture.user}`)
  }

  return [...lines, `Accuracy: ${hits}/${FIXTURES.length}. Tokens: ${inTokens} in, ${outTokens} out.`].join('\n')
}

// A failure in work that runs detached from a hook has nowhere to be thrown, so it is
// kept here and shown by `/pixpal stats`. Never rejects.
const recordError = async ($: EngineInterface, error: unknown) => {
  try {
    await $.store.set(ERROR_KEY, `${new Date(await $.clock.now()).toISOString()} ${String(error)}`.slice(0, 500))
  } catch {
    // nothing more can be done
  }
}

// Shows the final emotion unless the person has moved on in the meantime.
const playEmotion = async ($: EngineInterface, verdict: Verdict | undefined, fallback: string, isStale: () => boolean) => {
  await update($, pending, () => null)

  if (isStale()) {
    return
  }

  await update($, source, () => (verdict?.id ? 'ai' : 'kw'))
  await show($, verdict?.id ?? fallback)
}

// The final emotion. Aborted or empty turns use the keyword rules; otherwise the robot
// rests while a small model reads the exchange (see MOOD_GUIDE.md), and a failed or late
// call falls back to the keywords. After a long turn the robot first plays a tired "ufff"
// and the emotion follows once it has finished. isStale says the person has moved on.
const reactToAnswer = async ($: EngineInterface, user: string, answer: string, isAborted: boolean, durationMs: number, isStale: () => boolean) => {
  const fallback = sceneForExchange(user, answer, isAborted)
  const isTired = !isAborted && durationMs > TIRED_AFTER_MS
  const canAsk = !isAborted && answer.trim() !== '' && (await read($, smart))
  const startedAt = await $.clock.now()

  if (isTired) {
    await show($, 'ufff')
  } else if (canAsk) {
    await show($, await read($, rest))
  }

  let verdict: Verdict | undefined

  if (canAsk) {
    verdict = await classify($, user, answer)
    await recordStats($, verdict)
  }

  if (isTired) {
    const left = durationOfScene('ufff') - ((await $.clock.now()) - startedAt)

    // A timer, not a sleep: a sleep inside this detached call is charged to the time
    // budget of the hook that started it, which has long ended.
    if (left > 0) {
      $.clock.after(left, () => {
        void playEmotion($, verdict, fallback, isStale).catch(error => recordError($, error))
      })

      return
    }
  }

  await playEmotion($, verdict, fallback, isStale)
}

// After the last running tool ends the robot goes back to thinking, unless another tool
// has started within the debounce (isBackToWork says whether nothing runs and the turn goes on).
const backToThinking = ($: EngineInterface, isBackToWork: () => boolean) => {
  $.clock.after(TOOL_END_DEBOUNCE_MS, () => {
    if (isBackToWork()) {
      void show($, 'thinking').catch(() => {})
    }
  })
}

export const register: Register = on => {
  let isBusy = false
  let isAsleep = false
  let activeAt = 0
  let isTyping = false
  let quietTicks = 0
  let lastUserText = ''
  // Tool calls in flight; the robot is back to thinking once none runs.
  let running = 0

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'pixpal',
      description: 'Set up Pixpal: its character, look, language and speech bubbles',
      // shown in gray after "/pixpal " as the person types
      argumentHint: '[help | init | language [<name>|auto] | theme [auto|dark|light] | skin [name] | bubbles [on|off] | show | hide | emotions [ai|keywords]]',
    })
    activeAt = await $.clock.now()
    await syncRest($, activeAt, false)

    // After a reload in the middle of a reaction: pick it up again.
    const unfinished = await read($, pending)

    if (unfinished && activeAt - unfinished.at < RESUME_WITHIN_MS) {
      void reactToAnswer($, unfinished.user, unfinished.answer, unfinished.isAborted, unfinished.durationMs, () => isBusy || isTyping).catch(error => recordError($, error))
    }

    void syncAgents($).catch(error => recordError($, error))
    void syncTheme($).catch(error => recordError($, error))

    // the person's choices and the chosen language's phrasebook, back after a restart
    await loadSettings($)

    const spoken = await read($, language)

    if (spoken !== 'auto' && !(await read($, phrasebook))) {
      const book = builtInBook(spoken) ?? ((await $.store.get(PHRASEBOOK_KEY(spoken))) as Record<string, string> | undefined)
      await update($, phrasebook, () => book ?? null)
    }
    $.clock.every(THEME_MS, async () => {
      if ((await read($, theme)) === 'auto') {
        await syncTheme($)
      }
    })
    $.clock.every(AGENTS_MS, () => syncAgents($))

    $.clock.every(DEMO_MS, async () => {
      if (await read($, demo)) {
        await show($, SCENES[(SCENES.indexOf(await read($, scene)) + 1) % SCENES.length]!)
      }
    })

    $.clock.every(TYPING_TICK_MS, async () => {
      if (!isTyping) {
        return
      }

      quietTicks += 1

      if (quietTicks >= TYPING_QUIET_TICKS) {
        isTyping = false
        activeAt = await $.clock.now()
        await show($, isBusy ? 'thinking' : await read($, rest))
      }
    })

    $.clock.every(WATCH_MS, async () => {
      const now = await $.clock.now()
      await syncRest($, now, isBusy)

      if (!isBusy && !isTyping && !isAsleep && !(await read($, demo)) && now - activeAt > SLEEP_AFTER_MS) {
        isAsleep = true
        await show($, 'sleep')
      }
    })

    return next(e)
  })

  // Phase 2 begins: the robot is thinking until a tool shows what it is doing.
  on('turn.start', async ($, e, next) => {
    isTyping = false
    isBusy = true
    running = 0
    activeAt = await $.clock.now()
    isAsleep = false
    lastUserText = e.text
    void update($, lang, () => langOf(e.text))
    void update($, rest, () => 'thinking')
    void update($, source, () => '')
    void update($, demo, () => false)
    void show($, 'thinking')

    return next(e)
  })

  // On every keystroke: stay synchronous and cheap, touch state only on transitions.
  on('prompt.edit', ($, e, next) => {
    // While a turn runs the robot is busy working; it only peeks over the fence when idle.
    if (isBusy) {
      return next(e)
    }

    const draft = draftAfter(e)

    if (draft.length === 0) {
      quietTicks = TYPING_QUIET_TICKS
    } else {
      quietTicks = 0

      if (!isTyping) {
        isTyping = true
        isAsleep = false
        void show($, 'peek').catch(() => {})
      }
    }

    return next(e)
  })

  // The robot shows the tool that is running, one to one. A call that ends within
  // TOOL_SCENE_DELAY_MS shows nothing, so quick calls do not flicker.
  on('tool.call', async ($, e, next) => {
    // an agent's own tools show on its mini robot's loop, not on this robot; a workflow
    // agent's call says it is still at work
    if (e.agentId) {
      const id = e.agentId

      if ((await read($, workflowAgents))[id] !== undefined) {
        const now = await $.clock.now()
        await update($, workflowAgents, all => ({ ...all, [id]: now }))
      }

      return next(e)
    }

    void $.clock.now().then(now => {
      activeAt = now
      isAsleep = false
    }).catch(() => {})
    const command = (e as { command?: unknown }).command
    const name = sceneForTool(e.tool, typeof command === 'string' ? command : '')
    running += 1

    const cancelScene = isBusy
      ? $.clock.after(TOOL_SCENE_DELAY_MS, () => {
          void show($, name).catch(() => {})
        })
      : undefined

    try {
      return await next(e)
    } finally {
      cancelScene?.cancel()
      running = Math.max(0, running - 1)

      if (running === 0) {
        backToThinking($, () => isBusy && running === 0)
      }
    }
  })

  // A permission dialog is Claude asking the person: a raised hand until it is answered.
  on('classic.PermissionRequest', async ($, e, next) => {
    if (isBusy) {
      void show($, 'ask').catch(() => {})
    }

    try {
      return await next(e)
    } finally {
      if (running === 0) {
        backToThinking($, () => isBusy && running === 0)
      }
    }
  })

  // Phase 3 begins: the answer is in, the emotion plays.
  on('turn.complete', async ($, e, next) => {
    // a subagent finishing is not the end of the turn, only one mini robot fewer
    if (e.agentId) {
      const id = e.agentId

      if ((await read($, workflowAgents))[id] !== undefined) {
        await update($, workflowAgents, ({ [id]: _done, ...others }) => others)
      }

      $.clock.after(AGENT_SETTLE_MS, () => syncAgents($))

      return next(e)
    }

    isBusy = false
    running = 0
    activeAt = await $.clock.now()
    isAsleep = false
    await update($, rest, () => restForDate(new Date(activeAt)))
    await update($, pending, () => ({ user: lastUserText, answer: e.answer, isAborted: e.isAborted, durationMs: e.durationMs, at: activeAt }))
    void reactToAnswer($, lastUserText, e.answer, e.isAborted, e.durationMs, () => isBusy || isTyping).catch(error => recordError($, error))

    return next(e)
  })

  // A new agent: one more mini robot.
  on('agent.spawn', async ($, e, next) => {
    const result = await next(e)

    // a workflow's agent is not in $.agent.list(), so it is counted here
    if (e.workflow && !result.deny && result.agentId) {
      const id = result.agentId
      const now = await $.clock.now()
      await update($, workflowAgents, all => ({ ...all, [id]: now }))
    }
    void syncAgents($).catch(error => recordError($, error))

    return result
  })

  on('command.run', { command: 'pixpal' }, async ($, e) => {
    const [name = '', ...words] = e.args.trim().split(/\s+/)
    const argText = words.join(' ')

    if (name === 'debug') {
      const isOn = !(await read($, debug))
      await update($, debug, () => isOn)

      return { text: `Pixpal debug labels ${isOn ? 'on' : 'off'}.` }
    }

    if (name === '' || name === 'help') {
      return { text: await helpText($) }
    }

    if (name === 'init') {
      return { text: await runInit($) }
    }

    if (name === 'language') {
      return { text: argText ? await setLanguage($, argText) : await openPicker($, name) }
    }

    if (name === 'skin') {
      const asked = (Object.keys(SKINS) as SkinId[]).find(option => option === words[0])

      return { text: asked ? await setSkin($, asked) : await openPicker($, name) }
    }

    if (name === 'theme') {
      const asked = THEMES.find(option => option === words[0])

      return { text: asked ? await setTheme($, asked) : await openPicker($, name) }
    }

    if (name === 'show' || name === 'hide') {
      return { text: await setVisible($, name === 'show') }
    }

    if (name === 'visible') {
      return { text: words[0] === 'show' || words[0] === 'hide' ? await setVisible($, words[0] === 'show') : await openPicker($, name) }
    }

    if (name === 'bubbles') {
      return { text: words[0] === 'on' || words[0] === 'off' ? await setBubbles($, words[0] === 'on') : await openPicker($, name) }
    }

    // smart is the old name of emotions, kept for development
    if (name === 'emotions' || name === 'smart') {
      const asked = words[0] === 'ai' || words[0] === 'keywords' ? words[0] : undefined

      return { text: asked ? await setEmotions($, asked) : await openPicker($, 'emotions') }
    }

    // /pixpal classify <user message> | <assistant answer>
    if (name === 'classify') {
      const [user = '', answer = ''] = argText.split('|').map(part => part.trim())
      const verdict = await classify($, user, answer)
      await recordStats($, verdict)

      return { text: verdictText(verdict) }
    }

    // /pixpal tired [seconds]: phase 3 as if the turn had taken that long, to see ufff
    // and the emotion that follows it without waiting a real minute.
    if (name === 'tired') {
      const seconds = Number(words[0]) || 61

      void reactToAnswer($, 'dzięki, super robota', 'Gotowe, wszystko działa.', false, seconds * 1000, () => false).catch(error => recordError($, error))

      return { text: `Phase 3 simulated as if the turn took ${seconds} s.` }
    }

    if (name === 'stats') {
      return { text: await statsText($) }
    }

    if (name === 'eval') {
      return { text: await evalText($) }
    }

    if (name === 'demo') {
      await update($, demo, () => true)

      return { text: 'Pixpal demo: cycling all scenes.' }
    }

    if (!SCENES.includes(name)) {
      return { text: `Unknown option "${name}". See /pixpal help.` }
    }

    await update($, demo, () => false)
    await show($, name)

    return { text: `Pixpal plays "${name}".` }
  })

  // The settings picker: PICKER_VISIBLE plain Buttons, the slots, over the options from
  // pickerTop on. The arrows move the pane's focus ring over the slots, which keeps its place
  // by position; ui.focus below scrolls the options under it at either end.
  on('ui.render', { component: 'Pane', requestId: PICKER }, async ($, e) => {
    const elements = $.ui.resolve(e)
    const { Box, Button, Text } = elements
    const spec = await read($, picker)

    if (!spec) {
      return <Text dimColor>Nothing to pick.</Text>
    }

    const top = await read($, pickerTop)
    const rows = spec.options.length
    const isCurrent = (value: string) => value.toLowerCase() === spec.current.toLowerCase()
    const more = `${top > 0 ? '▲' : ' '}${top + PICKER_VISIBLE < rows ? '▼' : ' '}`

    const now = spec.options.find(option => isCurrent(option.value))?.label ?? spec.current

    return (
      <Box flexDirection="column" paddingX={2} paddingTop={1}>
        <Box flexDirection="row" marginBottom={1}>
          <Text bold color={PICKER_ACCENT}>
            {PICKER_QUESTIONS[spec.setting] ?? spec.setting}
          </Text>
          <Text dimColor> now: {now}</Text>
        </Box>
        {spec.options.slice(top, top + PICKER_VISIBLE).map((option, k) => (
          <Button
            key={`slot:${k}`}
            plain
            autoFocus={isCurrent(option.value) || undefined}
            label={`${String(top + k + 1).padStart(String(rows).length)}. ${option.label}${isCurrent(option.value) ? '  ✓' : ''}`}
            onPress={() => void pickValue($, spec.setting, option.value)}
          />
        ))}
        {spec.other && 'Input' in elements && (
          <elements.Input key="other" placeholder={`Other: ${spec.other}`} onSubmit={value => value.trim() && void pickValue($, spec.setting, value.trim())} />
        )}
        <Box marginTop={1}>
          <Text dimColor wrap="truncate">
            {more} {rows} · ↑↓ move · Enter picks · Esc closes
          </Text>
        </Box>
      </Box>
    )
  })

  // Down from the last slot while options are left below, or up from the first while some
  // are above: the ring stays put and the options scroll under it. Wrapping from the field
  // to a slot shows the list's start (down) or end (up).
  on('ui.focus', async ($, e, next) => {
    const spec = await read($, picker)

    if (e.requestId !== PICKER || !spec || e.element === undefined) {
      return next(e)
    }

    const rows = spec.options.length
    const slots = Math.min(PICKER_VISIBLE, rows)
    const top = await read($, pickerTop)
    const drawn = [...Array.from({ length: slots }, (_, k) => `slot:${k}`), ...(spec.other ? ['other'] : [])]
    const from = await read($, pickerFocus)
    const direction = from && e.origin.kind === 'person' ? directionOf(drawn, from, e.element) : 0

    if (direction === 1 && from === `slot:${slots - 1}` && top + slots < rows) {
      await update($, pickerTop, () => top + 1)

      return {}
    }

    if (direction === -1 && from === 'slot:0' && top > 0) {
      await update($, pickerTop, () => top - 1)

      return {}
    }

    const result = await next(e)

    if (!result.deny) {
      await update($, pickerFocus, () => e.element!)

      if (from === 'other' && direction !== 0) {
        await update($, pickerTop, () => (direction === 1 ? 0 : rows - slots))
      }
    }

    return result
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface === 'vscode' || e.surface === 'mobile' || !(await read($, visible))) {
      return next(e)
    }

    const { Box, Client } = $.ui.resolve(e)
    const props = { scene: await read($, scene), seq: await read($, seq), rest: await read($, rest), debug: await read($, debug), source: await read($, source), agents: await read($, agents), maxRows: e.props.maxRows ?? 99, lang: await read($, lang), bubbles: await read($, bubbles), theme: await resolvedTheme($), skin: await read($, skin), phrases: await read($, phrasebook) }

    // what the mods beneath draw in the band stands to Pixpal's right, so the band is shared
    const below = await next(e)

    return (
      <Box flexDirection="row">
        <Client key="pixpal" module="./client/pixpal.tsx" props={props} width={bandWidth(props.agents) + Math.max(BUBBLE_W, props.phrases ? bubbleWidthOf(Object.values(props.phrases)) : 0)} />
        <Box flexGrow={1} marginLeft={2}>
          {below}
        </Box>
      </Box>
    )
  })
}
