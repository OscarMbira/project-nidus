// v1352 — guard for rule 80 (scripts/check-background-jobs.mjs).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { checkSqlFiles, extractRegistrations, findCronSchedules, sqlVersion } from '../check-background-jobs.mjs'

test('reads the SQL version number', () => {
  assert.equal(sqlVersion('v1560_background_jobs_existing_jobs_and_tick.sql'), 1560)
  assert.equal(sqlVersion('v99_x.sql'), 99)
  assert.equal(sqlVersion('readme.sql'), null)
})

test('finds cron.schedule job names, ignoring comments', () => {
  const sql = [
    "PERFORM cron.schedule('nidus_background_tick', '* * * * *', $c$SELECT 1$c$);",
    "SELECT cron.schedule(job_name := 'legacy', schedule := '0 0 * * *', command := 'SELECT 1');",
    "-- SELECT cron.schedule('commented', '* * * * *', 'x');",
    "/* cron.schedule('block', '* * * * *', 'x') */",
  ].join('\n')
  assert.deepEqual(findCronSchedules(sql), ['nidus_background_tick', 'legacy'])
})

test('extracts catalogue registrations', () => {
  const sql = `SELECT public.background_job_register(
    p_code => 'ai.embed', p_name => 'Embed', p_kind => 'handler', p_cron => '*/2 * * * *');
  SELECT public.background_job_register(p_code => 'trial.expiry_check', p_name => 'Trial', p_kind => 'sql',
    p_sql_function => 'public.check_trial_expirations_cron');`
  assert.deepEqual(extractRegistrations(sql), [
    { code: 'ai.embed', kind: 'handler' },
    { code: 'trial.expiry_check', kind: 'sql' },
  ])
})

function tempSetup(files, handlers = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bgjobs-'))
  const handlerDir = path.join(dir, 'handlers')
  fs.mkdirSync(handlerDir)
  for (const [code, inIndex] of Object.entries(handlers)) {
    fs.writeFileSync(path.join(handlerDir, `${code}.js`), 'export async function handle() { return {} }')
    if (inIndex) fs.appendFileSync(path.join(handlerDir, 'index.js'), `'${code}': x,\n`)
  }
  if (!fs.existsSync(path.join(handlerDir, 'index.js'))) fs.writeFileSync(path.join(handlerDir, 'index.js'), '')
  const paths = Object.entries(files).map(([name, sql]) => {
    const p = path.join(dir, name)
    fs.writeFileSync(p, sql)
    return p
  })
  return { paths, handlerDir }
}

test('fails on a new cron.schedule other than the tick, but not in older files or test files', () => {
  const { paths, handlerDir } = tempSetup({
    'v1200_old.sql': "SELECT cron.schedule('old_job', '0 0 * * *', 'SELECT 1');",
    'v1560_tick.sql': "SELECT cron.schedule('nidus_background_tick', '* * * * *', 'SELECT 1');",
    'v1600_new.sql': "SELECT cron.schedule('my_feature_job', '0 1 * * *', 'SELECT 1');",
    'v1601_x_tests.sql': "SELECT cron.schedule('test_job', '0 1 * * *', 'SELECT 1');",
  })
  const problems = checkSqlFiles(paths, { handlerDir })
  assert.equal(problems.length, 1)
  assert.match(problems[0], /v1600_new\.sql: cron\.schedule\('my_feature_job'\)/)
})

test('fails on a handler job with no handler file or no registry entry', () => {
  const reg = (code) => `SELECT public.background_job_register(p_code => '${code}', p_name => 'X', p_kind => 'handler');`
  const { paths, handlerDir } = tempSetup(
    { 'v1600_jobs.sql': [reg('has.file'), reg('no.file'), reg('not.listed')].join('\n') },
    { 'has.file': true, 'not.listed': false },
  )
  const problems = checkSqlFiles(paths, { handlerDir })
  assert.equal(problems.length, 2)
  assert.ok(problems.some((p) => /'no\.file' has no handler file/.test(p)))
  assert.ok(problems.some((p) => /'not\.listed' is not listed in handlers\/index\.js/.test(p)))
})

test('the real repository passes', () => {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..')
  const sqlDir = path.join(root, 'SQL')
  const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql')).map((f) => path.join(sqlDir, f))
  assert.deepEqual(checkSqlFiles(files), [])
})
