// Pixel-art robot mascot engine. A frame is 12 rows of 24 palette keys
// ('.' = transparent); two pixel rows make one terminal row (see halfBlock).
export const W = 24
export const H = 12

export const PALETTE: Record<string, string> = {
  H: '#8fa3b8',
  G: '#5e7088',
  K: '#0f1b2d',
  c: '#59f0ff',
  r: '#ff5f6d',
  m: '#6b7a8f',
  T: '#3f4f66',
  a: '#ffb703',
  g: '#7a5c10',
  w: '#22262f',
  // the wheels (feet): a slate gray light enough to show on the dark panel
  k: '#5a6478',
  W: '#f4f7fa',
  v: '#c3ccd6',
  j: '#a9b4c2',
  f: '#c8a27a',
  F: '#9c7a54',
  u: '#55555f',
  p: '#ff7eb6',
  y: '#ffd23f',
  o: '#ff8c42',
  b: '#4ea8ff',
  e: '#5fe08c',
  // the chest light in standby, dim and half lit (c is fully lit)
  d: '#1d4f57',
  q: '#2fa3b3',
}

// px is the robot's picture; other skins draw the same pose on demand (framePx).
export type Frame = { px: string[]; ms: number; pose: Pose }
export type Span = { text: string; color?: string; bg?: string }

type Eyes = 'star' | 'sad' | 'open' | 'peek' | 'peekL' | 'peekR' | 'blink' | 'happy' | 'left' | 'right' | 'up' | 'down' | 'wide' | 'heart' | 'angry' | 'x' | 'weighL' | 'weighR' | 'off'
type Mouth = 'frown' | 'smile' | 'flat' | 'grim' | 'o' | 'open' | 'zig' | 'skewL' | 'skewR' | 'none'
type Place = [name: string, x: number, y: number]

export type Pose = {
  dx?: number
  dy?: number
  // head-only offsets: lean sideways, nod up and down
  lean?: number
  // head tilt: the upper part of the head shifts sideways, the chin stays
  tilt?: number
  nod?: number
  eyes?: Eyes
  mouth?: Mouth
  tone?: string
  antenna?: 'a' | 'g' | 'y'
  // a taller antenna: one more stem pixel under the tip
  antennaUp?: boolean
  wave?: 'A' | 'B' | 'both'
  // both forearms out to the sides at shoulder height, palms up
  shrug?: boolean
  // the right hand holds a prop beside the body, so its small resting hand is hidden
  holding?: boolean
  wheel?: 0 | 1 | 2
  // props at absolute canvas positions / relative to the body's top-left corner
  props?: Place[]
  on?: Place[]
}

// Screen pixels are [row, col] inside the 14-wide head; rows 0-3 are body rows 3-6.
// An optional third entry overrides the pixel's color key.
const EYE_PIXELS: Record<Eyes, Array<[number, number, string?]>> = {
  // gray eyes with the pupil on the bottom row: looking down
  peekL: [[0, 3, 'j'], [0, 4, 'j'], [1, 3, 'j'], [1, 4, 'j'], [2, 3], [2, 4, 'j'], [0, 8, 'j'], [0, 9, 'j'], [1, 8, 'j'], [1, 9, 'j'], [2, 8], [2, 9, 'j']],
  peekR: [[0, 3, 'j'], [0, 4, 'j'], [1, 3, 'j'], [1, 4, 'j'], [2, 3, 'j'], [2, 4], [0, 8, 'j'], [0, 9, 'j'], [1, 8, 'j'], [1, 9, 'j'], [2, 8, 'j'], [2, 9]],
  peek: [[0, 3, 'j'], [0, 4, 'j'], [1, 3, 'j'], [1, 4, 'j'], [2, 3], [2, 4], [0, 8, 'j'], [0, 9, 'j'], [1, 8, 'j'], [1, 9, 'j'], [2, 8], [2, 9]],
  open: [[0, 4], [1, 4], [0, 9], [1, 9]],
  blink: [[1, 3], [1, 4], [1, 9], [1, 10]],
  happy: [[0, 4], [1, 3], [1, 5], [0, 9], [1, 8], [1, 10]],
  left: [[0, 3], [1, 3], [0, 8], [1, 8]],
  right: [[0, 5], [1, 5], [0, 10], [1, 10]],
  up: [[0, 5], [0, 10]],
  down: [[1, 4], [1, 9]],
  wide: [[0, 3], [0, 4], [1, 3], [1, 4], [0, 8], [0, 9], [1, 8], [1, 9]],
  heart: [[0, 3], [0, 5], [1, 4], [0, 8], [0, 10], [1, 9]],
  angry: [[0, 3], [1, 4], [1, 8], [0, 9]],
  // yellow sparkles instead of pupils: impressed
  star: [[0, 4, 'y'], [1, 3, 'y'], [1, 4, 'y'], [1, 5, 'y'], [2, 4, 'y'], [0, 9, 'y'], [1, 8, 'y'], [1, 9, 'y'], [1, 10, 'y'], [2, 9, 'y']],
  // brows slanting up towards the middle: worried, sorry
  sad: [[1, 3], [0, 4], [0, 8], [1, 9]],
  x: [[0, 3], [0, 5], [1, 4], [2, 3], [2, 5], [0, 8], [0, 10], [1, 9], [2, 8], [2, 10]],
  // one eye open, the other squinting: weighing something up
  weighL: [[0, 4], [1, 4], [1, 9], [1, 10]],
  weighR: [[1, 3], [1, 4], [0, 9], [1, 9]],
  // the screen is off: only faint gray dashes where the eyes were
  off: [[1, 3, 'u'], [1, 4, 'u'], [1, 9, 'u'], [1, 10, 'u']],
}

