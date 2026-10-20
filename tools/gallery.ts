// Draws every Pixpal scene in a grid, each labelled with its id, in a true-color
// terminal. Scenes animate in place until Ctrl+C; --still prints one frame and exits;
// --pl or --en adds the speech bubble each emotion or work scene says, in that language;
// --light draws the light theme; --cat (or any skin's name) draws that skin.
//
//   node --experimental-strip-types tools/gallery.ts [--still] [--light] [--<skin>] [--pl | --en] [filter]
import { BUBBLE_W, SAYINGS, withBubble, WORK_SAYINGS, type Lang } from '../hooks/sayings.ts'
import { ANIMS } from '../hooks/scenes.ts'
import { FRAME_W, frameIndex, framePx, halfBlock, SKINS, type SkinId, type Span, type Theme } from '../hooks/sprites.ts'

const GAP = 2
const TICK_MS = 80
const args = process.argv.slice(2)
const isStill = args.includes('--still')
const theme: Theme = args.includes('--light') ? 'light' : 'dark'
// --<skin> (e.g. --cat) draws every scene as that skin
const skin = (Object.keys(SKINS) as SkinId[]).find(id => args.includes(`--${id}`)) ?? 'robot'
const lang: Lang | undefined = args.includes('--pl') ? 'pl' : args.includes('--en') ? 'en' : undefined
const filter = args.find(arg => !arg.startsWith('--')) ?? ''
// with a language, only the scenes that speak
const sayingOf = (id: string) => SAYINGS[id] ?? WORK_SAYINGS[id]
const ids = Object.keys(ANIMS).filter(id => id.includes(filter) && (!lang || sayingOf(id)))
const TILE_W = FRAME_W + (lang ? BUBBLE_W : 0)
const perRow = Math.max(1, Math.floor(((process.stdout.columns ?? 120) + GAP) / (TILE_W + GAP)))

const rgb = (hex: string) => hex.slice(1).match(/../g)!.map(v => parseInt(v, 16)).join(';')

const widthOf = (spans: Span[]) => spans.reduce((n, s) => n + [...s.text].length, 0)

// one row in color, padded to the tile width so the columns line up
const paint = (spans: Span[]) =>
  spans.map(s => `${s.color ? `\x1b[38;2;${rgb(s.color)}m` : ''}${s.bg ? `\x1b[48;2;${rgb(s.bg)}m` : ''}${s.text}\x1b[0m`).join('') +
  ' '.repeat(Math.max(0, TILE_W - widthOf(spans)))

function tile(id: string, elapsed: number): string[] {
  const frames = ANIMS[id]!.frames
  const index = isStill ? Math.floor(frames.length / 2) : frameIndex(frames, elapsed)
  const label = id.slice(0, TILE_W)
  const rows = halfBlock(framePx(frames[index]!, skin), theme, skin)
  const saying = lang && sayingOf(id)?.[lang]

  return [...(saying ? withBubble(rows, saying) : rows).map(paint), `\x1b[1m${label}\x1b[0m${' '.repeat(TILE_W - label.length)}`]
}

function draw(elapsed: number): string {
  const lines: string[] = []

  for (let i = 0; i < ids.length; i += perRow) {
    const tiles = ids.slice(i, i + perRow).map(id => tile(id, elapsed))

    for (let row = 0; row < tiles[0]!.length; row++) {
      lines.push(tiles.map(t => t[row]).join(' '.repeat(GAP)))
    }

    lines.push('')
  }

  return lines.join('\n')
}

if (isStill) {
  console.log(draw(0))
} else {
  const start = Date.now()

  process.stdout.write('\x1b[?25l\x1b[2J')
  process.on('SIGINT', () => {
    process.stdout.write('\x1b[?25h\n')
    process.exit(0)
  })
  setInterval(() => process.stdout.write(`\x1b[H${draw(Date.now() - start)}`), TICK_MS)
}
