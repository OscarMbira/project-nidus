#!/usr/bin/env node
/**
 * v1352 guard (CLAUDE.md rule 80, PRD D9): background work runs through the job catalogue and the single
 * tick, never through its own pg_cron entry.
 *
 * Fails when:
 *   1. a SQL file numbered from v1559 on (the v1352 framework) calls cron.schedule for anything other than
 *      'nidus_background_tick';
 *   2. a catalogue job registered as kind 'handler' (public.background_job_register(... p_kind => 'handler'))
 *      has no handler file supabase/functions/background-job-worker/handlers/<code>.js, or is missing from
 *      handlers/index.js.
 * SQL test files (*_tests.sql) are ignored; they register throw-away jobs inside a rolled-back transaction.
 *
 *   node scripts/check-background-jobs.mjs                      check the monorepo SQL folder
 *   node scripts/check-background-jobs.mjs --admin-sql <dir>    also check Admin SQL registrations (local use)
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const FIRST_CHECKED_VERSION = 1559
export const TICK_JOB_NAME = 'nidus_background_tick'
const HANDLER_DIR = path.join(ROOT, 'supabase', 'functions', 'background-job-worker', 'handlers')

export function sqlVersion(fileName) {
  const m = /^v(\d+)[a-z]?_/i.exec(path.basename(fileName))
  return m ? Number(m[1]) : null
}

function stripComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '')
}

/** Job names passed to cron.schedule (positional or job_name := …); '?' when the name is not a literal. */
export function findCronSchedules(sql) {
  const names = []
  for (const m of stripComments(sql).matchAll(/cron\.schedule\s*\(\s*(?:job_name\s*:?=>?\s*)?('([^']*)')?/gi)) {
    names.push(m[2] ?? '?')
  }
  return names
}

/** { code, kind } for every background_job_register(...) call with literal p_code / p_kind. */
export function extractRegistrations(sql) {
  const out = []
  for (const m of stripComments(sql).matchAll(/background_job_register\s*\(([\s\S]*?)\)\s*;/g)) {
    const args = m[1]
    const code = /p_code\s*=>\s*'([^']+)'/.exec(args)?.[1]
    const kind = /p_kind\s*=>\s*'([^']+)'/.exec(args)?.[1]
    if (code && kind) out.push({ code, kind })
  }
  return out
}

export function checkSqlFiles(files, { handlerDir = HANDLER_DIR } = {}) {
  const problems = []
  const indexPath = path.join(handlerDir, 'index.js')
  const index = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : ''
  for (const file of files) {
    const name = path.basename(file)
    if (/_tests?\.sql$/i.test(name)) continue
    const sql = fs.readFileSync(file, 'utf8')
    const version = sqlVersion(name)
    if (version !== null && version >= FIRST_CHECKED_VERSION) {
      for (const job of findCronSchedules(sql)) {
        if (job !== TICK_JOB_NAME) {
          problems.push(`${name}: cron.schedule('${job}') — register the job in public.background_jobs instead (rule 80)`)
        }
      }
    }
    for (const { code, kind } of extractRegistrations(sql)) {
      if (kind !== 'handler') continue
      if (!fs.existsSync(path.join(handlerDir, `${code}.js`))) {
        problems.push(`${name}: handler job '${code}' has no handler file handlers/${code}.js`)
      } else if (!index.includes(`'${code}'`)) {
        problems.push(`${name}: handler job '${code}' is not listed in handlers/index.js`)
      }
    }
  }
  return problems
}

function sqlFilesIn(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).map((f) => path.join(dir, f))
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2)
  const files = sqlFilesIn(path.join(ROOT, 'SQL'))
  const adminAt = argv.indexOf('--admin-sql')
  if (adminAt >= 0 && argv[adminAt + 1]) {
    // Admin SQL has its own numbering; only its registrations are checked here (its cron rule is checked in the Admin repo).
    for (const f of sqlFilesIn(path.resolve(argv[adminAt + 1]))) {
      const regs = extractRegistrations(fs.readFileSync(f, 'utf8'))
      if (regs.some((r) => r.kind === 'handler')) files.push(f)
    }
  }
  const problems = checkSqlFiles(files)
  if (problems.length) {
    console.error(`Background job check failed (${problems.length}):`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`Background job check passed (${files.length} SQL files).`)
}
