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
