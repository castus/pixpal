// A short line the robot says in a speech bubble, so a scene is not left to guesswork: how
// it feels while an emotion plays, and what it does while a tool runs. Rest scenes and the
// minis stay silent.
import type { Span } from './sprites.ts'

// The languages with built-in lines; `auto` picks one of them after the person's prompt.
export const LANGS = ['pl', 'en', 'de', 'es', 'fr', 'it', 'pt', 'uk', 'ru', 'ja', 'zh', 'ko'] as const
export type Lang = (typeof LANGS)[number]

// The names a built-in language answers to in /pixpal language, besides its code.
const LANG_NAMES: Record<Lang, string[]> = {
  pl: ['polish', 'polski'],
  en: ['english'],
  de: ['german', 'deutsch'],
  es: ['spanish', 'español', 'espanol'],
  fr: ['french', 'français', 'francais'],
  it: ['italian', 'italiano'],
  pt: ['portuguese', 'português', 'portugues'],
  uk: ['ukrainian', 'українська'],
  ru: ['russian', 'русский'],
  ja: ['japanese', '日本語'],
  zh: ['chinese', '中文'],
  ko: ['korean', '한국어'],
}

// Each built-in language under its own name, as the language picker lists it.
export const LANG_LABELS: Record<Lang, string> = {
  pl: 'Polski',
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  pt: 'Português',
  uk: 'Українська',
  ru: 'Русский',
  ja: '日本語',
  zh: '中文',
  ko: '한국어',
}

// Every line fits in 16 terminal columns once "…" is spelled as three dots (BUBBLE_W).
export const SAYINGS: Record<string, Record<Lang, string>> = {
  happy: { pl: 'Gotowe!', en: 'Done!', de: 'Fertig!', es: '¡Listo!', fr: 'Fini !', it: 'Fatto!', pt: 'Pronto!', uk: 'Готово!', ru: 'Готово!', ja: 'できた！', zh: '完成！', ko: '완료!' },
  cheer: { pl: 'Jupii!', en: 'Yay!', de: 'Juhu!', es: '¡Yupi!', fr: 'Youpi !', it: 'Evviva!', pt: 'Eba!', uk: 'Ура!', ru: 'Ура!', ja: 'やった！', zh: '耶！', ko: '야호!' },
  yes: { pl: 'Tak!', en: 'Yes!', de: 'Ja!', es: '¡Sí!', fr: 'Oui !', it: 'Sì!', pt: 'Sim!', uk: 'Так!', ru: 'Да!', ja: 'はい！', zh: '是的！', ko: '네!' },
  no: { pl: 'Nie…', en: 'Nope', de: 'Nö…', es: 'Nop…', fr: 'Non…', it: 'No…', pt: 'Não…', uk: 'Ні…', ru: 'Нет…', ja: 'いいえ…', zh: '不行…', ko: '아니…' },
  praise: { pl: 'Brawo!', en: 'Nice!', de: 'Super!', es: '¡Genial!', fr: 'Bravo !', it: 'Bravo!', pt: 'Boa!', uk: 'Клас!', ru: 'Класс!', ja: 'いいね！', zh: '真棒！', ko: '멋져!' },
  soso: { pl: 'Tak sobie', en: 'Sort of', de: 'Naja', es: 'Más o menos', fr: 'Bof', it: 'Così così', pt: 'Mais ou menos', uk: 'Так собі', ru: 'Так себе', ja: 'まあまあ', zh: '还行', ko: '그럭저럭' },
  shrug: { pl: 'Hmm…', en: 'Dunno', de: 'Keine Ahnung', es: 'Ni idea', fr: 'Aucune idée', it: 'Boh', pt: 'Sei lá', uk: 'Хтозна', ru: 'Не знаю', ja: 'さあ…', zh: '不知道', ko: '글쎄…' },
  ponder: { pl: 'I jak?', en: 'Well?', de: 'Und?', es: '¿Y bien?', fr: 'Alors ?', it: 'E allora?', pt: 'E aí?', uk: 'І як?', ru: 'И как?', ja: 'で？', zh: '然后呢？', ko: '그래서?' },
  stop: { pl: 'Stój!', en: 'Wait!', de: 'Halt!', es: '¡Espera!', fr: 'Attends !', it: 'Aspetta!', pt: 'Espera!', uk: 'Стій!', ru: 'Стой!', ja: '待って！', zh: '等等！', ko: '잠깐!' },
  contrite: { pl: 'Sorki…', en: 'Oops, sorry', de: 'Sorry…', es: 'Perdón…', fr: 'Pardon…', it: 'Scusa…', pt: 'Desculpa…', uk: 'Вибач…', ru: 'Прости…', ja: 'ごめん…', zh: '抱歉…', ko: '미안…' },
  shy: { pl: 'Och, dzięki', en: 'Aw, thanks', de: 'Oh, danke', es: 'Ay, gracias', fr: 'Oh, merci', it: 'Oh, grazie', pt: 'Ah, valeu', uk: 'Ой, дякую', ru: 'Ой, спасибо', ja: 'えへへ', zh: '谢谢啦', ko: '고마워' },
  relieved: { pl: 'Luzik', en: 'No worries', de: 'Kein Stress', es: 'Tranqui', fr: 'Tranquille', it: 'Tranquillo', pt: 'Tranquilo', uk: 'Спокійно', ru: 'Спокойно', ja: '大丈夫', zh: '没事', ko: '괜찮아' },
  oops: { pl: 'Ups!', en: 'Oops!', de: 'Hoppla!', es: '¡Uy!', fr: 'Oups !', it: 'Ops!', pt: 'Opa!', uk: 'Ой!', ru: 'Ой!', ja: 'おっと！', zh: '哎呀！', ko: '앗!' },
  surprised: { pl: 'Ojej!', en: 'Whoa!', de: 'Wow!', es: '¡Guau!', fr: 'Oh là là !', it: 'Wow!', pt: 'Uau!', uk: 'Овва!', ru: 'Ого!', ja: 'わあ！', zh: '哇！', ko: '와!' },
  hello: { pl: 'Cześć!', en: 'Hi!', de: 'Hallo!', es: '¡Hola!', fr: 'Salut !', it: 'Ciao!', pt: 'Oi!', uk: 'Привіт!', ru: 'Привет!', ja: 'やあ！', zh: '你好！', ko: '안녕!' },
  ufff: { pl: 'Uff…', en: 'Phew…', de: 'Puh…', es: 'Uf…', fr: 'Ouf…', it: 'Uff…', pt: 'Ufa…', uk: 'Фух…', ru: 'Фух…', ja: 'ふう…', zh: '呼…', ko: '휴…' },
}

