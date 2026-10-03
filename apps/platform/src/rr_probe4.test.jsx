import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom'

function PmWrapper() {
  return <div data-testid="pm-wrapper">WRAPPER-RENDERED<Outlet /></div>
}

function App({ initial }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route element={<PmWrapper />}>
          <Route path="pm/okr" element={<div>OKR</div>} />
        </Route>
        <Route path="*" element={<div>CATCHALL</div>} />
      </Routes>
    </MemoryRouter>
  )
}

function resultFor(initial) {
  const { container } = render(<App initial={initial} />)
  return container.textContent
}

describe('pathless layout route with no matching child', () => {
  it('reports result for unmatched child path', () => {
    // pm/nonexistent has NO matching child inside PmWrapper's Route
    const r = resultFor('/pm/nonexistent')
    expect(r).toBe('')
  })
})
