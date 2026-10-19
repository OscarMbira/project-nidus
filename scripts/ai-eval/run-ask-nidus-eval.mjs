#!/usr/bin/env node
/**
 * v1272 (plan S1.8) — run the Ask Nidus eval set against a deployed agent-run function.
 *
 * Signs in as an eval user, asks every question (each in a new conversation), and checks the
 * answer against ground truth computed by running the question's expected spec through
 * ai_run_query as the same user. Pass thresholds: 90% English, 85% per other language.
 * Each question uses AI credits from the eval user's organisation.
 *
 * Env:
 *   SUPABASE_URL, SUPABASE_ANON_KEY       the project
 *   EVAL_EMAIL, EVAL_PASSWORD             an eval user in an organisation with seeded demo data,
 *                                         AI notice accepted and credits available
 *   EVAL_APP=platform|simulator           default platform
 *   EVAL_PROJECT_ID                       a demo project uuid for "this project" questions
 *   EVAL_LANGS=en,fr,es,de,pt-BR,it       default: all in the set
 * Usage:
 *   node scripts/ai-eval/run-ask-nidus-eval.mjs [--only q01,q09]
 * Writes scripts/ai-eval/results/eval-<timestamp>.json and exits 1 below threshold.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { bindSpec, scoreNoWrite, scoreQuery, scoreUnavailable, summarise } from './evalScoring.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const set = JSON.parse(fs.readFileSync(path.join(here, 'askNidusEvalSet.json'), 'utf8'))
const env = process.env
const url = String(env.SUPABASE_URL || '').replace(/\/$/, '')
const anon = env.SUPABASE_ANON_KEY
const app = env.EVAL_APP === 'simulator' ? 'simulator' : 'platform'
const projectId = env.EVAL_PROJECT_ID || null
const onlyArg = process.argv.indexOf('--only')
const only = onlyArg > 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null
const langs = new Set((env.EVAL_LANGS || ['en', ...Object.keys(set.translations)].join(',')).split(','))

if (!url || !anon || !env.EVAL_EMAIL || !env.EVAL_PASSWORD) {
  console.error('Set SUPABASE_URL, SUPABASE_ANON_KEY, EVAL_EMAIL and EVAL_PASSWORD.')
  process.exit(2)
}

const auth = createClient(url, anon, { auth: { persistSession: false } })
const { data: session, error: signInError } = await auth.auth.signInWithPassword({ email: env.EVAL_EMAIL, password: env.EVAL_PASSWORD })
if (signInError) { console.error('Sign-in failed:', signInError.message); process.exit(2) }
const token = session.session.access_token
const db = createClient(url, anon, {
  db: { schema: app === 'simulator' ? 'sim' : 'public' },
  global: { headers: { Authorization: `Bearer ${token}` } },
  auth: { persistSession: false },
})

async function ask(question) {
  const res = await fetch(`${url}/functions/v1/agent-run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: anon },
    body: JSON.stringify({ app, question, project_id: projectId }),
  })
  if (!res.ok) return { error: `${res.status} ${await res.text()}`, tables: [], answer: '' }
  const text = await res.text()
  const events = text.split('\n\n').map((p) => p.replace(/^data:\s*/, '')).filter(Boolean).map((d) => { try { return JSON.parse(d) } catch { return null } }).filter(Boolean)
  return {
    tables: events.filter((e) => e.type === 'table').map((e) => e.result),
    answer: events.filter((e) => e.type === 'answer').map((e) => e.text).join('\n'),
    error: events.find((e) => e.type === 'error')?.error || null,
    credits: events.find((e) => e.type === 'done')?.credits ?? null,
  }
}

const groundTruth = new Map()
async function expectedFor(q) {
  if (!groundTruth.has(q.id)) {
    const { data, error } = await db.rpc('ai_run_query', { p_spec: bindSpec(q.expected_spec, projectId) })
    if (error) throw new Error(`${q.id}: expected spec failed — ${error.message}`)
    groundTruth.set(q.id, data)
  }
  return groundTruth.get(q.id)
}

const byId = Object.fromEntries(set.questions.map((q) => [q.id, q]))
const runs = []
if (langs.has('en')) for (const q of set.questions) runs.push({ lang: 'en', q, text: q.text })
for (const [lang, items] of Object.entries(set.translations)) {
  if (!langs.has(lang)) continue
  for (const t of items) runs.push({ lang, q: byId[t.id], text: t.text })
}

const results = []
for (const { lang, q, text } of runs) {
  if (only && !only.has(q.id)) continue
  if (q.project && !projectId) { results.push({ lang, id: q.id, pass: false, reason: 'EVAL_PROJECT_ID not set', text }); continue }
  const out = await ask(text)
  let score
  if (out.error && !out.answer) score = { pass: false, reason: `error: ${out.error}` }
  else if (q.kind === 'no_write') score = scoreNoWrite(out.answer, out.tables)
  else if (q.kind === 'unavailable') score = scoreUnavailable(out.answer, out.tables)
  else score = scoreQuery(await expectedFor(q), out.tables, q.match || 'exact')
  results.push({ lang, id: q.id, text, ...score, credits: out.credits, answer: out.answer.slice(0, 1000), specs: out.tables.map((t) => t.spec) })
  console.log(`${score.pass ? 'PASS' : 'FAIL'} [${lang}] ${q.id} — ${score.reason}`)
}

const summary = summarise(results, set.thresholds)
const outDir = path.join(here, 'results')
fs.mkdirSync(outDir, { recursive: true })
const file = path.join(outDir, `eval-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
fs.writeFileSync(file, JSON.stringify({ app, projectId, summary, results }, null, 2))
for (const l of summary.languages) console.log(`${l.ok ? 'OK  ' : 'LOW '} ${l.lang}: ${l.passed}/${l.total} (${Math.round(l.rate * 100)}%, needs ${Math.round(l.threshold * 100)}%)`)
console.log(`Results: ${path.relative(process.cwd(), file)}`)
process.exit(summary.ok ? 0 : 1)
