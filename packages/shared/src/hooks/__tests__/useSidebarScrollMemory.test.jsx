import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { useSidebarScrollMemory, readSidebarExpanded, saveSidebarExpanded } from '../useSidebarScrollMemory'

function fakeScroller(el, { scrollHeight = 2000, clientHeight = 500 } = {}) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: scrollHeight })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: clientHeight })
}

function Menu({ scope, ready = true }) {
  const ref = useSidebarScrollMemory(scope, ready, null)
  return (
    <nav ref={(el) => { if (el) fakeScroller(el); ref.current = el }} data-testid="nav">
      <a href="/x" aria-current="page">Active</a>
    </nav>
  )
}

describe('useSidebarScrollMemory', () => {
  beforeEach(() => sessionStorage.clear())

  it('puts the menu back where the user left it after the sidebar is re-created', () => {
    sessionStorage.setItem('nidus:sidebarScroll:plat:main', '640')
    const { getByTestId } = render(<Menu scope="plat:main" />)
    expect(getByTestId('nav').scrollTop).toBe(640)
  })

  it('keeps separate positions per sidebar', () => {
    sessionStorage.setItem('nidus:sidebarScroll:plat:pmo', '300')
    const { getByTestId } = render(<Menu scope="plat:pmo" />)
    expect(getByTestId('nav').scrollTop).toBe(300)
  })

  it('waits until the menu has rendered', () => {
    sessionStorage.setItem('nidus:sidebarScroll:sim:main', '200')
    const { getByTestId, rerender } = render(<Menu scope="sim:main" ready={false} />)
    expect(getByTestId('nav').scrollTop).toBe(0)
    rerender(<Menu scope="sim:main" ready />)
    expect(getByTestId('nav').scrollTop).toBe(200)
  })
})

describe('remembered open group', () => {
  beforeEach(() => sessionStorage.clear())
  it('saves, reads and clears the open group per sidebar', () => {
    saveSidebarExpanded('plat:main', 'section:project_setup')
    expect(readSidebarExpanded('plat:main')).toBe('section:project_setup')
    expect(readSidebarExpanded('plat:pmo')).toBeNull()
    saveSidebarExpanded('plat:main', null)
    expect(readSidebarExpanded('plat:main')).toBeNull()
  })
})
