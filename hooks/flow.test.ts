// Drives the real hooks through the engine kit: a whole turn, then what the robot shows.
// The shown scene is read from what the module draws above the prompt.
import { expect, mock, test } from 'claude-code/testing'
import type { Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

const answer = (text: string) => ({ value: { isAnswered: true as const, text, usage: { input_tokens: 10, output_tokens: 1 } } })

// The bottom of the chain: what the engine itself would answer.
function bottom(on: On, emotion: string, onAsk: () => void = () => {}) {
  on('turn.start', (_$, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('tool.call', () => ({ result: {}, text: 'ok' }) as never)
  // the engine's own band: empty while no survey holds it
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Box', children: [] }) as never)
  on('model.complete', () => {
    onAsk()

    return answer(emotion) as never
  })
}

async function shown($: Engine) {
  const tree = await $.ui.render({ component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never)

  return /"scene":"([A-Za-z]+)"/.exec(JSON.stringify(tree))?.[1]
}

async function agentsShown($: Engine) {
  const tree = await $.ui.render({ component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never)

  return Number(/"agents":(\d+)/.exec(JSON.stringify(tree))?.[1])
}

// Starts a session (its saved choices come from the mocked store), answering what session
// start asks for.
async function startWith($: Engine, on: On) {
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: (e as { cwd: string }).cwd }) as never)
  on('agent.list', () => ({ value: [] }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'Dark', stderr: '' } }) as never)
  on('session.id', () => ({ value: 'session-x' }) as never)
  await $.session.start({ cwd: '/tmp' } as never)
}

test('with emotions set to ai, the turn ends with the emotion Haiku picked', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on, { 'pixpal.settings': { emotions: 'ai' } })
  bottom(on, 'praise')
  await startWith($, on)

  await $.turn.start({ text: 'napisałeś X', turnId: 't1' })
  expect(await shown($)).toBe('thinking')

  // the keywords alone would say happy here
  await $.turn.complete({ answer: 'Gotowe.', durationMs: 5000, isAborted: false, turnId: 't1', reason: 'answer' } as never)
  await clock.advance(100)
  await clock.settle()

  expect(await shown($)).toBe('praise')
})

test('by default nothing goes to the model: keyword rules pick the emotion', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  let asked = 0
  bottom(on, 'praise', () => {
    asked += 1
  })

  await $.turn.start({ text: 'napisałeś X', turnId: 't3' })
  await $.turn.complete({ answer: 'Gotowe.', durationMs: 5000, isAborted: false, turnId: 't3', reason: 'answer' } as never)
  await clock.advance(100)
  await clock.settle()

  expect(asked).toBe(0)
  expect(await shown($)).toBe('happy')
})

test('a tool call does not break the hook, and the robot goes back to thinking', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  bottom(on, 'happy')

  await $.turn.start({ text: 'zrób coś', turnId: 't2' })
  await $.tool.call({ tool: 'Bash', command: 'grep -r x .', tool_use_id: 'u1' } as never)
  await clock.advance(1000)
  await clock.settle()

  expect(await shown($)).toBe('thinking')
})

test('after a long turn ufff plays first and the emotion follows it', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  bottom(on, 'yes')

  await $.turn.start({ text: 'czy zapisałeś?', turnId: 't3' })
  await $.turn.complete({ answer: 'Tak, zapisałem.', durationMs: 90_000, isAborted: false, turnId: 't3', reason: 'answer' } as never)
  await clock.advance(200)
  await clock.settle()
  expect(await shown($)).toBe('ufff')

  await clock.advance(5000)
  await clock.settle()
  expect(await shown($)).toBe('yes')
})

test('each running agent stands beside the robot, and one that finishes leaves', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  bottom(on, 'happy')
  let statuses = ['running', 'running', 'running']
  on('agent.list', () => ({ value: statuses.map((status, i) => ({ id: `a${i}`, description: 'x', type: 'Explore', status })) }) as never)
  on('agent.spawn', () => ({ model: 'haiku', agentId: 'a0' }) as never)

  await $.turn.start({ text: 'split the work', turnId: 't4' })
  await $.agent.spawn({ prompt: 'look around', description: 'x', subagentType: 'Explore' } as never)
  await clock.settle()
  expect(await agentsShown($)).toBe(3)

  statuses = ['running', 'completed', 'running']
  await $.turn.complete({ answer: 'done', durationMs: 900, isAborted: false, turnId: 'a1t', reason: 'answer', agentId: 'a1' } as never)
  await clock.advance(400)
  await clock.settle()
  expect(await agentsShown($)).toBe(2)
})