const MOUTH_PIXELS: Record<Mouth, Array<[number, number]>> = {
  smile: [[2, 3], [2, 10], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9]],
  flat: [[3, 5], [3, 6], [3, 7], [3, 8]],
  frown: [[2, 4], [2, 5], [2, 6], [2, 7], [2, 8], [2, 9], [3, 3], [3, 10]],
  grim: [[3, 3], [3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9], [3, 10]],
  o: [[2, 6], [2, 7], [3, 6], [3, 7]],
  open: [[2, 5], [2, 6], [2, 7], [2, 8], [3, 5], [3, 6], [3, 7], [3, 8]],
  zig: [[3, 3], [2, 4], [3, 5], [2, 6], [3, 7], [2, 8], [3, 9], [2, 10]],
  // a slanted mouth, one corner up: "hmm, partly"
  skewL: [[2, 5], [2, 6], [3, 7], [3, 8], [3, 9]],
  skewR: [[3, 4], [3, 5], [3, 6], [2, 7], [2, 8]],
  none: [],
}

const SCREEN = ['HHKKKKKKKKKKHH', 'HHKKKKKKKKKKHH', 'HHKKKKKKKKKKHH', 'HHKKKKKKKKKKHH']

function screenRows(eyes: Eyes, mouth: Mouth, tone: string, screen: string[] = SCREEN): string[] {
  const rows = screen.map(row => row.split(''))
  const eyeKey = eyes === 'heart' ? 'p' : tone

  for (const [r, c, key] of EYE_PIXELS[eyes]) {
    rows[r]![c] = key ?? eyeKey
  }

  for (const [r, c] of MOUTH_PIXELS[mouth]) {
    rows[r]![c] = tone
  }

  return rows.map(r => r.join(''))
}

const cloud = (dots: number) => ['.WWW.', `W${'u'.repeat(dots)}${'W'.repeat(4 - dots)}`, '.WWW.', 'W....']

// A clock face whose single red hand points up, right, down or left.
const CLOCK_HAND: Array<[number, number]> = [[1, 2], [2, 3], [3, 2], [2, 1]]
const clock = (hand: number) => {
  const rows = ['.WWW.', 'W...W', 'W.c.W', 'W...W', '.WWW.'].map(r => r.split(''))
  const [r, c] = CLOCK_HAND[hand % CLOCK_HAND.length]!
  rows[r]![c] = 'r'

  return rows.map(r => r.join(''))
}

// A small canvas whose three cells fill with paint one after the other.
const PAINT = ['r', 'y', 'b']
const canvas = (filled: number) => {
  const rows = ['WWWWW', 'W...W', 'WWWWW'].map(r => r.split(''))

  PAINT.slice(0, filled).forEach((color, i) => {
    rows[1]![1 + i] = color
  })

  return rows.map(r => r.join(''))
}

// A clipboard whose first `checked` items are ticked off in green.
const clipboard = (checked: number) => {
  const rows = ['.mmm.', 'WWWWW']

  for (let item = 0; item < 3; item++) {
    rows.push(`W${item < checked ? 'e' : 'W'}uuW`, 'WWWWW')
  }

  return rows
}

