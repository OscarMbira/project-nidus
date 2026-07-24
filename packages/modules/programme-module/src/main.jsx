import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import ModuleRoutes from './routes.jsx'
import { moduleInfo } from './index.jsx'

function DevShell() {
  return (
    <BrowserRouter>
      <div className="min-h-screen p-4">
        <header className="mb-4 text-sm text-gray-400">
          {moduleInfo.name} v{moduleInfo.version} — standalone dev
        </header>
        <ModuleRoutes />
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DevShell />
  </React.StrictMode>,
)