test('a workflow agent, left out of the agent list, still gets a mini robot until it ends', async ($, on) => {
  const clock = mock.clock(on)
  mock.store(on)
  bottom(on, 'happy')
  let next = 0
  on('agent.spawn', () => ({ model: 'haiku', agentId: `w${next++}` }) as never)
  await startWith($, on)

  const spawn = () => $.agent.spawn({ prompt: 'label the pool', description: 'x', workflow: { runId: 'wf_test' } } as never)
  await spawn()
  await spawn()
  await clock.settle()
  expect(await agentsShown($)).toBe(2)

  // one finishes
  await $.turn.complete({ answer: 'done', durationMs: 900, isAborted: false, turnId: 'w0t', reason: 'answer', agentId: 'w0' } as never)
  await clock.advance(400)
  await clock.settle()
  expect(await agentsShown($)).toBe(1)

  // the other's end is missed: it goes after a long silence, but a tool call keeps it alive
  await clock.advance(16 * 60_000)
  await $.tool.call({ tool: 'Bash', input: { command: 'ls' }, agentId: 'w1', tool_use_id: 'u1' } as never)
  await clock.advance(16 * 60_000)
  await clock.settle()
  expect(await agentsShown($)).toBe(1)

  await clock.advance(15 * 60_000)
  await clock.settle()
  expect(await agentsShown($)).toBe(0)
})

test('the person’s choices outlast the process: a new session reads them back', async ($, on) => {
  mock.clock(on)
  mock.store(on, { 'pixpal.settings': { theme: 'dark', skin: 'cat', bubbles: false } })
  bottom(on, 'happy')
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: (e as { cwd: string }).cwd }) as never)
  on('agent.list', () => ({ value: [] }) as never)
  on('process.run', () => ({ value: { exitCode: 1, stdout: '', stderr: 'does not exist' } }) as never)
  on('session.id', () => ({ value: 'session-a' }) as never)

  await $.session.start({ cwd: '/tmp' } as never)
  const tree = JSON.stringify(await $.ui.render({ component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never))

  expect(tree).toContain('"skin":"cat"')
  expect(tree).toContain('"bubbles":false')
  expect(tree).toContain('"theme":"dark"')
})

test('a resumed session gets its own choices back, ahead of the latest ones', async ($, on) => {
  mock.clock(on)
  mock.store(on, { 'pixpal.settings': { skin: 'cat' }, 'pixpal.sessions': { 'session-a': { skin: 'owl' } } })
  bottom(on, 'happy')
  on('command.register', () => ({ value: undefined }) as never)
  on('session.start', (_$, e) => ({ cwd: (e as { cwd: string }).cwd }) as never)
  on('agent.list', () => ({ value: [] }) as never)
  on('process.run', () => ({ value: { exitCode: 0, stdout: 'Dark', stderr: '' } }) as never)
  on('session.id', () => ({ value: 'session-a' }) as never)

  await $.session.start({ cwd: '/tmp' } as never)

  expect(JSON.stringify(await $.ui.render({ component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never))).toContain('"skin":"owl"')
})

test('a setting without a value opens the picker, and a key pick sets it', async ($, on) => {
  mock.clock(on)
  mock.store(on, {})
  bottom(on, 'happy')
  const opened: string[] = []
  const closed: string[] = []
  on('ui.open', (_$, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true } } as never
  })
  on('ui.close', (_$, e) => {
    closed.push(e.id)

    return { value: undefined } as never
  })
  on('ui.toast', () => ({ value: undefined }) as never)
  await startWith($, on)

  expect((await $.command.run({ command: 'pixpal', args: 'theme' } as never)).text).toBe('Pick the theme in the pane.')
  expect(opened).toEqual(['pixpal-picker'])

  // auto, dark, light: one row each
  const pane = await $.ui.mount({ plugin: 'pixpal', surface: 'terminal', component: 'Pane', props: {} as never, requestId: 'pixpal-picker' })
  expect((await pane.findAll({ type: 'Button' })).map(row => row.text)).toEqual(['1. Auto (follows the system)  ✓', '2. dark', '3. light'])
  await pane.press({ key: 'slot:2' })

  expect(closed).toEqual(['pixpal-picker'])
  expect(JSON.stringify(await $.ui.render({ component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never))).toContain('"theme":"light"')
})

