import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PlanningProvider } from '@nidus/planning/context/PlanningContext.jsx'
import ModuleRoutes from './routes.jsx'
import { moduleInfo } from './index.jsx'

function DevShell() {
  return (
    <BrowserRouter>
      <div className="min-h-screen p-4">
        <header className="mb-4 text-sm text-gray-400">
          {moduleInfo.name} v{moduleInfo.version} — standalone dev
        </header>
        {/* Standalone dev: no shell, so no project picker; mode as in the real shell (v1239). */}
        <PlanningProvider mode="simulator" basePath="/simulator/pm/planning">
          <ModuleRoutes />
        </PlanningProvider>
      </div>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DevShell />
  </React.StrictMode>,
)