const BOARD_PATH: Array<[number, number]> = [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2]]
const board = (n: number) => {
  const rows = ['WWWWW', 'W...W', 'W...W', 'W...W', 'WWWWW'].map(r => r.split(''))

  BOARD_PATH.slice(0, n).forEach(([r, c]) => {
    rows[r]![c] = 'c'
  })

  return rows.map(r => r.join(''))
}

// An open book lying in front of the robot, seen from the side at eye level (14 x 8): two
// stacks of pages (white) on a brown cover, a gray spine in the gutter. A turning page is
// a five-pixel line from the spine at `angle` degrees: 0 lies on the right stack, 90
// stands up, 180 lies on the left stack.
const BOOK_SLAB = ['.WWWWW..WWWWW.', 'WWWWWWmmWWWWWW', 'FFFFFFFFFFFFFF']
const PAGE_LENGTH = 5

function sideBook(angle?: number): string[] {
  const rows = [...Array.from({ length: PAGE_LENGTH }, () => '.'.repeat(14)), ...BOOK_SLAB].map(row => row.split(''))

  if (angle !== undefined) {
    const rad = (angle * Math.PI) / 180
    const pivot = angle <= 90 ? 7 : 6

    for (let k = 1; k <= PAGE_LENGTH; k++) {
      const x = pivot + Math.round(k * Math.cos(rad))
      const y = PAGE_LENGTH - Math.round(k * Math.sin(rad))

      if (rows[y]?.[x] !== undefined) {
        rows[y]![x] = 'W'
      }
    }
  }

  return rows.map(row => row.join(''))
}

export const PROPS: Record<string, string[]> = {
  cloud0: cloud(0),
  cloud1: cloud(1),
  cloud2: cloud(2),
  cloud3: cloud(3),
  cross: ['r.r', '.r.', 'r.r'],
  clock0: clock(0),
  clock1: clock(1),
  clock2: clock(2),
  clock3: clock(3),
  canvas0: canvas(0),
  canvas1: canvas(1),
  canvas2: canvas(2),
  canvas3: canvas(3),
  // a letter with its flap drawn in gray, big enough to read as an envelope
  envelope: ['WWWWWWW', 'WmWWWmW', 'WWmWmWW', 'WWWmWWW', 'WWWWWWW'],
  bell: ['.yy.', 'yyyy', 'yyyy', 'yyyy', 'yyyy', '.rr.'],
  bulbOff: ['.vvv.', 'vvvvv', 'vvvvv', '.vvv.', '..u..'],
  bulbOn: ['.yyy.', 'yyyyy', 'yyyyy', '.yyy.', '..u..'],
  door0: ['ffff', 'fFFf', 'fFFf', 'fFFy', 'fFFf', 'fFFf', 'fFFf', 'ffff'],
  door1: ['ffff', 'fKKK', 'fKKK', 'fKKK', 'fKKK', 'fKKK', 'fKKK', 'ffff'],
  door2: ['ffff', 'KyyK', 'KyyK', 'KyyK', 'KyyK', 'KyyK', 'KyyK', 'ffff'],
  blush: ['p'],
  clip0: clipboard(0),
  clip1: clipboard(1),
  clip2: clipboard(2),
  clip3: clipboard(3),
  paper: ['WWWW', 'WWWW', 'WWWW'],
  paperOk: ['WWWW', 'WrrW', 'WWWW'],
  stamp: ['mm', 'mm', 'rr'],
  puff: ['.uu.', 'uuuu', '.uu.'],
  stopSign: ['.rrr.', 'rrrrr', 'rWWWr', 'rrrrr', '.rrr.'],
  lens: ['.WWW.', 'WcW.W', 'W...W', '.WWW.', '....m', '.....m'],
  q: ['.WW.', 'W..W', '..W.', '....', '.W..'],
  ex: ['W', 'W', 'W', '.', 'W'],
  heart: ['.p.p.', 'ppppp', 'ppppp', '.ppp.', '..p..'],
  z: ['WWW', '..W', '.W.', 'W..', 'WWW'],
  zs: ['WWW', '.W.', 'WWW'],
  // the chest light over the two cyan torso pixels: dim, half lit
  ledDim: ['dd'],
  ledHalf: ['qq'],
  spark: ['.y.', 'yyy', '.y.'],
  star: ['y.y', '.y.', 'y.y'],
  // binary digits for the run scene, in green: a rounded zero, and a one with a flag and a
  // foot (a bare stroke would read as a raised finger)
  bit0: ['.e.', 'e.e', 'e.e', 'e.e', '.e.'],
  bit1: ['.e.', 'ee.', '.e.', '.e.', 'eee'],
  // the open book from the side, and its turning page at 15 to 165 degrees
  book: sideBook(),
  bookPage15: sideBook(15),
  bookPage50: sideBook(50),
  bookPage90: sideBook(90),
  bookPage130: sideBook(130),
  bookPage165: sideBook(165),
  keysA: ['wwwwwwwwww', 'wcwcwcwcwc'],
  keysB: ['wwwwwwwwww', 'cwcwcwcwcw'],
  hand: ['mm'],
  // a fence across the bottom three rows, one flat color: the panel's lightest shade from
  // its top (n), so it stands out against the darker bottom of the panel like a piece of
  // the backdrop pulled forward; the hands grip its top edge
  fence: ['nnnnnnnnnnnnnnnnnnnnnnnn', 'nnnnnnnnnnnnnnnnnnnnnnnn', 'nnnnnnnnnnnnnnnnnnnnnnnn'],
  fenceHandA: ['.mmm.', 'mmmmm', 'm.m.m'],
  fenceHandB: ['.mmm.', 'mmmmm', '.m.m.'],
  blkE: ['ee', 'ee'],
  blkB: ['bb', 'bb'],
  blkO: ['oo', 'oo'],
  speed: ['uuu.', '....', '.uuu', '....', 'uu..'],
  mug: ['WWWW', 'WbbW', '.WW.'],
  steam0: ['u.', '.u'],
  steam1: ['.u', 'u.'],
  cap: ['..bbbbWW..', '.bbbbbbbb.'],
  party: ['.....y....', '....ppp...'],
  thumb: ['..m..', '..mm.', 'mmmmm', 'mmmmm', '.mmm.'],
  // a speech bubble with a wiggling "~" inside
  wave0: ['.WWW.', 'WuWuW', 'WWuWW', '.WWW.', 'W....'],
  // a speech bubble asking the person something: a question mark, its dot on or off
  askBubble: ['.WWW.', 'WuuWW', 'WWWuW', 'WWuWW', 'WWWWW', 'WWuWW', '.WWW.', 'W....'],
  askBubbleDim: ['.WWW.', 'WuuWW', 'WWWuW', 'WWuWW', 'WWWWW', 'WWWWW', '.WWW.', 'W....'],
  wave1: ['.WWW.', 'WWuWW', 'WuWuW', '.WWW.', 'W....'],
  ballY: ['y'],
  ballP: ['p'],
  ballB: ['b'],
  board0: board(0),
  board1: board(1),
  board2: board(2),
  board3: board(3),
  board4: board(4),
  board5: board(5),
  board6: board(6),
}

