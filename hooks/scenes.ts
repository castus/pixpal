// Scene table: every mascot animation as data. Loops run until replaced; `once`
// scenes play a single time and the client then falls back to the rest scene.
import { f, type Anim, type Pose } from './sprites.ts'

const calm = (extra: Pose = {}) => [
  f(2600, extra),
  f(90, { ...extra, eyes: 'blink' }),
  f(180, extra),
  f(90, { ...extra, eyes: 'blink' }),
  f(3400, extra),
  f(90, { ...extra, eyes: 'blink' }),
]

// Peeking over a fence while the person types: the pupils sweep left, center, right and
// back at a steady pace (no restarts, so no jumps), with an occasional blink.
const peekFrames = () => {
  const base: Pose = { nod: 1, mouth: 'flat', antennaUp: true }
  const fence = (fingers: 'fenceHandA' | 'fenceHandB'): Array<[string, number, number]> => [['fence', 0, 9], [fingers, 2, 8], [fingers, 17, 8]]

  return [
    f(650, { ...base, eyes: 'peekL', props: fence('fenceHandA') }),
    f(500, { ...base, eyes: 'peek', props: fence('fenceHandA') }),
    f(650, { ...base, eyes: 'peekR', props: fence('fenceHandA') }),
    f(500, { ...base, eyes: 'peek', props: fence('fenceHandA') }),
    f(120, { ...base, eyes: 'blink', props: fence('fenceHandB') }),
  ]
}

// ball positions of the juggling circle above the head
const CIRCLE: Array<[number, number]> = [[8, 1], [10, 0], [13, 0], [15, 1], [13, 2], [10, 2]]

// Reactions to the end of an answer play twice, so they are not missed.
const REACTION_REPEATS = 2

// A page of the book swinging from the right stack over the spine to the left one.
const TURN = ['bookPage15', 'bookPage50', 'bookPage90', 'bookPage130', 'bookPage165']
const readSpread = () =>
  (['left', 'left', 'right', 'right'] as const).map((eyes, i) => f(i % 2 ? 300 : 450, { eyes, mouth: 'flat', props: [['book', 5, 4]] }))

// Two columns of binary digits drift up beside the robot while a program runs. Each column
// repeats a pattern of digits, one every BIT_STEP rows; one loop moves it by a full pattern.
const BIT_STEP = 6
const BIT_COLUMNS: Array<[x: number, digits: string[]]> = [[1, ['bit1', 'bit0', 'bit0']], [20, ['bit0', 'bit1', 'bit1']]]
const bitsAt = (offset: number) =>
  BIT_COLUMNS.flatMap(([x, digits]) =>
    Array.from({ length: digits.length + 2 }, (_, i) => [digits[i % digits.length]!, x, i * BIT_STEP - offset] as [string, number, number]),
  )

