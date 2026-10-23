import { expect, test } from 'claude-code/testing'

import { answerWindow, buildClassifierPrompt, EMOTIONS, parseEmotion } from './classifier.ts'
import { FIXTURES } from './fixtures.ts'
import { GOLDEN } from './golden.ts'
import { draftAfter, isTestCommand, restForDate, sceneForAnswer, sceneForCommand, sceneForExchange, sceneForTool } from './mood.ts'
import { BUBBLE_W, builtInBook, cellWidth, DOT_MS, ENGLISH_LINES, LANGS, langOf, parseTranslation, SAYINGS, shownText, TYPE_MS, withBubble, WORK_SAYINGS } from './sayings.ts'
import { ANIMS, durationOfScene } from './scenes.ts'
import { bandWidth, compose, framePx, SKINS, systemThemeOf, fitRows, FRAME_W, halfBlock, MINI_LIMIT, PALETTE, H, W, withMinis } from './sprites.ts'

test('what the user wrote only matters when the answer says nothing special', () => {
  expect(sceneForExchange('znowu??', 'Gotowe.', false)).toBe('contrite')
  expect(sceneForExchange('DLACZEGO TO NIE DZIAŁA', 'Gotowe.', false)).toBe('contrite')
  expect(sceneForExchange('przepraszam, mój błąd', 'Gotowe.', false)).toBe('relieved')
  expect(sceneForExchange('dzięki, super', 'Gotowe.', false)).toBe('shy')
  expect(sceneForExchange('cześć!', 'Gotowe.', false)).toBe('hello')
  expect(sceneForExchange('znowu??', 'Nie, to nie tak.', false)).toBe('no')
  expect(sceneForExchange('Napisz funkcję sortującą', 'Gotowe.', false)).toBe('happy')
  expect(sceneForExchange('cokolwiek', 'Gotowe.', true)).toBe('surprised')
})

test('answers map to reactions', () => {
  expect(sceneForAnswer('Nie, to nie tak.', false)).toBe('no')
  expect(sceneForAnswer('Prawie dobrze, ale brakuje jednego.', false)).toBe('soso')
  expect(sceneForAnswer('Masz rację, poprawiam.', false)).toBe('yes')
  expect(sceneForAnswer('Nie jestem pewien, co to robi.', false)).toBe('shrug')
  expect(sceneForAnswer('Którą wersję wybrać?', false)).toBe('ponder')
  expect(sceneForAnswer('Gotowe.', false)).toBe('happy')
  expect(sceneForAnswer('Stop — coś się zmieniło pod nami.', false)).toBe('stop')
  expect(sceneForAnswer('Tak, zapisałem oba pliki.', false)).toBe('yes')
  expect(sceneForAnswer('Nie mam tego w pamięci.', false)).toBe('no')
  expect(sceneForAnswer('Dobry catch — masz rację, to sprzeczne.', false)).toBe('praise')
  expect(sceneForAnswer('cokolwiek', true)).toBe('surprised')
})

test('tools map to the scene of what they do', () => {
  expect(sceneForTool('Read')).toBe('read')
  expect(sceneForTool('Edit')).toBe('type')
  expect(sceneForTool('Agent')).toBe('juggle')
  expect(sceneForTool('Skill')).toBe('idea')
  expect(sceneForTool('AskUserQuestion')).toBe('ask')
  expect(sceneForTool('EnterWorktree')).toBe('door')
  expect(sceneForTool('mcp__x__y')).toBe('thinking')
})

test('a shell command is shown as what it really does', () => {
  expect(sceneForTool('Bash', 'git status')).toBe('git')
  expect(sceneForTool('Bash', 'curl -s https://example.com')).toBe('send')
  expect(sceneForTool('Bash', 'grep -rn foo src')).toBe('lens')
  expect(sceneForTool('Bash', 'ls -la')).toBe('read')
  expect(sceneForTool('Bash', 'npm run build')).toBe('run')
  expect(sceneForTool('Bash', 'echo hi')).toBe('type')
  expect(sceneForTool('Bash')).toBe('type')
  expect(isTestCommand('claude plugin test .')).toBe(true)
  expect(sceneForCommand('pytest -q', () => 0)).toBe('checklist')
  expect(sceneForCommand('pytest -q', () => 0.5)).toBe('stamp')
  expect(sceneForCommand('pytest -q', () => 0.99)).toBe('stamp')
})