// Latin-script languages: letters only that language uses, and its most common short words.
// English comes first, so a tie (or nothing found) stays English.
const LATIN: Array<[Lang, RegExp | undefined, Set<string>]> = [
  ['en', undefined, new Set(['the', 'is', 'are', 'and', 'to', 'it', 'this', 'that', 'please', 'what', 'you', 'of', 'for', 'with', 'can', 'why', 'how'])],
  ['pl', /[ąćęłńśźż]/i, new Set(['nie', 'tak', 'jest', 'czy', 'się', 'jak', 'co', 'to', 'już', 'może', 'dzięki', 'zrób', 'proszę', 'dlaczego'])],
  ['de', /[äöüß]/i, new Set(['und', 'ist', 'nicht', 'das', 'die', 'der', 'ich', 'bitte', 'mit', 'warum', 'wie', 'ein', 'eine', 'es'])],
  ['es', /[ñ¿¡]/i, new Set(['el', 'la', 'los', 'las', 'que', 'es', 'por', 'para', 'una', 'con', 'qué', 'cómo', 'gracias', 'está', 'hazlo'])],
  ['fr', /[œëîïûù]/i, new Set(['le', 'la', 'les', 'est', 'et', 'je', 'pas', 'une', 'des', 'pour', 'avec', 'ça', 'merci', 'pourquoi', 'ne'])],
  ['it', /[ìò]/i, new Set(['il', 'che', 'è', 'non', 'per', 'una', 'sono', 'con', 'grazie', 'perché', 'cosa', 'gli', 'della'])],
  ['pt', /[ãõ]/i, new Set(['o', 'os', 'que', 'não', 'é', 'um', 'uma', 'para', 'com', 'obrigado', 'você', 'isso', 'está'])],
]

