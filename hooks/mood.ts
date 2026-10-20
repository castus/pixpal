// Pure, instant classifiers that pick a Pixpal scene. They run inside hook
// dispatches, so they must never wait on anything.
//
// Three phases: 1) idle or the person typing, 2) the turn runs and the robot shows what
// it is doing right now (sceneForTool, otherwise thinking), 3) the answer arrives and one
// emotion plays (the classifier, with sceneForExchange as the keyword fallback).
const has = (text: string, words: string[]) => words.some(word => text.includes(word))

const FRUSTRATED = ['kurwa', 'cholera', 'wkurw', 'znowu', 'dalej nie', 'nadal nie', 'still not', 'wtf', 'ugh', 'damn', 'again?!']
const SORRY = ['sorry', 'przepraszam', 'mój błąd', 'moj blad', 'my bad']
const THANKS = ['dzięki', 'dzieki', 'dziękuję', 'dziekuje', 'thanks', 'thank you', 'thx', 'świetna robota', 'swietna robota', 'super robota']
const GREETING = /^(cześć|czesc|hej|siema|witaj|hello|hi|hey|dzień dobry|dzien dobry|good morning)(?![a-ząćęłńóśźż])/

const isShouting = (text: string) => {
  const letters = [...text].filter(ch => ch.toLowerCase() !== ch.toUpperCase())
  const upper = letters.filter(ch => ch === ch.toUpperCase())

  return letters.length >= 8 && upper.length / letters.length > 0.6
}

// Social cues in the user's message. Only the keyword fallback of the final emotion uses
// them (the classifier reads the message itself); the work phase ignores the prompt.
function socialCue(user: string): string | undefined {
  const lower = user.toLowerCase()

  if (user.includes('!!') || isShouting(user) || has(lower, FRUSTRATED)) {
    return 'contrite'
  }

  if (has(lower, SORRY)) {
    return 'relieved'
  }

  if (has(lower, THANKS)) {
    return 'shy'
  }

  return GREETING.test(lower) ? 'hello' : undefined
}

const STOP = /^(stop|wait|uwaga|hold on|czekaj)(?![a-ząćęłńóśźż])/
const YES = /^(tak|yes|oczywiście|owszem)(?![a-ząćęłńóśźż])/
const NO = /^(nie|no)(?![a-ząćęłńóśźż])/
const PRAISE = ['dobry catch', 'good catch', 'dobra uwaga', 'trafna uwaga', 'good point', 'świetny pomysł', 'swietny pomysl', 'dobry pomysł', 'great idea']
const SOSO = ['prawie', 'almost', 'nie do końca', 'nie do konca', 'not quite', 'partially', 'częściowo', 'czesciowo', 'partly', 'close, but', 'blisko, ale']
const REJECT = ['nie, ', 'nie.', 'no, ', 'no.', 'actually', 'właściwie', 'wlasciwie', 'niestety', "that's not", 'that is not', 'to nie tak', "you're mistaken", 'you are mistaken', 'mylisz się', 'mylisz sie', 'nieprawda', 'incorrect', 'not correct']
const AGREE = ['masz rację', 'masz racje', "you're right", 'you are right', 'exactly', 'dokładnie', 'dokladnie', 'słusznie', 'slusznie', 'trafnie']
const UNSURE = ['nie jestem pewien', 'nie jestem pewna', 'not sure', "i'm unsure", 'nie wiem', "i don't know"]

export function sceneForAnswer(answer: string, isAborted: boolean): string {
  if (isAborted) {
    return 'surprised'
  }

  const lower = answer.toLowerCase().trimStart()
  const head = lower.slice(0, 300)

  if (STOP.test(lower)) {
    return 'stop'
  }

  if (has(head, SOSO)) {
    return 'soso'
  }

  if (has(lower.slice(0, 60), PRAISE)) {
    return 'praise'
  }

  // "Nie jestem pewien" opens with a no but is a shrug
  if (has(lower.slice(0, 120), UNSURE)) {
    return 'shrug'
  }

  if (YES.test(lower)) {
    return 'yes'
  }

  if (NO.test(lower) || has(lower.slice(0, 120), REJECT)) {
    return 'no'
  }

  if (has(head, AGREE)) {
    return 'yes'
  }

  if (has(lower.slice(0, 2000), UNSURE)) {
    return 'shrug'
  }

  if (lower.trimEnd().slice(-120).includes('?')) {
    return 'ponder'
  }

  return 'happy'
}