test('rest scene follows the clock', () => {
  expect(restForDate(new Date(2026, 9, 12, 23, 0))).toBe('night')
  expect(restForDate(new Date(2026, 9, 12, 12, 0))).toBe('monday')
  expect(restForDate(new Date(2026, 9, 16, 12, 0))).toBe('friday')
  expect(restForDate(new Date(2026, 9, 14, 12, 0))).toBe('idle')
})

test('every frame is a valid 24x12 grid of known colors', () => {
  for (const [name, anim] of Object.entries(ANIMS)) {
    for (const frame of anim.frames) {
      expect(frame.px.length, name).toBe(H)

      for (const row of frame.px) {
        expect(row.length, name).toBe(W)
        expect([...row].every(key => key === '.' || key in PALETTE), name).toBe(true)
      }
    }
  }
})

test('the classifier reply is parsed to a known id', () => {
  expect(parseEmotion('contrite')).toBe('contrite')
  expect(parseEmotion('  Shy.\n')).toBe('shy')
  expect(parseEmotion('I think: no')).toBe('no')
  expect(parseEmotion('???')).toBeUndefined()
  expect(buildClassifierPrompt('a'.repeat(900), 'b').length).toBeLessThan(700)
  expect(answerWindow('x'.repeat(2000))).toContain('[...]')
  expect(answerWindow('short')).toBe('short')
})

test('every eval fixture expects a known emotion with a scene', () => {
  for (const fixture of FIXTURES) {
    for (const id of fixture.expect.split('/')) {
      expect(EMOTIONS.includes(id), fixture.user).toBe(true)
      expect(id in ANIMS, id).toBe(true)
    }
  }
})

test('a scene lasts as long as its frames times its repeats', () => {
  const frames = ANIMS.ufff!.frames.reduce((sum, frame) => sum + frame.ms, 0)

  expect(durationOfScene('ufff')).toBe(frames)
  expect(durationOfScene('yes')).toBe(ANIMS.yes!.frames.reduce((sum, frame) => sum + frame.ms, 0) * 2)
  expect(durationOfScene('nonexistent')).toBe(0)
})


test('a short band drops the gap, the wheels and the antenna first and keeps eyes and mouth', () => {
  const rows = [0, 1, 2, 3, 4, 5, 6]
  expect(halfBlock(compose({}))).toHaveLength(rows.length)
  expect(fitRows(rows, 7)).toEqual(rows)
  expect(fitRows(rows, 6)).toEqual([1, 2, 3, 4, 5, 6])
  expect(fitRows(rows, 4)).toEqual([2, 3, 4, 5])
  expect(fitRows(rows, 3)).toEqual([2, 3, 4])
  expect(fitRows(rows, 2)).toEqual([3, 4])
  expect(fitRows(rows, 0)).toEqual([])
})

test('the draft after an edit is the text with the typed part spliced in', () => {
  expect(draftAfter({ text: 'helo', start: 3, end: 3, inputText: 'l' })).toBe('hello')
  expect(draftAfter({ text: 'hello', start: 0, end: 5, inputText: '' })).toBe('')
  expect(draftAfter({ text: 'ab', start: 1, end: 2, inputText: 'xyz' })).toBe('axyz')
})