function stamp(canvas: string[][], rows: string[], x: number, y: number) {
  rows.forEach((row, j) => {
    ;[...row].forEach((key, i) => {
      if (key !== '.' && canvas[y + j]?.[x + i] !== undefined) {
        canvas[y + j]![x + i] = key
      }
    })
  })
}

const TILT_ROWS = 6

const WHEELS = ['..kkk....kkk..', '..kmk....kmk..', '..kWk....kWk..']

// A skin: who the robot is drawn as. Every skin shares the skeleton (a 14-wide head with
// the face in the same place, a torso, feet), so every pose, face and prop of every scene
// works for all of them; a skin changes the top of the head, the chest, the feet, the eye
// color, a few extras, and recolors palette keys (colors, applied when drawing).
export type SkinId = 'robot' | 'cat' | 'claude' | 'owl' | 'ghost'
type Skin = {
  // the two rows above the head: the robot's antenna, the cat's ears
  crown: (antenna: string) => [string, string]
  // the chest pixels in the torso's second row
  chest: string
  // the three steps of the feet (the robot's wheels turn)
  feet: [string, string, string]
  // the eyes' and mouth's color key when the pose names none
  tone: string
  // a head with sharp corners (the robot's top and chin rows are rounded)
  square?: boolean
  // the face's four rows before the eyes and mouth go on (the robot's plain screen)
  screen?: string[]
  // see-through keys: drawn as this much of their color over the panel behind (0 to 1)
  glass?: { keys: string; opacity: number }
  // anything else the skin draws: a tail at the body (x, y), whiskers at the head (hx, hy)
  extra?: (canvas: string[][], x: number, y: number, hx: number, hy: number) => void
  colors: Record<string, string>
}

