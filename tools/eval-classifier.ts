// Scores the final-emotion classifier on labeled exchanges: the Haiku classifier (as
// register.tsx calls it) and the keyword fallback. Each data line is JSON:
// { "id", "lang", "user", "answer", "expect" }, where expect may be "a/b" (either is right).
//
//   node --experimental-strip-types tools/eval-classifier.ts --data a.jsonl [--data b.jsonl]
//     [--system prompt.txt] [--mode ai|keywords|both] [--jobs 8] [--limit N] [--out result.json]
//
// --system replaces CLASSIFIER_SYSTEM with a candidate prompt. The model is called through
// `claude -p` on the person's own Claude Code login (ANTHROPIC_API_KEY is left out).
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

import { buildClassifierPrompt, CLASSIFIER_SYSTEM, parseEmotion } from '../hooks/classifier.ts'
import { sceneForExchange } from '../hooks/mood.ts'

type Item = { id: string; lang: string; user: string; answer: string; expect: string }
type Scored = Item & { ai?: string; keywords?: string; raw?: string; inTokens?: number }

const args = process.argv.slice(2)
const all = (flag: string) => args.flatMap((arg, i) => (arg === flag && args[i + 1] ? [args[i + 1]!] : []))
const one = (flag: string) => all(flag)[0]

const mode = one('--mode') ?? 'both'
const jobs = Number(one('--jobs') ?? 8)
const system = one('--system') ? readFileSync(one('--system')!, 'utf8') : CLASSIFIER_SYSTEM
const items: Item[] = all('--data')
  .flatMap(file => readFileSync(file, 'utf8').split('\n'))
  .filter(line => line.trim())
  .map(line => JSON.parse(line) as Item)
  .slice(0, Number(one('--limit') ?? Infinity))

const isHit = (expect: string, got: string | undefined) => got !== undefined && expect.split('/').includes(got)

// One classifier call, as $.model.complete makes it: the system prompt, the built prompt, no tools.
function askHaiku(item: Item): Promise<{ id?: string; raw: string; inTokens: number }> {
  return new Promise(resolve => {
    const env = { ...process.env }
    delete env.ANTHROPIC_API_KEY
    const child = spawn(
      'claude',
      ['-p', '--model', 'haiku', '--setting-sources', '', '--strict-mcp-config', '--tools', '', '--system-prompt', system, '--output-format', 'json', buildClassifierPrompt(item.user, item.answer)],
      { env, stdio: ['ignore', 'pipe', 'ignore'] },
    )
    let out = ''
    child.stdout.on('data', chunk => (out += chunk))
    child.on('close', () => {
      try {
        const reply = JSON.parse(out) as { result?: string; is_error?: boolean; usage?: { input_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } }
        const usage = reply.usage ?? {}
        const inTokens = (usage.input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0)
        resolve(reply.is_error ? { raw: `error: ${reply.result}`, inTokens } : { id: parseEmotion(reply.result ?? ''), raw: reply.result ?? '', inTokens })
      } catch {
        resolve({ raw: `unreadable: ${out.slice(0, 200)}`, inTokens: 0 })
      }
    })
  })
}

async function pool<T, R>(list: T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(list.length)
  let next = 0
  const worker = async () => {
    while (next < list.length) {
      const i = next++
      results[i] = await work(list[i]!)
    }
  }
  await Promise.all(Array.from({ length: Math.min(size, list.length) }, worker))

  return results
}

let done = 0
const scored: Scored[] = await pool(items, jobs, async item => {
  const result: Scored = { ...item }

  if (mode !== 'ai') {
    result.keywords = sceneForExchange(item.user, item.answer, false)
  }

  if (mode !== 'keywords') {
    const reply = await askHaiku(item)
    result.ai = reply.id
    result.raw = reply.raw
    result.inTokens = reply.inTokens
  }

  done++
  if (done % 25 === 0) {
    process.stderr.write(`${done}/${items.length}\n`)
  }

  return result
})

// Accuracy overall, by language and by expected emotion, and the most common confusions.
function report(key: 'ai' | 'keywords') {
  const rate = (list: Scored[]) => ({ n: list.length, acc: list.length ? Math.round((1000 * list.filter(s => isHit(s.expect, s[key])).length) / list.length) / 10 : 0 })
  const by = (field: (s: Scored) => string) => Object.fromEntries([...new Set(scored.map(field))].sort().map(value => [value, rate(scored.filter(s => field(s) === value))]))
  const confusions: Record<string, number> = {}

  for (const s of scored.filter(s => !isHit(s.expect, s[key]))) {
    const pair = `${s.expect} -> ${s[key] ?? 'none'}`
    confusions[pair] = (confusions[pair] ?? 0) + 1
  }

  return {
    overall: rate(scored),
    byLang: by(s => s.lang),
    byEmotion: by(s => s.expect),
    confusions: Object.fromEntries(Object.entries(confusions).sort((a, b) => b[1] - a[1]).slice(0, 20)),
  }
}

const summary = {
  items: scored.length,
  systemChars: system.length,
  ...(mode !== 'keywords' ? { ai: report('ai'), avgInTokens: Math.round(scored.reduce((n, s) => n + (s.inTokens ?? 0), 0) / Math.max(1, scored.length)) } : {}),
  ...(mode !== 'ai' ? { keywords: report('keywords') } : {}),
}

if (one('--out')) {
  writeFileSync(one('--out')!, JSON.stringify({ summary, scored }, null, 1))
}

console.log(JSON.stringify(summary, null, 1))
