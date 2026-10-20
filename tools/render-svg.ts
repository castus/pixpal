// Draws Pixpal's real frames as an animated SVG for the README: a row of characters, each
// playing one emotion with its speech bubble. The animation is CSS inside the file, so
// GitHub plays it like a GIF and it stays sharp at any size.
//
//   node --experimental-strip-types tools/render-svg.ts [--logo] [out.svg]
import { writeFileSync } from 'node:fs'

import { SAYINGS } from '../hooks/sayings.ts'
import { ANIMS } from '../hooks/scenes.ts'
import { framePx, pixelColors, type SkinId } from '../hooks/sprites.ts'

// Each character and the emotion it shows: easy ones to read at a glance.
const CAST: Array<[skin: SkinId, scene: string]> = [
  ['robot', 'cheer'],
  ['cat', 'hello'],
  ['claude', 'yes'],
  ['owl', 'shy'],
  ['ghost', 'surprised'],
]

// One robot pixel in SVG units; a terminal cell is one pixel wide and two tall.
const P = 6
const GAP = 4 * P
const BUBBLE_FILL = ['#ffffff', '#e6ebf0']
const INK = '#0f1b2d'
const SHADOW = '#5c6370'
const LABEL = '#8a93a3'

// --logo draws the README's logo instead: the robot waving, larger, beside the name.
const isLogo = process.argv.includes('--logo')
const out = process.argv.slice(2).find(arg => !arg.startsWith('--')) ?? (isLogo ? 'docs/pixpal-logo.svg' : 'docs/pixpal-row.svg')

// One frame as rects, a run of same-colored pixels in a row drawn as one rect.
function frameRects(grid: Array<Array<string | undefined>>, x0: number): string {
  const rects: string[] = []

  grid.forEach((row, y) => {
    let x = 0

    while (x < row.length) {
      const color = row[x]
      let end = x + 1

      while (end < row.length && row[end] === color) {
        end++
      }

      if (color) {
        rects.push(`<rect x="${x0 + x * P}" y="${y * P}" width="${(end - x) * P}" height="${P}" fill="${color}"/>`)
      }

      x = end
    }
  })

  return rects.join('')
}

// The keyframes that show one frame only during its share of the loop.
function showOnly(name: string, from: number, to: number): string {
  const a = (from * 100).toFixed(3)
  const b = (to * 100).toFixed(3)

  return from === 0 ? `@keyframes ${name}{0%{opacity:1}${b}%{opacity:0}100%{opacity:0}}` : `@keyframes ${name}{0%{opacity:0}${a}%{opacity:1}${b}%{opacity:0}100%{opacity:0}}`
}

// A speech bubble as in the band: a rounded body with a soft gradient, a gray shadow one
// cell right and half a row down, the text in the middle.
function bubble(x: number, text: string): string {
  const width = (text.length + 4) * P
  const y = P
  const height = 4 * P

  return [
    `<rect x="${x + P}" y="${y + P}" width="${width}" height="${height}" rx="${P}" fill="${SHADOW}"/>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${P}" fill="url(#bubble)"/>`,
    `<text x="${x + width / 2}" y="${y + height / 2}" fill="${INK}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="${1.7 * P}" text-anchor="middle" dominant-baseline="central">${text}</text>`,
  ].join('')
}

const styles: string[] = []
const bodies: string[] = []
let x = 0
let height = 0

CAST.forEach(([skin, scene], k) => {
  const frames = ANIMS[scene]!.frames
  const total = frames.reduce((sum, frame) => sum + frame.ms, 0)
  const text = SAYINGS[scene]!.en
  let start = 0
  let panelWidth = 0

  frames.forEach((frame, i) => {
    const grid = pixelColors(framePx(frame, skin), 'dark', skin)
    const name = `c${k}f${i}`
    panelWidth = grid[0]!.length * P
    height = Math.max(height, grid.length * P)
    styles.push(showOnly(name, start / total, (start + frame.ms) / total), `.${name}{animation:${name} ${total}ms step-end infinite}`)
    bodies.push(`<g class="${name}">${frameRects(grid, x)}</g>`)
    start += frame.ms
  })

  bodies.push(bubble(x + panelWidth + P, text))
  bodies.push(`<text x="${x + panelWidth / 2}" y="${height + 3 * P}" fill="${LABEL}" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-size="${2 * P}" text-anchor="middle">${skin}</text>`)
  x += panelWidth + P + (text.length + 5) * P + GAP
})

const svg = `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 ${x - GAP} ${height + 5 * P}" width="${x - GAP}" height="${height + 5 * P}">
<defs><linearGradient id="bubble" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${BUBBLE_FILL[0]}"/><stop offset="1" stop-color="${BUBBLE_FILL[1]}"/></linearGradient></defs>
<style>${styles.join('')}</style>
${bodies.join('\n')}
</svg>
`

// The logo: one robot saying hello at twice the size, the name in bold monospace beside it.
function logo(): string {
  const scale = 2
  const frames = ANIMS.hello!.frames
  const total = frames.reduce((sum, frame) => sum + frame.ms, 0)
  const css: string[] = []
  const groups: string[] = []
  let start = 0
  let size = [0, 0]

  frames.forEach((frame, i) => {
    const grid = pixelColors(frame.px)
    size = [grid[0]!.length * P, grid.length * P]
    css.push(showOnly(`l${i}`, start / total, (start + frame.ms) / total), `.l${i}{animation:l${i} ${total}ms step-end infinite}`)
    groups.push(`<g class="l${i}">${frameRects(grid, 0)}</g>`)
    start += frame.ms
  })

  const [w, h] = [size[0]! * scale, size[1]! * scale]
  const textX = w + 6 * P

  return `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" viewBox="0 0 ${textX + 52 * P} ${h}" width="${textX + 52 * P}" height="${h}">
<style>${css.join('')}</style>
<g transform="scale(${scale})">${groups.join('')}</g>
<text x="${textX}" y="${h / 2}" fill="#8fa3b8" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" font-weight="700" font-size="${11 * P}" dominant-baseline="central">pixpal</text>
</svg>
`
}

writeFileSync(out, isLogo ? logo() : svg)
console.log(`${out} written`)
