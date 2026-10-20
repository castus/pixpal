// A short line the robot says in a speech bubble, so a scene is not left to guesswork: how
// it feels while an emotion plays, and what it does while a tool runs. Rest scenes and the
// minis stay silent.
import type { Span } from './sprites.ts'

export type Lang = 'pl' | 'en'

export const SAYINGS: Record<string, Record<Lang, string>> = {
  happy: { pl: 'Gotowe!', en: 'Done!' },
  cheer: { pl: 'Jupii!', en: 'Yay!' },
  yes: { pl: 'Tak!', en: 'Yes!' },
  no: { pl: 'Nie…', en: 'Nope' },
  praise: { pl: 'Brawo!', en: 'Nice!' },
  soso: { pl: 'Tak sobie', en: 'Sort of' },
  shrug: { pl: 'Hmm…', en: 'Dunno' },
  ponder: { pl: 'I jak?', en: 'Well?' },
  stop: { pl: 'Stój!', en: 'Wait!' },
  contrite: { pl: 'Sorki…', en: 'Oops, sorry' },
  shy: { pl: 'Och, dzięki', en: 'Aw, thanks' },
  relieved: { pl: 'Luzik', en: 'No worries' },
  oops: { pl: 'Ups!', en: 'Oops!' },
  surprised: { pl: 'Ojej!', en: 'Whoa!' },
  hello: { pl: 'Cześć!', en: 'Hi!' },
  ufff: { pl: 'Uff…', en: 'Phew…' },
}

const POLISH_LETTERS = /[ąćęłńóśźż]/i
const POLISH_WORDS = /(^|[^a-ząćęłńóśźż])(nie|tak|jest|czy|się|jak|co|to|już|może|dzięki|zrób|ok,? to)(?![a-ząćęłńóśźż])/i

// The person's language, from the message they sent: the robot answers in kind.
export const langOf = (text: string): Lang => (POLISH_LETTERS.test(text) || POLISH_WORDS.test(text) ? 'pl' : 'en')

// The bubble fades from white at the top to a cool light gray at the bottom, one color per
// half-row; the text row sits in the middle shade.
const SHADES = ['#ffffff', '#ffffff', '#f5f7fa', '#f5f7fa', '#e6ebf0']
const INK = '#0f1b2d'
const SHADOW = '#5c6370'


// The line types itself out, one letter every TYPE_MS (hidden letters are spaces, so the
// bubble keeps its size). A fade by color was tried and dropped: terminals with a minimum
// contrast setting (iTerm2) lift a faint letter to a readable gray at once.
export const TYPE_MS = 45
// A line that ends in "…" ends in three dots instead, which keep moving once it is typed:
// "xyz...", "xyz", "xyz.", "xyz..", "xyz..." and so on, one step every DOT_MS.
export const DOT_MS = 350
const DOT_STEPS = [3, 0, 1, 2]
const PAD_CHARS = 2

// The text as the bubble writes it: "…" becomes three separate dots.
const spelled = (text: string) => (text.endsWith('…') ? `${text.slice(0, -1)}...` : text)

// Terminal columns a character takes: two for East Asian wide letters and emoji, one for
// the rest. The bubble counts columns, not letters, so its shadow lines up in any script.
const WIDE = /[\u1100-\u115F\u2E80-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6\u{1F300}-\u{1FAFF}\u{20000}-\u{3FFFD}]/u
export const cellWidth = (text: string) => [...text].reduce((n, ch) => n + (WIDE.test(ch) ? 2 : 1), 0)

// What the bubble shows `elapsed` ms after the line appeared, always as wide as the full
// line: first the letters typed so far, then (for a "…" line) the dots going round.
export function shownText(text: string, elapsed: number): string {
  const full = spelled(text)
  const chars = [...full]
  const blank = (rest: string[]) => rest.map(ch => ' '.repeat(cellWidth(ch))).join('')

  // no clock (a still picture, the gallery): the whole line
  if (!Number.isFinite(elapsed)) {
    return full
  }

  const typed = Math.floor(Math.max(0, elapsed) / TYPE_MS) + 1

  if (typed < chars.length) {
    return chars.slice(0, typed).join('') + blank(chars.slice(typed))
  }

  if (full === text) {
    return full
  }

  const step = Math.floor((elapsed - (chars.length - 1) * TYPE_MS) / DOT_MS) % DOT_STEPS.length
  const dots = DOT_STEPS[step]!

  return chars.slice(0, -3).join('') + '.'.repeat(dots) + ' '.repeat(3 - dots)
}

