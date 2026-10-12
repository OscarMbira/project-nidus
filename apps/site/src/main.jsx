import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const container = document.getElementById('root')
const initialData = window.__SITE_DATA__ || { products: [], content: [], navLinks: [], pages: [] }
const app = (
  <StrictMode>
    <App initialData={initialData} path={window.location.pathname} />
  </StrictMode>
)

// Production pages are prerendered (scripts/prerender.mjs); the dev server starts empty and loads.
if (container.firstElementChild) hydrateRoot(container, app)
else createRoot(container).render(app)