test('minis widen the frame up to the limit, and the band leaves room for +N', () => {
  const px = compose({})
  const miniWidth = (bandWidth(1) - FRAME_W)

  expect(withMinis(px, 0, 0)).toEqual(px)
  expect(withMinis(px, 2, 0)[0]!.length).toBe(W + 2 * miniWidth)
  expect(withMinis(px, MINI_LIMIT + 3, 0)[0]!.length).toBe(W + MINI_LIMIT * miniWidth)
  expect(withMinis(px, 3, 0)).toHaveLength(H)
  expect(bandWidth(MINI_LIMIT + 3)).toBe(bandWidth(MINI_LIMIT) + 4)
  // the panel and the drawn rows grow with the minis
  expect(halfBlock(withMinis(px, 2, 0))[0]!.reduce((n, s) => n + s.text.length, 0)).toBe(bandWidth(2))
})

test('neighboring minis blink out of step', () => {
  const row = withMinis(compose({}), 2, 0)[H - 8]!
  const tips = row.slice(W).replace(/\./g, '')

  expect(tips).toBe('aagg')
})

test('the owl minis wear its ear tufts instead of the robot antenna', () => {
  const top = H - 8
  const owl = withMinis(compose({}), 1, 0, 'owl')
  const robot = withMinis(compose({}), 1, 0)

  expect(owl[top]!.slice(W + 2)).toBe('H......H')
  expect(owl[top + 1]!.slice(W + 2)).toBe('.HH..HH.')
  expect(robot[top]!.slice(W + 2)).toBe('...aa...')
})

test('emotions say a short line in the language the person wrote in', () => {
  expect(langOf('zrób to proszę')).toBe('pl')
  expect(langOf('ok, to działa')).toBe('pl')
  expect(langOf('please run the tests')).toBe('en')
  expect(langOf('go to the store')).toBe('en')
  expect(langOf('Bitte führe die Tests aus')).toBe('de')
  expect(langOf('¿Por qué no funciona?')).toBe('es')
  expect(langOf('je ne sais pas pourquoi ça plante')).toBe('fr')
  expect(langOf('perché non funziona il test?')).toBe('it')
  expect(langOf('você pode corrigir isso?')).toBe('pt')
  expect(langOf('Виправ цю помилку, будь ласка')).toBe('uk')
  expect(langOf('Исправь эту ошибку, пожалуйста')).toBe('ru')
  expect(langOf('テストを実行してください')).toBe('ja')
  expect(langOf('请运行测试')).toBe('zh')
  expect(langOf('테스트를 실행해 주세요')).toBe('ko')
  for (const id of EMOTIONS) {
    for (const lang of LANGS) {
      expect(SAYINGS[id]?.[lang].length).toBeGreaterThan(0)
    }
  }
})

test('a built-in language is found by its code or name and needs no translation', () => {
  expect(builtInBook('de')?.happy).toBe('Fertig!')
  expect(builtInBook('German')?.thinking).toBe('Denke nach…')
  expect(builtInBook(' 日本語 ')?.happy).toBe('できた！')
  expect(Object.keys(builtInBook('french')!).sort()).toEqual(Object.keys(ENGLISH_LINES).sort())
  expect(builtInBook('klingon')).toBeUndefined()
})

test('the bubble stands beside the band and adds at most BUBBLE_W columns', () => {
  const width = (row: Array<{ text: string }>) => row.reduce((n, s) => n + [...s.text].length, 0)
  const band = halfBlock(compose({}))
  const lines = [...Object.values(SAYINGS), ...Object.values(WORK_SAYINGS)].flatMap(s => Object.values(s))
  const longest = Math.max(...lines.map(text => Math.max(...withBubble(band, text).map(width))))

  expect(withBubble(band, 'Jupii!')).toHaveLength(band.length)
  expect(longest).toBe(width(band[0]!) + BUBBLE_W)
  expect(withBubble(band.slice(0, 2), 'Jupii!')).toHaveLength(2)
})

test('every work scene has a plain line in every built-in language', () => {
  for (const scene of ['thinking', 'read', 'lens', 'type', 'run', 'checklist', 'stamp', 'git', 'plan', 'ask']) {
    for (const lang of LANGS) {
      expect(WORK_SAYINGS[scene]?.[lang].length).toBeGreaterThan(0)
    }
  }
})

