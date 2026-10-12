// v1239 1.5 — the shared planning package and the two planning modules must not import from
// apps/* (rule 46). The hub remote used to lazy-load '@platform/pages/planning/...'.
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '../../../..')
const roots = [
  'packages/planning/src',
  'packages/modules/planning-hub/src',
  'packages/modules/sim-planning-module/src',
].map((p) => path.join(repo, p))

const files = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name)
  if (e.isDirectory()) return e.name === 'node_modules' ? [] : files(p)
  return /\.(jsx?|mjs)$/.test(e.name) ? [p] : []
})

describe('planning package boundaries', () => {
  it('has no import from an app (@platform, @simulator, @shell or apps/*)', () => {
    const offenders = []
    for (const root of roots) {
      for (const f of files(root)) {
        if (f.endsWith('noAppImports.test.js')) continue
        const src = fs.readFileSync(f, 'utf8')
        for (const m of src.matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)) {
          if (/^@(platform|simulator|shell)\//.test(m[1]) || /(^|\/)apps\//.test(m[1])) {
            offenders.push(`${path.relative(repo, f)} -> ${m[1]}`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