export const SKINS: Record<SkinId, Skin> = {
  robot: {
    crown: antenna => [`......${antenna}${antenna}......`, '......mm......'],
    chest: 'cc',
    feet: WHEELS as [string, string, string],
    tone: 'c',
    colors: {},
  },
  // a ginger cat: ears with pink insides, a cream muzzle and belly, dark eyes, whiskers,
  // paws for feet and a tail curling up on the left
  cat: {
    crown: () => ['..H........H..', '.HpH......HpH.'],
    chest: 'KK',
    feet: ['..kkk....kkk..', '..kkk....kkk..', '..kkk....kkk..'],
    tone: 'E',
    extra: (canvas, x, y, hx, hy) => {
      for (const [px, py] of [[-2, 10], [-3, 9], [-3, 8], [-2, 7]] as const) {
        stamp(canvas, ['T'], x + px, y + py)
      }

      for (const side of [-2, 14]) {
        stamp(canvas, ['uu'], hx + side, hy + 5)
        stamp(canvas, ['uu'], hx + side, hy + 6)
      }
    },
    // d and q (the robot's standby chest light) take the belly's color: a cat has no light
    colors: { H: '#e8954a', G: '#c47436', K: '#fbe6cc', T: '#d6843f', m: '#fbe6cc', k: '#b8662e', E: '#2a211c', d: '#fbe6cc', q: '#fbe6cc' },
  },
  // Claude Code's own mascot: one square-cornered terracotta block, dark eyes, stubby arms
  // and four short legs; the face is the same color as the head, only a touch deeper
  claude: {
    crown: () => ['..............', '..............'],
    chest: 'TT',
    feet: ['..k.k....k.k..', '..k.k....k.k..', '..k.k....k.k..'],
    tone: 'E',
    square: true,
    colors: { H: '#d97757', G: '#c96a4b', K: '#d1704f', T: '#d97757', m: '#d97757', k: '#b85c3e', E: '#1f1612', d: '#d97757', q: '#d97757' },
  },
  // a brown owl: ear tufts, a pale facial disc, big round eye rings (Y) around the pupils,
  // a small amber beak, wings at the sides, a pale belly and amber talons
  owl: {
    crown: () => ['.H..........H.', '..HH......HH..'],
    chest: 'KK',
    feet: ['..k.k....k.k..', '..k.k....k.k..', '..k.k....k.k..'],
    tone: 'E',
    screen: ['HHKYYYKKYYYKHH', 'HHKYYYKKYYYKHH', 'HHKKKKaaKKKKHH', 'HHKKKKKKKKKKHH'],
    colors: { H: '#9c7552', G: '#7d5c3f', K: '#ead8b8', T: '#8a6747', m: '#7d5c3f', k: '#e0a83a', E: '#2b1f17', Y: '#fff8e8', d: '#ead8b8', q: '#ead8b8' },
  },
  // a little ghost: a domed head, one pale body from the top to a wavy hem (the hem
  // ripples where the robot's wheels turn), dark eyes, no separate arms or chest
  ghost: {
    crown: () => ['....HHHHHH....', '..HHHHHHHHHH..'],
    chest: 'TT',
    feet: ['.k.kk.kk.kk.k.', 'k.kk.kk.kk.kk.', '.kk.kk.kk.kk.k'],
    tone: 'E',
    // close the gaps between the torso's side and its hanging hands, so the body is whole
    extra: (canvas, x, y) => {
      for (const px of [1, 12]) {
        if (canvas[y + 9]?.[x + px] === '.') {
          stamp(canvas, ['T'], x + px, y + 9)
        }
      }
    },
    // see-through: the panel's gradient shows through the body; the eyes stay solid
    glass: { keys: 'HGKTmkdq', opacity: 0.5 },
    colors: { H: '#e9ecf8', G: '#dde2f2', K: '#e9ecf8', T: '#e9ecf8', m: '#e9ecf8', k: '#dde2f2', E: '#2d2a4a', d: '#e9ecf8', q: '#e9ecf8' },
  },
}
// A raised arm: a two-pixel-wide forearm ending in a wider mitten. A one-pixel pole with a
// single-pixel hand reads as a raised finger, so the arm is never thinner than the hand.
const ARM_UP = (side: 'L' | 'R', hand: 'A' | 'B'): Array<[number, number]> => {
  const dir = side === 'R' ? 1 : -1
  const stem = side === 'R' ? 14 : -2
  const out: Array<[number, number]> = []

  for (let row = 4; row <= 7; row++) {
    out.push([stem, row], [stem + 1, row])
  }

  // the mitten sits over the stem (A) or leans outward (B)
  const shift = hand === 'B' ? dir : 0

  for (let i = -1; i <= 2; i++) {
    out.push([stem + i + shift, 3])
  }

  return out
}