type Cell = { ch: string; color?: string; bg?: string }

const toCells = (row: Span[]): Cell[] => row.flatMap(s => [...s.text].map(ch => ({ ch, color: s.color, bg: s.bg })))

function toSpans(cells: Cell[]): Span[] {
  const spans: Span[] = []

  for (const cell of cells) {
    const last = spans.at(-1)

    if (last && last.color === cell.color && last.bg === cell.bg) {
      last.text += cell.ch
    } else {
      spans.push({ text: cell.ch, color: cell.color, bg: cell.bg })
    }
  }

  return spans
}

// The colors of a cell's upper and lower half, as halfBlock drew them.
function halves(cell: Cell): [string | undefined, string | undefined] {
  switch (cell.ch) {
    case '▀':
      return [cell.color, cell.bg]
    case '▄':
      return [cell.bg, cell.color]
    case '█':
      return [cell.color, cell.color]
    default:
      return [cell.bg, cell.bg]
  }
}

function fromHalves(top: string | undefined, bottom: string | undefined): Cell {
  if (!top && !bottom) {
    return { ch: ' ' }
  }

  if (top === bottom) {
    return { ch: '█', color: top }
  }

  return !bottom ? { ch: '▀', color: top } : !top ? { ch: '▄', color: bottom } : { ch: '▀', color: top, bg: bottom }
}

// The bubble in half-rows (two per terminal row): column 0 is a gap from the picture,
// columns 1..n the body, n+1 the shadow. W body, S shadow, . untouched. Half-row 0 is left
// empty so the body's top lines up with the panel's (which starts one pixel down). The body
// is a rounded box with one pixel above and below the text row (half-rows 2-3); the
// shadow sits one column right and half a row down, filling the body's lower right corner
// (a notch) with its own outer corner cut.
function shape(n: number): string[] {
  const round = `..${'W'.repeat(n - 2)}.`
  const full = `.${'W'.repeat(n)}S`

  return ['.'.repeat(n + 2), `${round}.`, full, full, `${round.slice(0, -1)}SS`, `...${'S'.repeat(n - 2)}.`]
}

// The terminal row of the bubble that holds the text, and how many rows the bubble spans.
const TEXT_ROW = 1
const BUBBLE_ROWS = 3

// Lays the bubble saying `text` beside the band's rows, one column outside the picture: three
// rows when the band has them (text in the second), else the text alone in a light strip on
// the first row.
export function withBubble(rows: Span[][], text: string, elapsed = Number.POSITIVE_INFINITY): Span[][] {
  if (rows.length === 0) {
    return rows
  }

  const pad = ' '.repeat(PAD_CHARS)
  const body = `${pad}${shownText(text, elapsed)}${pad}`

  if (rows.length < BUBBLE_ROWS) {
    return [[...rows[0]!, { text: '  ' }, { text: body, color: INK, bg: SHADES[2] }], ...rows.slice(1)]
  }

  const grid = rows.map(toCells)
  const x = Math.max(...grid.map(cells => cells.length))
  // one cell per terminal column: a wide letter is followed by an empty cell
  const bodyCells = [...body].flatMap(ch => (cellWidth(ch) === 2 ? [ch, ''] : [ch]))
  const width = bodyCells.length
  const half = shape(width)

  return grid.map((cells, y) => {
    if (y >= BUBBLE_ROWS) {
      return toSpans(cells)
    }

    const out = [...cells]
    const paint = (key: string, row: number) => (key === 'W' ? SHADES[Math.min(row, SHADES.length - 1)] : key === 'S' ? SHADOW : undefined)

    for (let i = 0; i <= width + 1; i++) {
      const [under0, under1] = halves(out[x + i] ?? { ch: ' ' })
      const top = paint(half[2 * y]![i]!, 2 * y) ?? under0
      const bottom = paint(half[2 * y + 1]![i]!, 2 * y + 1) ?? under1
      const inText = y === TEXT_ROW && i >= 1 && i <= width

      out[x + i] = inText ? { ch: bodyCells[i - 1]!, color: INK, bg: SHADES[2] } : fromHalves(top, bottom)
    }

    return toSpans(out.map(cell => cell ?? { ch: ' ' }))
  })
}

