import type { ClientSurface } from 'claude-code'

import { ANIMS } from '../scenes.ts'
import { SAYINGS, shownText, withBubble, WORK_SAYINGS, WORK_SPEAKS, type Lang } from '../sayings.ts'
import { fitRows, frameIndex, framePx, halfBlock, MINI_LIMIT, withMinis, type SkinId, type Theme } from '../sprites.ts'

// seq changes on every request, so the same scene can be asked for twice in a row.
// rest is the scene a one-shot falls back to (idle, or a time-of-day variant).
// agents is how many agents run now: each gets a mini robot beside this one.
// maxRows is how many terminal rows the band has; the robot is cut down to fit.
// lang is the person's language: an emotion says its line in it, in a bubble.
// bubbles false keeps the robot silent (no speech bubbles at all).
type Props = { scene: string; seq: number; rest: string; debug: boolean; source: string; agents: number; maxRows: number; lang: Lang; bubbles?: boolean; theme?: Theme; skin?: SkinId; phrases?: Record<string, string> | null }
// said is the bubble's line, saidAt when it appeared, shown what of it is on screen now.
// clock names the clock code that runs; a reload with a different one restarts it.
type State = { scene: string; seq: number; t0: number; fi: number; blink: number; said?: string; saidAt: number; shown?: string; clock?: number; props: Props; stop?: () => void }

const TICK_MS = 40
// Bump when the clock's tick changes: a hot reload keeps the Client's state, and with it
// the old clock, which would go on running the old tick.
const CLOCK_VERSION = 3
// How long a mini's antenna stays lit or dim.
const BLINK_MS = 450
const OVERFLOW_COLOR = '#8a93a3'

const animOf = (scene: string) => ANIMS[scene] ?? ANIMS.idle!
const durationOf = (scene: string) => animOf(scene).frames.reduce((sum, fr) => sum + fr.ms, 0) * (animOf(scene).repeat ?? 1)

// The line a scene says, if any. Props from an older hooks module (during a reload) may lack
// lang, agents or maxRows.
// A chosen language's phrasebook (phrases) wins over the line in the prompt's language.
const sayingOf = (scene: string, props: Props) => {
  const known = props.bubbles === false ? undefined : (SAYINGS[scene] ?? (WORK_SPEAKS ? WORK_SAYINGS[scene] : undefined))

  return known && (props.phrases?.[scene] ?? known[props.lang ?? 'en'])
}

// The Client keeps its own clock, so frames never travel through the hooks module.
function startClock(surface: ClientSurface<State>, st: State) {
  st.clock = CLOCK_VERSION
  st.stop = surface.every(TICK_MS, () => {
    const cur = surface.state

    if (!cur) {
      return
    }

    const now = Date.now()
    let { scene, seq, t0 } = cur

    if (cur.props.seq !== cur.seq) {
      scene = cur.props.scene
      seq = cur.props.seq
      t0 = now
    } else if (animOf(scene).once && now - t0 >= durationOf(scene)) {
      scene = cur.props.rest
      t0 = now
    }

    const fi = frameIndex(animOf(scene).frames, now - t0)
    const blink = (cur.props.agents ?? 0) > 0 ? Math.floor(now / BLINK_MS) % 2 : 0
    const said = sayingOf(scene, cur.props)
    const saidAt = said === cur.said ? cur.saidAt : now
    const shown = said === undefined ? undefined : shownText(said, now - saidAt)

    if (scene !== cur.scene || seq !== cur.seq || fi !== cur.fi || blink !== cur.blink || said !== cur.said || shown !== cur.shown) {
      surface.setState({ ...cur, scene, seq, t0, fi, blink, said, saidAt, shown })
    }
  })
}

export default function MascotClient(props: Props, surface: ClientSurface<State>) {
  const { Box, Text } = surface.elements
  let st = surface.state

  if (st === undefined) {
    st = { scene: props.scene, seq: props.seq, t0: Date.now(), fi: 0, blink: 0, said: sayingOf(props.scene, props), saidAt: Date.now(), props }
    surface.setState(st)
    startClock(surface, st)
  } else {
    st.props = props

    if (st.clock !== CLOCK_VERSION) {
      st.stop?.()
      st.said = sayingOf(st.scene, props)
      st.saidAt = Date.now()
      startClock(surface, st)
    }
  }


  const frames = animOf(st.scene).frames
  const skin = props.skin ?? 'robot'
  const full = halfBlock(withMinis(framePx(frames[Math.min(st.fi, frames.length - 1)]!, skin), props.agents ?? 0, st.blink, skin), props.theme ?? 'dark', skin)
  const overflow = (props.agents ?? 0) - MINI_LIMIT

  // the agents beyond the drawn minis, as plain text next to the last one
  if (overflow > 0) {
    full[full.length - 2]!.push({ text: ` +${overflow}`, color: OVERFLOW_COLOR })
  }

  const maxRows = props.maxRows ?? full.length
  const fitted = fitRows(full, maxRows)
  const saying = sayingOf(st.scene, props)
  // an emotion says how it feels, work says what it does, in a bubble beside the picture;
  // it types itself out letter by letter
  const rows = saying ? withBubble(fitted, saying, saying === st.said ? Date.now() - st.saidAt : 0) : fitted
  const hasLabel = props.debug && maxRows > rows.length

  return (
    <Box flexDirection="column">
      {rows.map((spans, i) => (
        <Box key={`r${i}`} flexDirection="row">
          {spans.map((s, j) => (
            <Text key={`s${j}`} color={s.color} backgroundColor={s.bg} wrap="truncate">
              {s.text}
            </Text>
          ))}
        </Box>
      ))}
      {hasLabel && <Text dimColor>{st.scene}{props.source && st.scene === props.scene ? `·${props.source}` : ''}</Text>}
    </Box>
  )
}