// Palms-up hands: each forearm runs out sideways from the shoulder and ends in a cupped
// hand (two fingertips over a flat palm), so nothing points up on its own.
const ARMS_SHRUG: Array<[number, number]> = [
  [-3, 7], [-1, 7], [14, 7], [16, 7],
  ...[-3, -2, -1, 0, 1, 12, 13, 14, 15, 16].map(ax => [ax, 8] as [number, number]),
]

export function compose(pose: Pose, skinId: SkinId = 'robot'): string[] {
  const skin = SKINS[skinId]
  const { dx = 0, dy = 0, lean = 0, tilt = 0, nod = 0, eyes = 'open', mouth = 'smile', tone, antenna = 'a', antennaUp = false, wave, shrug = false, holding = false, wheel = 0, props = [], on = [] } = pose
  const canvas = Array.from({ length: H }, () => Array.from({ length: W }, () => '.'))
  const x = 5 + dx
  const y = 1 + dy

  const [crownTip, crownBase] = skin.crown(antenna)
  const edge = skin.square ? '' : '.'
  const head = [crownTip, crownBase, `${edge}${'H'.repeat(skin.square ? 14 : 12)}${edge}`, ...screenRows(eyes, mouth, tone ?? skin.tone, skin.screen), `${edge}${'G'.repeat(skin.square ? 14 : 12)}${edge}`]
  const arms = (wave === 'both' || shrug ? ['..TTTTTTTTTT..', '..TTTTccTTTT..'] : wave || holding ? ['mmTTTTTTTTTT..', 'm.TTTTccTTTT..'] : ['mmTTTTTTTTTTmm', 'm.TTTTccTTTT.m']).map(row =>
    row.replace('cc', skin.chest),
  )

  stamp(canvas, [...arms, skin.feet[wheel]!], x, y + 8)
  // rows 0-5 of the head (antenna to the top mouth row) tilt; rows 6-7 (the bottom mouth
  // row and the chin) stay
  stamp(canvas, head.slice(0, TILT_ROWS), x + lean + tilt, y + nod)
  stamp(canvas, head.slice(TILT_ROWS), x + lean, y + nod + TILT_ROWS)

  if (antennaUp) {
    stamp(canvas, [crownBase], x + lean + tilt, y + nod)
    stamp(canvas, [crownTip], x + lean + tilt, y + nod - 1)
  }

  skin.extra?.(canvas, x, y, x + lean, y + nod)

  if (wave) {
    const sides: Array<'L' | 'R'> = wave === 'both' ? ['L', 'R'] : ['R']
    const hand = wave === 'B' ? 'B' : 'A'

    for (const side of sides) {
      ARM_UP(side, hand).forEach(([ax, ay]) => stamp(canvas, ['m'], x + ax, y + ay))
    }
  }

  if (shrug) {
    ARMS_SHRUG.forEach(([ax, ay]) => stamp(canvas, ['m'], x + ax, y + ay))
  }

  for (const [name, px, py] of on) {
    stamp(canvas, PROPS[name]!, x + px, y + py)
  }

  for (const [name, px, py] of props) {
    stamp(canvas, PROPS[name]!, px, py)
  }

  return canvas.map(row => row.join(''))
}

// Global slowdown for short frames; long rest holds (idle) are left as written.
const SLOWDOWN = 1.7
const SLOWDOWN_BELOW_MS = 1000

const scaleMs = (ms: number) => (ms < SLOWDOWN_BELOW_MS ? Math.round(ms * SLOWDOWN) : ms)

// A frame of exactly `ms` milliseconds, no slowdown applied.
const fRaw = (ms: number, pose: Pose = {}): Frame => ({ ms, px: compose(pose), pose })

// A frame's picture in a skin; the robot's is ready, others are drawn once and kept.
const skinned = new Map<string, WeakMap<Frame, string[]>>()

export function framePx(frame: Frame, skin: SkinId = 'robot'): string[] {
  if (skin === 'robot' || !SKINS[skin]) {
    return frame.px
  }

  const cache = skinned.get(skin) ?? new WeakMap<Frame, string[]>()
  skinned.set(skin, cache)

  const px = cache.get(frame) ?? compose(frame.pose, skin)
  cache.set(frame, px)

  return px
}

