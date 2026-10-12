/** v1241 — Server render used by scripts/prerender.mjs at build time (one call per page). */
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

export function render(data, path = '/') {
  return renderToString(<App initialData={data} path={path} />)
}
