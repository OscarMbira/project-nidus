// v1349 — reachability rules for scripts/find-unreachable-app-files.mjs, on a small fixture app.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { findUnreachable } from '../find-unreachable-app-files.mjs'

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unreach-'))
  for (const [rel, text] of Object.entries(files)) {
    const p = path.join(dir, rel)
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, text)
  }
  return dir
}

test('follows relative imports from main.jsx and reports the rest', () => {
  const src = fixture({
    'main.jsx': "import App from './App'\n",
    'App.jsx': "import Used from './components/Used'\nexport default () => <Used />\n",
    'components/Used.jsx': "import { x } from '../utils/x.js'\nexport default () => null\n",
    'utils/x.js': 'export const x = 1\n',
    'components/Unused.jsx': 'export default () => null\n',
  })
  assert.deepEqual(findUnreachable({ src }).dead, ['components/Unused.jsx'])
})

test('a lazy page counts only when a reachable file renders it', () => {
  const src = fixture({
    'main.jsx': "import './routes/routes.jsx'\n",
    'routes/lazyImports.js': "export const Live = lazy(() => import('../pages/Live'))\nexport const Ghost = lazy(() => import('../pages/Ghost'))\n",
    'routes/routes.jsx': "import { Live, Ghost } from './lazyImports'\nexport default <Route element={<Live />} />\n",
    'pages/Live.jsx': 'export default () => null\n',
    'pages/Ghost.jsx': 'export default () => null\n',
  })
  assert.deepEqual(findUnreachable({ src }).dead, ['pages/Ghost.jsx'])
})

test('a page rendered only by an unreachable file stays unreachable', () => {
  const src = fixture({
    'main.jsx': "import './routes/lazyImports.js'\n",
    'routes/lazyImports.js': "export const Old = lazy(() => import('../pages/Old'))\n",
    'routes/deadRoutes.jsx': "import { Old } from './lazyImports'\nexport default <Old />\n",
    'pages/Old.jsx': 'export default () => null\n',
  })
  assert.deepEqual(findUnreachable({ src }).dead, ['pages/Old.jsx', 'routes/deadRoutes.jsx'])
})

test('@shell targets used by a package count as reachable', () => {
  const src = fixture({
    'main.jsx': 'export {}\n',
    'lib/useThing.js': "import { y } from './y.js'\nexport const useThing = () => y\n",
    'lib/y.js': 'export const y = 2\n',
  })
  const packagesDir = fixture({ 'mod/src/Page.jsx': "import { useThing } from '@shell/lib/useThing.js'\n" })
  assert.deepEqual(findUnreachable({ src, packagesDir }).dead, [])
})

test('tests are neither entry points nor results', () => {
  const src = fixture({
    'main.jsx': 'export {}\n',
    'components/__tests__/A.test.jsx': "import A from '../A'\n",
    'components/A.jsx': 'export default () => null\n',
  })
  assert.deepEqual(findUnreachable({ src }).dead, ['components/A.jsx'])
})

test('imports resolve without regard to case (Windows / macOS)', () => {
  const src = fixture({
    'main.jsx': "import Redirect from './components/AppToPlatformRedirect'\n",
    'components/AppToplatformRedirect.jsx': 'export default () => null\n',
  })
  assert.deepEqual(findUnreachable({ src }).dead, [])
})

test('a lazy component rendered under another name counts as rendered', () => {
  const src = fixture({
    'main.jsx': "import { Layout } from './routes/lazyImports.js'\nexport default <Layout />\n",
    'routes/lazyImports.js': "export { AppLayout as Layout } from '../components/AppLayout'\n",
    'components/AppLayout.js': "export const AppLayout = lazy(() => import('./Layout'))\n",
    'components/Layout.jsx': 'export default () => null\n',
  })
  assert.deepEqual(findUnreachable({ src }).dead, [])
})