test('the bubble types its line out, then the three dots go round', () => {
  expect(shownText('Jupii!', 0)).toBe('J     ')
  expect(shownText('Jupii!', 2 * TYPE_MS)).toBe('Jup   ')
  expect(shownText('Jupii!', 10_000)).toBe('Jupii!')
  const done = 'Myślę...'.length * TYPE_MS
  expect(shownText('Myślę…', done)).toBe('Myślę...')
  expect(shownText('Myślę…', done + DOT_MS)).toBe('Myślę   ')
  expect(shownText('Myślę…', done + 2 * DOT_MS)).toBe('Myślę.  ')
  expect(shownText('Myślę…', done + 3 * DOT_MS)).toBe('Myślę.. ')
  expect(shownText('Myślę…', done + 4 * DOT_MS)).toBe('Myślę...')
  expect(shownText('Myślę…', Number.POSITIVE_INFINITY)).toBe('Myślę...')
})

test('the light theme recolors the robot and its panel, with no color left undefined', () => {
  const colors = (theme: 'dark' | 'light') => halfBlock(compose({ props: [['fence', 0, 9]] }), theme).flat().flatMap(s => [s.color, s.bg]).filter(Boolean)

  expect(colors('light')).not.toEqual(colors('dark'))
  expect(colors('light').every(c => /^#[0-9a-f]{6}$/.test(c!))).toBe(true)
})

test('the auto theme reads macOS appearance and falls back to dark', () => {
  expect(systemThemeOf(0, 'Dark\n', '')).toBe('dark')
  expect(systemThemeOf(1, '', 'The domain/default pair of (kCFPreferencesAnyApplication, AppleInterfaceStyle) does not exist')).toBe('light')
  expect(systemThemeOf(127, '', 'defaults: command not found')).toBe('dark')
})

// FNV-1a over a scene's frames: the same hash hooks/golden.ts was recorded with.
const fnv = (text: string) => {
  let hash = 0x811c9dc5

  for (const ch of text) {
    hash ^= ch.codePointAt(0)!
    hash = Math.imul(hash, 0x01000193) >>> 0
  }

  return hash.toString(16).padStart(8, '0')
}

test('the robot draws every scene exactly as recorded (golden frames)', () => {
  for (const [id, anim] of Object.entries(ANIMS)) {
    expect([id, fnv(anim.frames.map(frame => `${frame.ms}:${frame.px.join('/')}`).join('|'))]).toEqual([id, GOLDEN[id]])
  }
})

test('every skin draws every scene with colors it knows', () => {
  for (const skin of Object.keys(SKINS) as Array<keyof typeof SKINS>) {
    for (const anim of Object.values(ANIMS)) {
      for (const frame of anim.frames) {
        const colors = halfBlock(framePx(frame, skin), 'dark', skin).flat().flatMap(s => [s.color, s.bg]).filter(Boolean)

        expect(colors.every(c => /^#[0-9a-f]{6}$/.test(c!))).toBe(true)
      }
    }
  }
})

test('a translated phrasebook keeps every line, short, with its ellipsis', () => {
  const book = parseTranslation('Sure! {"happy": "Terminé !", "thinking": "Je réfléchis...", "soso": "Bof, c\'est très très très long vraiment"}')!

  expect(Object.keys(book)).toEqual(Object.keys(ENGLISH_LINES))
  expect(book.happy).toBe('Terminé !')
  expect(book.thinking).toBe('Je réfléchis…')
  expect(cellWidth(book.soso!)).toBeLessThanOrEqual(16)
  expect(book.cheer).toBe(ENGLISH_LINES.cheer)
  expect(parseTranslation('no json here')).toBeUndefined()
})

test('wide letters take two columns, and the bubble lines up around them', () => {
  const width = (row: Array<{ text: string }>) => row.reduce((n, s) => n + cellWidth(s.text), 0)

  expect(cellWidth('完了！')).toBe(6)
  expect(new Set(withBubble(halfBlock(compose({})), '完了！').slice(0, 3).map(width)).size).toBe(1)
  expect(cellWidth(shownText('考え中…', 0))).toBe(cellWidth('考え中...'))
})
