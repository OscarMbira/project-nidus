#!/usr/bin/env node
/**
 * v1272 Phase 2b — meaning-search recall check (plan S2b.1) and multilingual spike (S2b.3, D22a).
 *
 * Embeds the labelled near-duplicate set through the deployed ai-embed function (eval mode) and
 * reports recall@5 per language. English must reach the set's threshold (0.8).
 *
 * Env: SUPABASE_URL, AI_CRON_SECRET (the ai-embed secret)
 * Usage:
 *   node scripts/ai-eval/run-meaning-search-eval.mjs                       # gte-small (production model)
 *   node scripts/ai-eval/run-meaning-search-eval.mjs --model multilingual-e5-small   # D22a spike candidate
 * Writes scripts/ai-eval/results/meaning-<model>-<timestamp>.json; exits 1 if English is below threshold.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { nearDuplicateRecall } from './evalScoring.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const set = JSON.parse(fs.readFileSync(path.join(here, 'nearDuplicateSet.json'), 'utf8'))
const url = String(process.env.SUPABASE_URL || '').replace(/\/$/, '')
const secret = process.env.AI_CRON_SECRET
const mi = process.argv.indexOf('--model')
const model = mi > 0 ? process.argv[mi + 1] : 'gte-small'
if (!url || !secret) { console.error('Set SUPABASE_URL and AI_CRON_SECRET.'); process.exit(2) }

const texts = new Set(set.distractors)
const sets = { en: set.pairs, ...set.translations }
for (const pairs of Object.values(sets)) for (const p of pairs) { texts.add(p.query); texts.add(p.match) }
const list = [...texts]

const vectors = new Map()
let totalMs = 0
let memory = null
for (let i = 0; i < list.length; i += 50) {
  const batch = list.slice(i, i + 50)
  // gte-small runs in ai-embed; the D22a spike model has its own function (deploy it only for the spike).
  const fn = model === 'gte-small' ? 'ai-embed' : 'ai-embed-spike'
  const res = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ai-cron-secret': secret },
    body: JSON.stringify({ mode: 'eval', texts: batch }),
  })
  if (!res.ok) { console.error(`${fn} failed: ${res.status} ${await res.text()}`); process.exit(2) }
  const body = await res.json()
  body.vectors.forEach((v, j) => vectors.set(batch[j], v))
  totalMs += body.ms || 0
  memory = body.memory_mb ?? memory
}

const report = { model, texts: list.length, ms_total: totalMs, ms_per_text: Math.round(totalMs / list.length), memory_mb: memory, languages: {} }
for (const [lang, pairs] of Object.entries(sets)) {
  const r = nearDuplicateRecall(pairs, set.distractors, (t) => vectors.get(t), 5)
  report.languages[lang] = { pairs: pairs.length, recall_at_5: Math.round(r.recall * 1000) / 1000, misses: r.misses }
  console.log(`${lang.padEnd(6)} recall@5 ${(r.recall * 100).toFixed(0)}% (${pairs.length} pairs)`)
}
console.log(`${list.length} texts, ${report.ms_per_text} ms per text${memory ? `, ~${memory} MB` : ''}`)

const outDir = path.join(here, 'results')
fs.mkdirSync(outDir, { recursive: true })
const file = path.join(outDir, `meaning-${model}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
fs.writeFileSync(file, JSON.stringify(report, null, 2))
console.log(`Results: ${path.relative(process.cwd(), file)}`)
process.exit(report.languages.en.recall_at_5 >= set.threshold ? 0 : 1)