// The keyword fallback of the final emotion: the answer decides, and when it says nothing
// special the user's own words (thanks, an apology, a greeting, frustration) may.
export function sceneForExchange(user: string, answer: string, isAborted: boolean): string {
  const scene = sceneForAnswer(answer, isAborted)

  return scene === 'happy' ? (socialCue(user) ?? 'happy') : scene
}

// Tool groups, each with the scene that shows Claude using them (see MOOD_GUIDE.md).
const TOOL_SCENES: Record<string, string[]> = {
  read: ['Read', 'ReadMcpResourceTool', 'ReadMcpResourceDirTool', 'ListMcpResourcesTool', 'LSP', 'WebFetch', 'FetchInboxMessage'],
  lens: ['WebSearch', 'ToolSearch', 'SearchSkills', 'SearchPlugins', 'SearchMcpRegistry', 'ListSkills', 'ListPlugins', 'ListAgents', 'ListConnectors', 'SuggestSkills', 'SuggestPluginInstall', 'SuggestConnectors'],
  idea: ['Skill'],
  type: ['Edit', 'Write', 'NotebookEdit', 'Monitor'],
  // a subagent or a workflow runs: the robot hands work around
  juggle: ['Agent', 'Workflow'],
  plan: ['TodoWrite', 'TaskCreate', 'TaskGet', 'TaskList', 'TaskUpdate', 'GetTask', 'EnterPlanMode', 'ExitPlanMode', 'ProposeGoal'],
  ask: ['AskUserQuestion'],
  clock: ['CronCreate', 'CronDelete', 'CronList', 'ScheduleWakeup', 'RemoteTrigger', 'Poll'],
  send: ['SendFile', 'SendUserFile', 'SendUserMessage', 'SendMessage', 'PublishPlugin', 'ShareOnboardingGuide', 'SendFeedback', 'ReportFindings'],
  bell: ['PushNotification', 'ReadNotifications'],
  paint: ['Artifact', 'ArtifactCheck', 'ArtifactComments', 'ArtifactData', 'DesignSync', 'ClaudeDesign', 'AppifactRepl'],
  door: ['EnterWorktree', 'ExitWorktree'],
}

const SCENE_OF_TOOL = new Map(Object.entries(TOOL_SCENES).flatMap(([scene, tools]) => tools.map(tool => [tool, scene] as const)))

const TEST_COMMAND = /(pytest|jest|vitest|mocha|npm (run )?test|yarn test|pnpm test|go test|cargo test|plugin test|unittest)/
const TEST_SCENES = ['checklist', 'stamp']

export const isTestCommand = (command: string) => TEST_COMMAND.test(command)

// Bash is shown as what the command really does, first match wins. Anything else is
// plain typing of a command.
const COMMAND_SCENES: Array<[scene: string, pattern: RegExp]> = [
  ['git', /\bgit\b/],
  ['send', /\b(curl|wget|http|httpie|nc|ping|dig|nslookup|ssh|scp)\b/],
  ['lens', /\b(grep|rg|ag|ack|find|fd|locate)\b/],
  ['read', /\b(cat|head|tail|less|more|ls|tree|stat|wc|file|du|df|pwd)\b/],
  ['run', /\b(make|npm|pnpm|yarn|docker|kubectl|helm|terraform|pip|pip3|brew|cargo|python3?|node|bun|uv)\b/],
]

export function sceneForCommand(command: string, random: () => number = Math.random): string {
  if (isTestCommand(command)) {
    return TEST_SCENES[Math.floor(random() * TEST_SCENES.length)]!
  }

  return COMMAND_SCENES.find(([, pattern]) => pattern.test(command))?.[0] ?? 'type'
}

// The scene of one running tool; any tool outside the table (an MCP tool, a new built-in)
// gets the general scene.
export const sceneForTool = (tool: string, command = '', random: () => number = Math.random): string =>
  tool === 'Bash' ? sceneForCommand(command, random) : (SCENE_OF_TOOL.get(tool) ?? 'thinking')

type PromptEdit = { text: string; start: number; end: number; inputText: string }

export const draftAfter = (e: PromptEdit) => e.text.slice(0, e.start) + e.inputText + e.text.slice(e.end)

// Rest scene for the moment: night cap after 22:00, coffee on Monday, party hat on Friday.
export function restForDate(date: Date): string {
  const hour = date.getHours()

  if (hour >= 22 || hour < 6) {
    return 'night'
  }

  return date.getDay() === 1 ? 'monday' : date.getDay() === 5 ? 'friday' : 'idle'
}
