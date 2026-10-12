// v1239 Slice 6.6 — generated-allowlist drift test + generator behaviour (node --test).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { collect, sqlBlock, replaceBlock, JSON_PATH, SQL_PATH, ALWAYS } from '../generate-planner-table-allowlist.mjs'

test('the committed allow-list matches what the Planner code actually uses (no drift)', () => {
  const { tables } = collect()
  const committed = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')).tables
  assert.deepEqual(committed, tables, 'run: node scripts/generate-planner-table-allowlist.mjs --write')
  const sql = fs.readFileSync(SQL_PATH, 'utf8')
  assert.equal(replaceBlock(sql, sqlBlock(tables)), sql, 'SQL/v1251 generated block is stale')
})

test('the planner needs its core planning tables', () => {
  const { tables } = collect()
  for (const t of ['tasks', 'task_dependencies', 'project_calendars', 'project_calendar_exceptions', 'project_baselines', 'timesheet_entries', 'projects']) {
    assert.ok(tables.includes(t), `${t} missing from the allow-list`)
  }
  for (const t of ALWAYS) assert.ok(tables.includes(t))
})

test('Platform-only registers are not reachable from the planner screens', () => {
  const { tables } = collect()
  for (const t of ['change_requests', 'issues', 'benefits', 'project_budgets']) {
    assert.ok(!tables.includes(t), `${t} should stay walled for planner sessions`)
  }
})

test('the SQL block is a valid insert + prune', () => {
  const block = sqlBlock(['a', 'b'])
  assert.match(block, /INSERT INTO public\.planner_table_allowlist \(table_name\) VALUES/)
  assert.match(block, /\('a'\),\n {2}\('b'\)/)
  assert.match(block, /DELETE FROM public\.planner_table_allowlist WHERE table_name NOT IN \('a', 'b'\);/)
})
