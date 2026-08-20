import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import SidebarNavNestedRow from '../SidebarNavNestedRow.jsx'
import SidebarNavTreeRow from '../SidebarNavTreeRow.jsx'

describe('SidebarNavNestedRow', () => {
  it('renders children without a dot at root level', () => {
    const { container } = render(
      <SidebarNavNestedRow level={0}>
        <a href="/home">Home</a>
      </SidebarNavNestedRow>,
    )

    expect(screen.getByText('Home')).toBeTruthy()
    expect(container.querySelector('[aria-hidden="true"].rounded-full')).toBeNull()
  })

  it('wraps nested rows with a connector dot', () => {
    const { container } = render(
      <SidebarNavNestedRow level={1}>
        <a href="/child">Child</a>
      </SidebarNavNestedRow>,
    )

    expect(screen.getByText('Child')).toBeTruthy()
    expect(container.querySelector('[aria-hidden="true"].rounded-full')).toBeTruthy()
  })
})

describe('SidebarNavTreeRow', () => {
  it('always renders a connector dot', () => {
    const { container } = render(
      <SidebarNavTreeRow>
        <span>Leaf</span>
      </SidebarNavTreeRow>,
    )

    expect(screen.getByText('Leaf')).toBeTruthy()
    expect(container.querySelector('[aria-hidden="true"].rounded-full')).toBeTruthy()
  })
})