test('a setting with a value is set at once, without the picker', async ($, on) => {
  mock.clock(on)
  mock.store(on, {})
  bottom(on, 'happy')
  const opened: string[] = []
  on('ui.open', (_$, e) => {
    opened.push(e.id)

    return { value: { isPlaced: true } } as never
  })
  await startWith($, on)

  expect((await $.command.run({ command: 'pixpal', args: 'skin owl' } as never)).text).toContain('Pixpal skin: owl')
  expect((await $.command.run({ command: 'pixpal', args: 'language de' } as never)).text).toContain('Fertig!')
  expect(opened).toEqual([])
})

test('the language picker shows five rows, and the arrows scroll the whole list under the focus', async ($, on) => {
  mock.clock(on)
  mock.store(on, {})
  bottom(on, 'happy')
  on('ui.open', () => ({ value: { isPlaced: true } }) as never)
  // the ring itself: lands where the chain aims it
  on('ui.focus', () => ({}) as never)
  await startWith($, on)

  await $.command.run({ command: 'pixpal', args: 'language' } as never)
  const pane = await $.ui.mount({ plugin: 'pixpal', surface: 'terminal', component: 'Pane', props: {} as never, requestId: 'pixpal-picker' })
  const shown = async () => (await pane.findAll({ type: 'Button' })).map(row => row.text?.replace('  ✓', '').replace(/^ ?\d+\. /, ''))
  const arrowTo = (element: string) => $.ui.focus({ component: 'Pane', requestId: 'pixpal-picker', element, origin: { kind: 'person' } } as never)

  // auto is the current language: the list starts at the top, the field below it
  expect(await shown()).toEqual(['Auto (the language of your prompt)', 'Polski', 'English', 'Deutsch', 'Español'])
  expect(await pane.find({ key: 'other' })).toBeDefined()
  expect(JSON.stringify(await pane.drawn())).toContain('Which language should Pixpal speak?')
  expect((await pane.find({ key: 'slot:0' }))?.text).toBe(' 1. Auto (the language of your prompt)  ✓')

  await $.ui.focus({ component: 'Pane', requestId: 'pixpal-picker', element: 'slot:0', origin: { kind: 'plugin', name: 'pixpal' } } as never)
  for (const element of ['slot:1', 'slot:2', 'slot:3', 'slot:4']) {
    await arrowTo(element)
  }

  // down from the last slot: the ring aims at the field, the options move up one instead
  await arrowTo('other')
  expect(await shown()).toEqual(['Polski', 'English', 'Deutsch', 'Español', 'Français'])

  // down to the end of the list, then the field
  for (let i = 0; i < 8; i++) {
    await arrowTo('other')
  }

  expect(await shown()).toEqual(['Українська', 'Русский', '日本語', '中文', '한국어'])
  await arrowTo('other')
  // down from the field wraps to the list's start
  await arrowTo('slot:0')
  expect(await shown()).toEqual(['Auto (the language of your prompt)', 'Polski', 'English', 'Deutsch', 'Español'])

  // up from the field shows the list's end; up from the first slot scrolls back
  await arrowTo('other')
  await arrowTo('slot:4')
  expect(await shown()).toEqual(['Українська', 'Русский', '日本語', '中文', '한국어'])
  for (const element of ['slot:3', 'slot:2', 'slot:1', 'slot:0']) {
    await arrowTo(element)
  }

  await arrowTo('other')
  expect(await shown()).toEqual(['Português', 'Українська', 'Русский', '日本語', '中文'])
})

test('Pixpal shares the band: what the mods beneath draw stands beside it', async ($, on) => {
  mock.clock(on)
  mock.store(on, {})
  // a mod beneath Pixpal, drawing in the band
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'Text', children: ['another mod'] }) as never)
  bottom(on, 'happy')
  await startWith($, on)

  const tree = JSON.stringify(await $.ui.render({ component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never))

  expect(tree).toContain('client/pixpal.tsx')
  expect(tree).toContain('another mod')
})

test('hidden, Pixpal leaves the band to the others, and a new session reads the choice back', async ($, on) => {
  mock.clock(on)
  // a session that starts with Pixpal hidden by an earlier choice
  mock.store(on, { 'pixpal.settings': { visible: false } })
  bottom(on, 'happy')
  await startWith($, on)
  const band = async () => JSON.stringify(await $.ui.render({ component: 'AbovePrompt', surface: 'terminal', props: { hasSurvey: false } } as never))

  expect(await band()).not.toContain('pixpal.tsx')

  await $.command.run({ command: 'pixpal', args: 'show' } as never)
  expect(await band()).toContain('pixpal.tsx')

  expect((await $.command.run({ command: 'pixpal', args: 'hide' } as never)).text).toContain('/pixpal show')
  expect(await band()).not.toContain('pixpal.tsx')
})