export const f = (ms: number, pose: Pose = {}): Frame => fRaw(scaleMs(ms), pose)

// once: the scene plays through, then the client falls back to the rest scene;
// repeat is how many times it plays through (1 when left out).
export type Anim = { frames: Frame[]; once?: boolean; repeat?: number }

export const frameIndex = (frames: Frame[], elapsed: number): number => {
  const total = frames.reduce((sum, fr) => sum + fr.ms, 0)
  let t = elapsed % total

  for (let i = 0; i < frames.length; i++) {
    t -= frames[i]!.ms

    if (t < 0) {
      return i
    }
  }

  return 0
}

// The robot stands on a dark rounded panel, so it reads the same on light and dark
// terminals without knowing the background. The panel fades from top to bottom.
const PANEL_TOP = [0x2c, 0x34, 0x47]
const PANEL_BOTTOM = [0x14, 0x19, 0x23]
// Props reach the canvas edges, so the panel adds a column of margin on each side.
const PAD = 1
export const FRAME_W = W + 2 * PAD

const hex = (rgb: number[]) => `#${rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('')}`
const rgb = (color: string) => color.slice(1).match(/../g)!.map(v => parseInt(v, 16))
// `share` of `front` over `back`: a see-through color.
const mix = (front: string, back: string, share: number) => hex(rgb(front).map((v, i) => v * share + rgb(back)[i]! * (1 - share)))
const gradient = (top: number[], bottom: number[]) => Array.from({ length: H }, (_, y) => hex(top.map((t, i) => t + ((bottom[i]! - t) * y) / (H - 1))))
const PANEL_ROWS = gradient(PANEL_TOP, PANEL_BOTTOM)
// The fence's flat color: the panel's lightest shade, from its top row, a touch lighter.
const FENCE_LIFT = 16
PALETTE.n = hex(PANEL_TOP.map(v => v + FENCE_LIFT))

// The light look: a pale panel and a light face screen with deeper eyes. The body keeps
// its steel blue, only a touch lighter (a white body read as a snowman, and a pale chin
// left the head floating).
// Only these keys change; every other color is the same in both.
export type Theme = 'dark' | 'light'

// macOS's appearance from `defaults read -g AppleInterfaceStyle`: "Dark" in dark mode; in
// light mode the key does not exist and the command fails. Anything else (another OS, no
// `defaults`) keeps the dark look.
export const systemThemeOf = (exitCode: number, stdout: string, stderr: string): Theme =>
  exitCode === 0 ? (stdout.trim() === 'Dark' ? 'dark' : 'light') : /does not exist/.test(stderr) ? 'light' : 'dark'
const LIGHT_TOP = [0xdd, 0xe4, 0xec]
const LIGHT_BOTTOM = [0xbd, 0xc8, 0xd5]
const LIGHT_ROWS = gradient(LIGHT_TOP, LIGHT_BOTTOM)
// The body's steel blue, lifted a little towards white for the light look.
const BODY_LIFT = 0.15
const lift = (color: string) => hex(color.slice(1).match(/../g)!.map(v => parseInt(v, 16)).map(v => v + (255 - v) * BODY_LIFT))
const LIGHT: Record<string, string> = {
  H: lift(PALETTE.H!),
  G: lift(PALETTE.G!),
  T: lift(PALETTE.T!),
  m: lift(PALETTE.m!),
  K: '#e3f3f7',
  c: '#0b7f96',
  w: '#4b5563',
  k: '#4b5563',
  u: '#6b7280',
  v: '#9aa6b4',
  n: hex(LIGHT_TOP.map(v => Math.min(255, v + FENCE_LIFT))),
}

// A skin's own colors come first, then the theme's, then the shared palette.
const colorOf = (key: string, theme: Theme, skin: SkinId) =>
  SKINS[skin]?.colors[key] ?? (theme === 'light' ? (LIGHT[key] ?? PALETTE[key]) : PALETTE[key])

const isPanel = (x: number, y: number, width: number) => x >= 0 && y >= 0 && x < width && y < H && !((x === 0 || x === width - 1) && (y === 0 || y === H - 1))

// One empty pixel row above the panel, so the band keeps a little room from what is
// drawn above it.
const TOP_GAP = 1