// Ukrainian words Russian does not have, for a line without і, ї, є or ґ.
const UKRAINIAN_WORDS = /(?<!\p{L})(це|цю|що|як|чому|ласка)(?!\p{L})/iu

// The person's language, from the message they sent: the robot answers in kind. The script
// tells Korean, Japanese, Chinese and Cyrillic at once; a Latin language scores its letters
// and words.
export function langOf(text: string): Lang {
  if (/[ᄀ-ᇿ㄰-㆏가-힣]/.test(text)) {
    return 'ko'
  }

  if (/[぀-ヿ]/.test(text)) {
    return 'ja'
  }

  if (/[一-鿿]/.test(text)) {
    return 'zh'
  }

  if (/[Ѐ-ӿ]/.test(text)) {
    return /[іїєґ]/i.test(text) || UKRAINIAN_WORDS.test(text) ? 'uk' : 'ru'
  }

  const words = text.toLowerCase().match(/\p{L}+/gu) ?? []
  let best: Lang = 'en'
  let top = 0

  for (const [lang, letters, common] of LATIN) {
    const score = (letters?.test(text) ? 3 : 0) + words.filter(word => common.has(word)).length

    if (score > top) {
      best = lang
      top = score
    }
  }

  return best
}

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

    // a row shorter than the widest one has holes up to x, which map() would skip
    return toSpans(Array.from(out, cell => cell ?? { ch: ' ' }))
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
  thinking: { pl: 'Myślę…', en: 'Thinking…', de: 'Denke nach…', es: 'Pensando…', fr: 'Je réfléchis…', it: 'Penso…', pt: 'Pensando…', uk: 'Думаю…', ru: 'Думаю…', ja: '考え中…', zh: '思考中…', ko: '생각 중…' },
  read: { pl: 'Czytam…', en: 'Reading…', de: 'Lese…', es: 'Leyendo…', fr: 'Je lis…', it: 'Leggo…', pt: 'Lendo…', uk: 'Читаю…', ru: 'Читаю…', ja: '読んでる…', zh: '阅读中…', ko: '읽는 중…' },
  lens: { pl: 'Szukam…', en: 'Searching…', de: 'Suche…', es: 'Buscando…', fr: 'Je cherche…', it: 'Cerco…', pt: 'Buscando…', uk: 'Шукаю…', ru: 'Ищу…', ja: '探してる…', zh: '搜索中…', ko: '찾는 중…' },
  type: { pl: 'Piszę…', en: 'Writing…', de: 'Schreibe…', es: 'Escribiendo…', fr: "J'écris…", it: 'Scrivo…', pt: 'Escrevendo…', uk: 'Пишу…', ru: 'Пишу…', ja: '書いてる…', zh: '编写中…', ko: '쓰는 중…' },
  run: { pl: 'Odpalam…', en: 'Running…', de: 'Starte…', es: 'Ejecutando…', fr: 'Je lance…', it: 'Avvio…', pt: 'Executando…', uk: 'Запускаю…', ru: 'Запускаю…', ja: '実行中…', zh: '运行中…', ko: '실행 중…' },
  checklist: { pl: 'Testuję…', en: 'Testing…', de: 'Teste…', es: 'Probando…', fr: 'Je teste…', it: 'Testo…', pt: 'Testando…', uk: 'Тестую…', ru: 'Тестирую…', ja: 'テスト中…', zh: '测试中…', ko: '테스트 중…' },
  stamp: { pl: 'Testuję…', en: 'Testing…', de: 'Teste…', es: 'Probando…', fr: 'Je teste…', it: 'Testo…', pt: 'Testando…', uk: 'Тестую…', ru: 'Тестирую…', ja: 'テスト中…', zh: '测试中…', ko: '테스트 중…' },
  git: { pl: 'Git…', en: 'Git…', de: 'Git…', es: 'Git…', fr: 'Git…', it: 'Git…', pt: 'Git…', uk: 'Git…', ru: 'Git…', ja: 'Git…', zh: 'Git…', ko: 'Git…' },
  plan: { pl: 'Planuję…', en: 'Planning…', de: 'Plane…', es: 'Planeando…', fr: 'Je planifie…', it: 'Pianifico…', pt: 'Planejando…', uk: 'Планую…', ru: 'Планирую…', ja: '計画中…', zh: '规划中…', ko: '계획 중…' },
  idea: { pl: 'Uczę się…', en: 'Learning…', de: 'Lerne…', es: 'Aprendiendo…', fr: "J'apprends…", it: 'Imparo…', pt: 'Aprendendo…', uk: 'Вчуся…', ru: 'Учусь…', ja: '学習中…', zh: '学习中…', ko: '배우는 중…' },
  send: { pl: 'Wysyłam…', en: 'Sending…', de: 'Sende…', es: 'Enviando…', fr: "J'envoie…", it: 'Invio…', pt: 'Enviando…', uk: 'Надсилаю…', ru: 'Отправляю…', ja: '送信中…', zh: '发送中…', ko: '보내는 중…' },
  ask: { pl: 'Pytanie!', en: 'Question!', de: 'Frage!', es: '¡Pregunta!', fr: 'Question !', it: 'Domanda!', pt: 'Pergunta!', uk: 'Питання!', ru: 'Вопрос!', ja: '質問！', zh: '提问！', ko: '질문!' },
  clock: { pl: 'Ustawiam czas…', en: 'Scheduling…', de: 'Plane Zeit…', es: 'Programando…', fr: 'Je programme…', it: 'Programmo…', pt: 'Agendando…', uk: 'Ставлю таймер…', ru: 'Ставлю таймер…', ja: '予約中…', zh: '定时中…', ko: '예약 중…' },
  bell: { pl: 'Dzwonię!', en: 'Ping!', de: 'Ping!', es: '¡Ping!', fr: 'Ding !', it: 'Din don!', pt: 'Plim!', uk: 'Дзень!', ru: 'Дзынь!', ja: 'ピンポーン！', zh: '叮！', ko: '딩동!' },
  paint: { pl: 'Rysuję…', en: 'Drawing…', de: 'Zeichne…', es: 'Dibujando…', fr: 'Je dessine…', it: 'Disegno…', pt: 'Desenhando…', uk: 'Малюю…', ru: 'Рисую…', ja: '描いてる…', zh: '绘图中…', ko: '그리는 중…' },
  door: { pl: 'Przechodzę…', en: 'Switching…', de: 'Wechsle…', es: 'Cambiando…', fr: 'Je change…', it: 'Cambio…', pt: 'Trocando…', uk: 'Перемикаю…', ru: 'Переключаю…', ja: '切り替え中…', zh: '切换中…', ko: '전환 중…' },
  juggle: { pl: 'Deleguję…', en: 'Delegating…', de: 'Delegiere…', es: 'Delegando…', fr: 'Je délègue…', it: 'Delego…', pt: 'Delegando…', uk: 'Делегую…', ru: 'Делегирую…', ja: '任せてる…', zh: '委派中…', ko: '위임 중…' },
}

// The widest bubble any saying (emotion or work) needs past the picture, in terminal
// columns: the gap column, two spaces of padding each side, the text, and the shadow column.
export const bubbleWidthOf = (lines: string[]) => Math.max(0, ...lines.map(line => cellWidth(spelled(line)))) + 6
export const BUBBLE_W = bubbleWidthOf([...Object.values(SAYINGS), ...Object.values(WORK_SAYINGS)].flatMap(s => Object.values(s)))

// The built-in lines of a language named in /pixpal language ('german', 'Deutsch' or 'de'),
// as a phrasebook by scene id; undefined for a language without built-in lines.
export function builtInBook(name: string): Record<string, string> | undefined {
  const key = name.trim().toLowerCase()
  const lang = LANGS.find(code => code === key || LANG_NAMES[code].includes(key))

  return lang && Object.fromEntries([...Object.entries(SAYINGS), ...Object.entries(WORK_SAYINGS)].map(([id, line]) => [id, line[lang]]))
}

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
