/**
 * v1345 fix (2026-11-22): register help must be keyed by each register's own register_key
 * (`register:<register_key>:<field_key>`). Slice 2 keyed the industry registers' help by the sidebar MENU
 * CATEGORY code instead (`register:ict_cat_technical_debt:…`, `register:con_cat_commercial:…`), which no
 * register uses — so fields unique to those registers showed no help (only fields with a common
 * `register:*:<field>` entry did).
 *
 * This module reads the SQL folder and returns, for the help generator and the coverage check:
 *   - registerKeys: every real register_key
 *   - fieldsByRegister: register_key -> Set(field_key)
 *   - categoryRegisters: menu category code -> [register_key] (from the register menu seeds:
 *     ('<register uuid>', '<category code>', <sort>) rows placing each register under its category)
 * and expandRegisterKey(key) which turns a category-keyed help key into the real register keys whose
 * register has that field.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

let cache = null
export function loadRegisterKeys(sqlDir = path.join(ROOT, 'SQL')) {
  if (cache) return cache
  const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql'))
  const texts = files.map((f) => fs.readFileSync(path.join(sqlDir, f), 'utf8').replace(/\r/g, ''))
  const idToKey = new Map()
  // local_registers rows: ('uuid', 'register_key', …) where the column list starts (id, register_key, …)
  for (const t of texts) {
    for (const m of t.matchAll(/INSERT INTO (?:public\.)?local_registers\s*\(\s*id\s*,\s*register_key\b[^)]*\)([\s\S]*?);\s*\n/g)) {
      for (const r of m[1].matchAll(/\(\s*'([0-9a-f-]{36})'(?:::uuid)?\s*,\s*'([a-z][a-z0-9_]*)'/g)) idToKey.set(r[1], r[2])
    }
    // registers created by key elsewhere: register_key = 'x' … id = 'uuid' patterns
    for (const r of t.matchAll(/'([0-9a-f-]{36})'(?:::uuid)?\s*,\s*'([a-z]+_[a-z0-9_]+)'\s*,\s*'[^']+'\s*,\s*'[^']*'/g)) {
      if (!idToKey.has(r[1]) && !/_cat_/.test(r[2])) idToKey.set(r[1], r[2])
    }
  }
  const fieldsByRegister = new Map()
  const addField = (key, field) => {
    if (!key) return
    if (!fieldsByRegister.has(key)) fieldsByRegister.set(key, new Set())
    fieldsByRegister.get(key).add(field)
  }
  for (const t of texts) {
    for (const m of t.matchAll(/INSERT INTO (?:public\.|sim\.)?local_register_fields\s*\(([^)]*)\)\s*([\s\S]*?);\s*\n/g)) {
      const body = m[2]
      const regInSelect = (body.match(/SELECT\s+'([0-9a-f-]{36})'::uuid/) || [])[1]
      const regByKey = (body.match(/register_key\s*=\s*'([a-z0-9_]+)'/) || [])[1]
      // jsonb_build_object('value', …) calls are option lists, not field rows.
      for (const v of body.matchAll(/(?<!jsonb_build_object)\(\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'/g)) {
        const uuidFirst = /^[0-9a-f-]{36}$/.test(v[1])
        const key = uuidFirst ? idToKey.get(v[1]) : (regInSelect ? idToKey.get(regInSelect) : regByKey)
        const field = uuidFirst ? v[2] : v[1]
        if (/^[a-z][a-z0-9_]*$/.test(field)) addField(key, field)
      }
    }
  }
  const categoryRegisters = new Map()
  for (const t of texts) {
    for (const r of t.matchAll(/\(\s*'([0-9a-f-]{36})'\s*,\s*'([a-z]+_cat_[a-z0-9_]+)'\s*,\s*\d+\s*\)/g)) {
      const key = idToKey.get(r[1])
      if (!key) continue
      if (!categoryRegisters.has(r[2])) categoryRegisters.set(r[2], new Set())
      categoryRegisters.get(r[2]).add(key)
    }
  }
  cache = { idToKey, registerKeys: new Set(idToKey.values()), fieldsByRegister, categoryRegisters }
  return cache
}

/**
 * 'register:<category>:<field>' → ['register:<register_key>:<field>', …] for each register in that category
 * that has the field. Real register keys, the common '*' key and non-register keys are returned unchanged.
 */
export function expandRegisterKey(helpKey, maps = loadRegisterKeys()) {
  const m = /^register:([^:]+):(.+)$/.exec(helpKey)
  if (!m || m[1] === '*' || maps.registerKeys.has(m[1]) || !maps.categoryRegisters.has(m[1])) return [helpKey]
  const out = [...maps.categoryRegisters.get(m[1])].filter((r) => maps.fieldsByRegister.get(r)?.has(m[2])).map((r) => `register:${r}:${m[2]}`)
  return out.length ? out : [helpKey]
}
