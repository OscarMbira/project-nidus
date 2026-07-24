/**
 * Fix @nidus/shared/* imports that point to non-existent package paths.
 * Resolves to relative paths when the module lives under features/ or elsewhere in the app.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const APP = path.join(ROOT, 'apps/platform/src')

function walk(dir, cb) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name)
    if (e.isDirectory() && e.name !== 'node_modules') walk(full, cb)
    else if (/\.(jsx?)$/.test(e.name)) cb(full)
  }
}

function findModule(basename) {
  const names = [`${basename}.js`, `${basename}.jsx`, `${basename}/index.js`]
  let found = null
  function search(dir) {
    if (found || !fs.existsSync(dir)) return
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) search(full)
      else if (names.some((n) => e.name === n || full.endsWith(n.replace('/index.js', '')))) {
        if (e.name === `${basename}.js` || e.name === `${basename}.jsx`) {
          found = full
          return
        }
      }
    }
  }
  search(APP)
  if (!found) {
    for (const e of fs.readdirSync(APP, { withFileTypes: true })) {
      if (e.isFile() && (e.name === `${basename}.js` || e.name === `${basename}.jsx`)) {
        found = path.join(APP, e.name)
        break
      }
    }
  }
  // deep search by filename
  if (!found) {
    function deep(d) {
      if (found) return
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name)
        if (e.isDirectory()) deep(full)
        else if (e.name === `${basename}.js` || e.name === `${basename}.jsx`) {
          found = full
          return
        }
      }
    }
    deep(APP)
  }
  return found
}

function existsInShared(subpath) {
  const base = path.join(ROOT, 'packages/shared/src', subpath)
  return fs.existsSync(`${base}.js`) || fs.existsSync(`${base}.jsx`) || fs.existsSync(base)
}

function existsInApp(subpath) {
  const base = path.join(APP, subpath)
  return fs.existsSync(`${base}.js`) || fs.existsSync(`${base}.jsx`)
}

let fixed = 0

walk(APP, (file) => {
  let content = fs.readFileSync(file, 'utf8')
  let changed = false

  content = content.replace(
    /from ['"]@nidus\/shared\/(utils|hooks|context|constants)\/([^'"]+)['"]/g,
    (match, kind, mod) => {
      const sub = `${kind}/${mod}`
      if (existsInShared(sub) || existsInApp(sub)) return match

      const target = findModule(path.basename(mod))
      if (!target) return match

      let rel = path.relative(path.dirname(file), target).replace(/\\/g, '/')
      if (!rel.startsWith('.')) rel = `./${rel}`
      rel = rel.replace(/\.jsx?$/, '')
      changed = true
      fixed++
      return `from '${rel}'`
    },
  )

  if (changed) fs.writeFileSync(file, content, 'utf8')
})

console.log(`Fixed ${fixed} broken @nidus/shared imports in apps/platform`)
