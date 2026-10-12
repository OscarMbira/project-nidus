import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { compareGroup, findAliasOverrides, listShadowFiles } from '../check-shared-drift.mjs'

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'))
  for (const [rel, body] of Object.entries(files)) {
    const p = path.join(root, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, body)
  }
  return root
}

test('compareGroup classifies identical, stale-package, divergent and app-only files', () => {
  const root = fixture({
    'pkg/Same.jsx': 'a',
    'plat/Same.jsx': 'a',
    'sim/Same.jsx': 'a',
    'pkg/Stale.jsx': 'old',
    'plat/Stale.jsx': 'new',
    'sim/Stale.jsx': 'new',
    'pkg/Div.jsx': 'p',
    'plat/Div.jsx': 'x',
    'sim/Div.jsx': 'y',
    'plat/Only.jsx': 'o',
    'pkg/PkgOnly.jsx': 'k',
  })
  const r = compareGroup({
    pkgDir: path.join(root, 'pkg'),
    appDirs: [path.join(root, 'plat'), path.join(root, 'sim')],
  })
  assert.deepEqual(r.identical, ['Same.jsx'])
  assert.deepEqual(r.stalePackage, ['Stale.jsx'])
  assert.deepEqual(r.divergent, ['Div.jsx'])
  assert.deepEqual(r.appOnly, ['Only.jsx'])
})

test('compareGroup ignores test files and __tests__ folders', () => {
  const root = fixture({
    'pkg/A.jsx': 'a',
    'plat/A.jsx': 'a',
    'sim/A.jsx': 'a',
    'plat/A.test.jsx': 't',
    'plat/__tests__/B.jsx': 't',
  })
  const r = compareGroup({
    pkgDir: path.join(root, 'pkg'),
    appDirs: [path.join(root, 'plat'), path.join(root, 'sim')],
  })
  assert.deepEqual(r.appOnly, [])
  assert.deepEqual(r.identical, ['A.jsx'])
})

test('a file present in only one app is divergent when the package has it', () => {
  const root = fixture({ 'pkg/A.jsx': 'a', 'plat/A.jsx': 'a' })
  const r = compareGroup({
    pkgDir: path.join(root, 'pkg'),
    appDirs: [path.join(root, 'plat'), path.join(root, 'sim')],
  })
  assert.deepEqual(r.identical, ['A.jsx'])
})

test('compareGroup reports app re-export shims of the package separately', () => {
  const root = fixture({
    'pkg/Roles.js': 'export const A = 1',
    'plat/Roles.js': "export * from '../../../../packages/shared/src/constants/Roles.js';",
    'sim/Roles.js': "export * from '../../../../packages/shared/src/constants/Roles.js';",
  })
  const r = compareGroup({
    pkgDir: path.join(root, 'pkg'),
    appDirs: [path.join(root, 'plat'), path.join(root, 'sim')],
  })
  assert.deepEqual(r.shim, ['Roles.js'])
  assert.deepEqual(r.stalePackage, [])
})

test('findAliasOverrides reports @nidus/ui and @nidus/shared/* aliases but not federation', () => {
  const root = fixture({
    'vite.config.js': `alias: {
      '@nidus/ui': path.resolve(__dirname, 'src/components/ui'),
      '@nidus/shared/utils': path.resolve(__dirname, 'src/utils'),
      '@nidus/shared/federation': path.resolve(repoRoot, 'packages/shared/src/federation'),
    }`,
  })
  const found = findAliasOverrides([path.join(root, 'vite.config.js')])
  assert.deepEqual(found.map((f) => f.alias), ['@nidus/ui', '@nidus/shared/utils'])
})

test('listShadowFiles returns source files left in shadow folders (tests included)', () => {
  const root = fixture({ 'plat/A.jsx': 'a', 'plat/__tests__/A.test.jsx': 't', 'plat/readme.md': 'x' })
  assert.deepEqual(listShadowFiles([path.join(root, 'plat')]).map((f) => path.basename(f)).sort(), ['A.jsx', 'A.test.jsx'])
})