export const ANIMS: Record<string, Anim> = {
  // rest scenes
  idle: { frames: calm() },
  night: { frames: calm({ on: [['cap', 2, 0]], props: [['mug', 19, 9], ['steam0', 20, 7]] }) },
  monday: { frames: calm({ props: [['mug', 19, 9], ['steam1', 20, 7]] }) },
  friday: { frames: calm({ on: [['party', 2, 0]] }) },
  // Standby, like a sleeping laptop: the face screen is off (faint dashes for eyes, no
  // mouth), the antenna is dim, and the chest light pulses slowly as the robot breathes.
  // The white z's rise while the light is brightest: a small one low, then a big one.
  sleep: {
    frames: (
      [
        [1000, 'ledDim', []],
        [700, 'ledHalf', []],
        [900, '', [['zs', 20, 7]]],
        [1200, '', [['zs', 20, 7], ['z', 21, 1]]],
        [700, 'ledHalf', [['z', 21, 1]]],
        [700, 'ledDim', []],
      ] as Array<[number, string, Array<[string, number, number]>]>
    ).map(([ms, led, props]) => f(ms, { eyes: 'off', mouth: 'none', antenna: 'g', on: led ? [[led, 6, 9]] : [], props })),
  },

  // the person is typing: head tipped forward over a fence, eyes on the prompt box below
  peek: { frames: peekFrames() },

  // work states while the agent runs
  thinking: {
    frames: [0, 1, 2, 3, 3].map((dots, i) =>
      f(350, { eyes: 'up', mouth: 'flat', antenna: i % 2 ? 'g' : 'a', dy: i === 3 ? -1 : 0, props: [[`cloud${dots}`, 19, 0]] }),
    ),
  },
  lens: {
    frames: [3, 4, 5, 4, 3].map((y, i) => f(300, { eyes: 'right', mouth: 'flat', antenna: i % 2 ? 'g' : 'a', props: [['lens', 18, y]] })).concat(f(300, { eyes: 'up', mouth: 'o', props: [['lens', 18, 3]] })),
  },
  // reading an open book lying in front, seen from the side: the eyes run over the left
  // stack, then the right one, and a page swings over the spine from right to left
  read: {
    frames: [...readSpread(), ...TURN.map(prop => f(150, { eyes: 'up', mouth: 'flat', props: [[prop, 5, 4]] }))],
  },
  // Hands hammer the keys one after the other; the keyboard sits on the robot's lap
  // (canvas rows 10-11) with the pressing hand drawn on its top row.
  type: {
    frames: [0, 1, 0, 1, 1, 0].map((k, i) =>
      f(140, { eyes: 'down', mouth: 'flat', antenna: i % 3 ? 'a' : 'g', props: [[k ? 'keysB' : 'keysA', 7, 10], ['hand', k ? 14 : 8, 10]] }),
    ),
  },
  // a program runs: zeros and ones stream up on both sides, the antenna blinks
  run: {
    frames: Array.from({ length: BIT_STEP * 3 }, (_, offset) =>
      f(110, { eyes: 'up', mouth: 'flat', antenna: offset % 4 < 2 ? 'a' : 'g', props: bitsAt(offset) }),
    ),
  },
  juggle: {
    frames: CIRCLE.map((_, i) =>
      f(160, { eyes: 'up', mouth: 'open', props: [['ballY', ...CIRCLE[i]!], ['ballP', ...CIRCLE[(i + 2) % 6]!], ['ballB', ...CIRCLE[(i + 4) % 6]!]] }),
    ),
  },

  // asking the person for a decision or a permission: a hand up and a question mark
  ask: {
    frames: [0, 1].flatMap(() => [
      f(450, { eyes: 'up', mouth: 'o', wave: 'A', props: [['q', 0, 0]] }),
      f(450, { eyes: 'up', mouth: 'o', wave: 'B', props: [['q', 0, 0]] }),
    ]),
  },
  clock: {
    frames: [0, 1, 2, 3].map(hand => f(500, { eyes: 'right', mouth: 'flat', antenna: hand % 2 ? 'g' : 'a', props: [[`clock${hand}`, 19, 1]] })),
  },
  // a letter crosses in front of the robot and flies out of the frame to the right
  send: {
    frames: [7, 11, 15, 19, 23]
      .map(x => f(220, { eyes: 'right', mouth: 'smile', props: x >= 15 ? [['speed', x - 5, 7], ['envelope', x, 6]] : [['envelope', x, 6]] }))
      .concat(f(500, { eyes: 'right', mouth: 'smile' })),
  },
  bell: {
    frames: [19, 20, 19, 20, 19].map(bx => f(150, { eyes: 'wide', mouth: 'o', props: [['bell', bx, 1]] })).concat(f(500, { eyes: 'wide', mouth: 'o', props: [['bell', 19, 1]] })),
  },
  // a raised mitten paints a small canvas, one color after another
  paint: {
    frames: [0, 1, 2, 3].flatMap(n => [
      f(300, { eyes: 'right', mouth: 'smile', wave: 'A', props: [[`canvas${n}`, 19, 0]] }),
      f(300, { eyes: 'right', mouth: 'smile', wave: 'B', props: [[`canvas${n}`, 19, 0]] }),
    ]),
  },
  // stepping through a door into another worktree
  door: {
    frames: [f(600, { eyes: 'right', mouth: 'smile', props: [['door0', 20, 3]] }), f(500, { eyes: 'right', mouth: 'smile', props: [['door1', 20, 3]] }), f(900, { eyes: 'right', mouth: 'open', props: [['door2', 20, 3]] })],
  },
  // a new skill: the bulb lights up
  idea: {
    frames: [f(450, { eyes: 'up', mouth: 'flat', props: [['bulbOff', 19, 0]] }), f(250, { eyes: 'wide', mouth: 'o', antenna: 'y', props: [['bulbOn', 19, 0], ['spark', 18, 5]] }), f(800, { eyes: 'wide', mouth: 'smile', props: [['bulbOn', 19, 0]] })],
  },

  // planning: a board fills up step by step
  plan: { frames: [0, 1, 2, 3, 4, 5, 6, 6].map(n => f(350, { eyes: 'up', mouth: 'flat', props: [[`board${n}`, 19, 1]] })) },
  // Two ways to show "testing": a test run picks one at random (see mood.ts).
  // a clipboard whose items are ticked off one by one
  checklist: {
    frames: [0, 1, 2, 3].map(n => f(450, { eyes: n % 2 ? 'down' : 'right', mouth: 'flat', antenna: n === 3 ? 'y' : 'a', props: [[`clip${n}`, 19, 1]] })),
  },
  // a rubber stamp comes down on a sheet of paper and leaves a red mark
  stamp: {
    frames: [
      f(450, { eyes: 'down', mouth: 'flat', props: [['paper', 20, 8], ['stamp', 21, 4]] }),
      f(300, { eyes: 'down', mouth: 'flat', props: [['paper', 20, 8], ['stamp', 21, 6]] }),
      f(450, { eyes: 'down', mouth: 'smile', props: [['paperOk', 20, 8], ['stamp', 21, 4]] }),
      f(600, { eyes: 'happy', mouth: 'smile', props: [['paperOk', 20, 8], ['stamp', 21, 4]] }),
    ],
  },
  git: {
    frames: [[], [['blkE', 19, 10]], [['blkE', 19, 10], ['blkB', 21, 10]], [['blkE', 19, 10], ['blkB', 21, 10], ['blkO', 20, 8]]].map(props => f(450, { eyes: 'down', mouth: 'flat', props: props as Array<[string, number, number]> })),
  },
  // one-shot reactions
  // sorry and owning it: worried brows and a slow bow
  contrite: {
    once: true,
    repeat: REACTION_REPEATS,
    // a slow apologetic bow: worried eyes, the head drops and looks down, the antenna dims
    frames: [
      f(400, { eyes: 'sad', mouth: 'frown' }),
      f(400, { eyes: 'sad', mouth: 'frown', nod: 1, antenna: 'g' }),
      f(600, { eyes: 'down', mouth: 'frown', nod: 1, antenna: 'g' }),
      f(300, { eyes: 'blink', mouth: 'frown', nod: 1, antenna: 'g' }),
      f(500, { eyes: 'sad', mouth: 'frown', antenna: 'g' }),
    ],
  },
  // pleased and a little bashful: blushing cheeks, a heart floating up
  shy: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(400, { eyes: 'happy', mouth: 'smile', on: [['blush', 2, 5], ['blush', 11, 5]] }),
      f(400, { eyes: 'happy', mouth: 'smile', tilt: 1, on: [['blush', 2, 5], ['blush', 11, 5]], props: [['heart', 19, 1]] }),
      f(400, { eyes: 'happy', mouth: 'smile', tilt: 1, on: [['blush', 2, 5], ['blush', 11, 5]], props: [['heart', 19, 0]] }),
      f(400, { eyes: 'happy', mouth: 'smile', on: [['blush', 2, 5], ['blush', 11, 5]] }),
    ],
  },
  happy: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(350, { dy: -1, eyes: 'happy' }),
      f(250, { eyes: 'happy' }),
      f(200, { eyes: 'happy', wave: 'A' }),
      f(200, { eyes: 'happy', wave: 'B' }),
      f(200, { eyes: 'happy', wave: 'A' }),
      f(200, { eyes: 'happy', wave: 'B' }),
      f(300, { eyes: 'happy' }),
    ],
  },
  // a plain "no": only the head shakes left and right, the body stays (the answer is no,
  // or "I do not remember")
  no: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(150, { lean: -1, eyes: 'left', mouth: 'flat' }),
      f(120, { mouth: 'flat' }),
      f(150, { lean: 1, eyes: 'right', mouth: 'flat' }),
      f(120, { mouth: 'flat' }),
      f(150, { lean: -1, eyes: 'left', mouth: 'flat' }),
      f(120, { mouth: 'flat' }),
      f(150, { lean: 1, eyes: 'right', mouth: 'flat' }),
      f(500, { mouth: 'flat' }),
    ],
  },
  // exhausted after a long turn: a long exhale rising as a puff while the head sinks
  ufff: {
    once: true,
    frames: [
      f(350, { eyes: 'blink', mouth: 'flat' }),
      f(350, { eyes: 'blink', mouth: 'flat' }),
      f(350, { eyes: 'blink', mouth: 'o', nod: 1, props: [['puff', 0, 5]] }),
      f(350, { eyes: 'blink', mouth: 'o', nod: 1, props: [['puff', 0, 4]] }),
      f(400, { eyes: 'blink', mouth: 'o', nod: 1, props: [['puff', 0, 3]] }),
      f(500, { eyes: 'blink', mouth: 'o', nod: 1, props: [['puff', 0, 2]] }),
    ],
  },
  // a plain "yes": two nods, then a thumb up
  yes: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(180, { eyes: 'happy', mouth: 'smile' }),
      f(220, { eyes: 'happy', mouth: 'smile', nod: 1 }),
      f(180, { eyes: 'happy', mouth: 'smile' }),
      f(220, { eyes: 'happy', mouth: 'smile', nod: 1 }),
      f(700, { eyes: 'happy', mouth: 'smile', holding: true, props: [['thumb', 19, 6]] }),
    ],
  },
  // praising the person (a good catch, a clever idea): star eyes, hands up, sparkles
  praise: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(300, { eyes: 'star', mouth: 'open', wave: 'both', props: [['star', 19, 0], ['star', 1, 0]] }),
      f(300, { eyes: 'star', mouth: 'open', wave: 'both', dy: -1, props: [['spark', 20, 1], ['spark', 0, 1]] }),
      f(300, { eyes: 'star', mouth: 'open', wave: 'both', props: [['spark', 19, 0], ['spark', 1, 0]] }),
      f(500, { eyes: 'star', mouth: 'smile', props: [['star', 19, 1], ['star', 1, 1]] }),
    ],
  },
  // something important happened: a stop sign and a jolt
  stop: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(200, { eyes: 'wide', mouth: 'grim', dy: -1, antenna: 'y', props: [['stopSign', 19, 0]] }),
      f(400, { eyes: 'wide', mouth: 'grim', props: [['stopSign', 19, 0]] }),
      f(200, { eyes: 'wide', mouth: 'grim', antenna: 'y', props: [['stopSign', 19, 0]] }),
      f(600, { eyes: 'wide', mouth: 'grim', props: [['stopSign', 19, 0]] }),
    ],
  },
  // "so-so": the face weighs it up, one eye squinting and the mouth slanting, side to side,
  // with a wiggling "~" in a speech bubble
  soso: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [0, 1, 0, 1, 0, 1]
      .map(i => f(300, i ? { eyes: 'weighR', mouth: 'skewR', props: [['wave1', 19, 0]] } : { eyes: 'weighL', mouth: 'skewL', props: [['wave0', 19, 0]] }))
      .concat(f(400, { mouth: 'flat' })),
  },
  hello: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [0, 1, 0, 1, 0, 1].map((w, i) => f(200, { eyes: 'happy', wave: w ? 'B' : 'A', lean: i % 2 })).concat(f(300, { eyes: 'happy' })),
  },
  // relieved: both open mittens out, a calm smile ("no problem")
  relieved: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(400, { eyes: 'blink', mouth: 'smile', wave: 'both' }),
      f(500, { eyes: 'happy', mouth: 'smile', wave: 'both', props: [['star', 19, 0], ['star', 1, 0]] }),
      f(500, { eyes: 'happy', mouth: 'smile', wave: 'both', props: [['star', 20, 1], ['star', 0, 1]] }),
      f(300, { eyes: 'happy', mouth: 'smile' }),
    ],
  },
  shrug: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(350, { eyes: 'left', mouth: 'flat', shrug: true }),
      f(350, { eyes: 'right', mouth: 'flat', shrug: true }),
      f(350, { eyes: 'left', mouth: 'flat', shrug: true }),
      f(300, { mouth: 'flat' }),
    ],
  },
  // Claude needs an answer before it goes on: it turns to the person and a speech bubble
  // with a question mark pops up (no raised hand: that is ask, the dialog)
  ponder: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(300, { eyes: 'up', mouth: 'flat' }),
      f(300, { eyes: 'right', mouth: 'o', props: [['askBubble', 19, 0]] }),
      f(300, { eyes: 'right', mouth: 'flat', props: [['askBubbleDim', 19, 0]] }),
      f(300, { eyes: 'open', mouth: 'flat', props: [['askBubble', 19, 0]] }),
      f(300, { eyes: 'open', mouth: 'flat', props: [['askBubbleDim', 19, 0]] }),
    ],
  },
  surprised: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [f(140, { dy: -1, eyes: 'wide', mouth: 'o', props: [['ex', 19, 1]] }), f(900, { eyes: 'wide', mouth: 'o', props: [['ex', 19, 1]] })],
  },
  cheer: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(200, { dy: -1, eyes: 'happy', mouth: 'open', wave: 'both', props: [['spark', 19, 2], ['spark', 2, 3]] }),
      f(200, { eyes: 'happy', mouth: 'open', wave: 'both', props: [['star', 19, 3], ['star', 2, 2]] }),
      f(200, { dy: -1, eyes: 'happy', mouth: 'open', wave: 'both', props: [['spark', 19, 3], ['spark', 2, 2]] }),
      f(400, { eyes: 'happy', props: [['star', 19, 2], ['star', 2, 3]] }),
    ],
  },
  oops: {
    once: true,
    repeat: REACTION_REPEATS,
    frames: [
      f(300, { eyes: 'x', mouth: 'grim', tone: 'r' }),
      f(300, { eyes: 'x', mouth: 'grim', tone: 'r', lean: -1 }),
      f(500, { eyes: 'wide', mouth: 'grim', lean: -1 }),
    ],
  },
}

export const SCENES = Object.keys(ANIMS)
// How long a scene plays in full, repeats included.
export const durationOfScene = (scene: string) => (ANIMS[scene]?.frames.reduce((sum, frame) => sum + frame.ms, 0) ?? 0) * (ANIMS[scene]?.repeat ?? 1)

export const isOnce = (scene: string) => ANIMS[scene]?.once === true