// UNDER REVIEW: whether work scenes speak at all. false keeps the bubble for emotions only.
// To remove the feature for good, drop WORK_SPEAKS and WORK_SAYINGS and let the Client,
// BUBBLE_W and tools/gallery.ts use SAYINGS alone.
export const WORK_SPEAKS = true

// What the robot says while it works (phase 2): one plain "doing" line per work scene. A
// line naming the call's target ("Czytam mood.ts") was tried and dropped: it changed too
// fast to read.
export const WORK_SAYINGS: Record<string, Record<Lang, string>> = {
  thinking: { pl: 'Myślę…', en: 'Thinking…' },
  read: { pl: 'Czytam…', en: 'Reading…' },
  lens: { pl: 'Szukam…', en: 'Searching…' },
  type: { pl: 'Piszę…', en: 'Writing…' },
  run: { pl: 'Odpalam…', en: 'Running…' },
  checklist: { pl: 'Testuję…', en: 'Testing…' },
  stamp: { pl: 'Testuję…', en: 'Testing…' },
  git: { pl: 'Git…', en: 'Git…' },
  plan: { pl: 'Planuję…', en: 'Planning…' },
  idea: { pl: 'Uczę się…', en: 'Learning…' },
  send: { pl: 'Wysyłam…', en: 'Sending…' },
  ask: { pl: 'Pytanie!', en: 'Question!' },
  clock: { pl: 'Ustawiam czas…', en: 'Scheduling…' },
  bell: { pl: 'Dzwonię!', en: 'Ping!' },
  paint: { pl: 'Rysuję…', en: 'Drawing…' },
  door: { pl: 'Przechodzę…', en: 'Switching…' },
  juggle: { pl: 'Deleguję…', en: 'Delegating…' },
}

// The widest bubble any saying (emotion or work) needs past the picture, in terminal
// columns: the gap column, two spaces of padding each side, the text, and the shadow column.
export const bubbleWidthOf = (lines: string[]) => Math.max(0, ...lines.map(line => cellWidth(spelled(line)))) + 6
export const BUBBLE_W = bubbleWidthOf([...Object.values(SAYINGS), ...Object.values(WORK_SAYINGS)].flatMap(s => [s.pl, s.en]))

// Any other language: the English lines are translated once by a small model and kept.
// A translated line is cut to TRANSLATED_MAX columns and keeps the ellipsis of its source.
const TRANSLATED_MAX = 16

// Every line the robot can say, by scene id, in English: what a translation starts from.
export const ENGLISH_LINES: Record<string, string> = Object.fromEntries(
  [...Object.entries(SAYINGS), ...Object.entries(WORK_SAYINGS)].map(([id, line]) => [id, line.en]),
)

export const TRANSLATE_SYSTEM = `You translate the short lines a small robot says in a speech bubble. Answer with one JSON object only: the same keys, each value the line in the requested language.
Rules: keep each line as short as the English (at most ${TRANSLATED_MAX} characters, fewer for wide scripts), natural and casual, like a friendly robot talking. Keep a final "…" where the English has one. No quotes inside values, no explanations.`

export const buildTranslatePrompt = (language: string) => `Language: ${language}\n\n${JSON.stringify(ENGLISH_LINES, null, 1)}`

// Cuts a line to `max` terminal columns, letter by letter.
function clipCells(text: string, max: number): string {
  let out = ''

  for (const ch of text) {
    if (cellWidth(out + ch) > max) {
      break
    }

    out += ch
  }

  return out
}

// The model's reply as a phrasebook: every id present, each line short, an ellipsis kept
// where the English has one. Lines it missed stay English. Undefined when there is no JSON.
export function parseTranslation(reply: string): Record<string, string> | undefined {
  const json = /\{[\s\S]*\}/.exec(reply)?.[0]
  let parsed: Record<string, unknown>

  try {
    parsed = json ? (JSON.parse(json) as Record<string, unknown>) : {}
  } catch {
    return undefined
  }

  if (!json) {
    return undefined
  }

  return Object.fromEntries(
    Object.entries(ENGLISH_LINES).map(([id, english]) => {
      const raw = typeof parsed[id] === 'string' ? (parsed[id] as string).trim().replace(/\.\.\.$/, '…') : ''
      const trailing = english.endsWith('…')
      const core = clipCells(raw.replace(/…$/, ''), TRANSLATED_MAX - (trailing ? 1 : 0))

      return [id, core ? (trailing ? `${core}…` : core) : english]
    }),
  )
}