// The panel is as wide as the picture: the robot's canvas, plus the minis when agents run.
function backdrop(px: string[], theme: Theme, skin: SkinId): Array<Array<string | undefined>> {
  const panel = theme === 'light' ? LIGHT_ROWS : PANEL_ROWS
  const width = (px[0]?.length ?? W) + 2 * PAD

  return Array.from({ length: H + TOP_GAP }, (_, row) =>
    Array.from({ length: width }, (_, x) => {
      const y = row - TOP_GAP

      if (!isPanel(x, y, width)) {
        return undefined
      }

      // the margin columns carry the fence on to the panel's edge, so it spans the whole
      // panel (inside its rounded corners) instead of stopping at the canvas
      const line = px[y] ?? ''
      const edge = x < PAD ? line[0] : x >= line.length + PAD ? line[line.length - 1] : undefined
      const key = edge === 'n' ? edge : line[x - PAD]

      if (!key || key === '.') {
        return panel[y]
      }

      const glass = SKINS[skin]?.glass

      return glass?.keys.includes(key) ? mix(colorOf(key, theme, skin)!, panel[y]!, glass.opacity) : colorOf(key, theme, skin)
    }),
  )
}

// The picture as colors, pixel by pixel (the panel, its gap row and the robot), for tools
// that draw it elsewhere (tools/render-svg.ts); undefined is transparent.
export const pixelColors = (px: string[], theme: Theme = 'dark', skin: SkinId = 'robot') => backdrop(px, theme, skin)

// Folds two pixel rows into one terminal row: ▀ takes the top pixel as its
// color and the bottom as its background; equal colors merge into one block.
export function halfBlock(px: string[], theme: Theme = 'dark', skin: SkinId = 'robot'): Span[][] {
  const grid = backdrop(px, theme, skin)
  const rows: Span[][] = []

  for (let y = 0; y < grid.length; y += 2) {
    const top = grid[y]!
    const bottom = grid[y + 1] ?? []
    const spans: Span[] = []

    for (let x = 0; x < top.length; x++) {
      const t = top[x]
      const b = bottom[x]
      const cell: Span = !t && !b ? { text: ' ' } : t && !b ? { text: '▀', color: t } : !t && b ? { text: '▄', color: b } : t === b ? { text: '█', color: t } : { text: '▀', color: t, bg: b }
      const last = spans.at(-1)

      if (last && last.color === cell.color && last.bg === cell.bg) {
        last.text += cell.text
      } else {
        spans.push(cell)
      }
    }

    rows.push(spans)
  }

  return rows
}

// A mini robot for each running agent, standing to the right of the robot on the same
// panel. Only the first MINI_LIMIT are drawn; the rest are counted as text ("+3").
export const MINI_LIMIT = 4
const MINI_W = 8
const MINI_GAP = 2
const mini = (antenna: string) => [`...${antenna}${antenna}...`, '...mm...', 'HHHHHHHH', 'HKcKKcKH', 'HKKccKKH', '.GGGGGG.', '.TTTTTT.', '.ww..ww.']

// The robot's frame widened with `count` minis; `blink` flips every few hundred ms, and each
// mini's antenna is lit while its neighbor's is dim, so the row twinkles instead of flashing.
export function withMinis(px: string[], count: number, blink: number): string[] {
  const shown = Math.min(count, MINI_LIMIT)

  if (shown === 0) {
    return px
  }

  const top = H - mini('a').length

  return px.map((row, y) => {
    let out = row

    for (let i = 0; i < shown; i++) {
      out += '.'.repeat(MINI_GAP) + (y < top ? '.'.repeat(MINI_W) : mini((blink + i) % 2 ? 'g' : 'a')[y - top]!)
    }

    return out
  })
}

// Terminal columns the band needs: the panel, plus a "+N" label when agents overflow.
export const bandWidth = (count: number) => FRAME_W + Math.min(count, MINI_LIMIT) * (MINI_W + MINI_GAP) + (count > MINI_LIMIT ? 4 : 0)

// Terminal rows of the band (seven, after the top gap), most important first: the eyes and
// the mouth (rows 3-4, so even two rows still show the expression), the top of the head,
// the arms, the antenna, the wheels, the gap. When the band has fewer rows (the bottom slot
// is shared with the tasks list in fullscreen), the least important rows go and the rest
// keep their order.
const ROW_PRIORITY = [3, 4, 2, 5, 1, 6, 0]

export function fitRows<T>(rows: T[], maxRows: number): T[] {
  if (rows.length <= maxRows) {
    return rows
  }

  const kept = new Set(ROW_PRIORITY.slice(0, Math.max(0, maxRows)))

  return rows.filter((_, i) => kept.has(i))
}
