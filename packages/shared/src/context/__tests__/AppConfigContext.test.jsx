// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppConfigProvider, useAppConfig, APP_IDS } from '../AppConfigContext.jsx'

function Probe() {
  const { app, basePath, db } = useAppConfig()
  return <div data-testid="probe">{`${app}|${basePath}|${db?.name}`}</div>
}

describe('AppConfigContext', () => {
  it('exposes app, basePath and db to descendants', () => {
    render(
      <AppConfigProvider app="simulator" basePath="/simulator" db={{ name: 'simDb' }}>
        <Probe />
      </AppConfigProvider>
    )
    expect(screen.getByTestId('probe').textContent).toBe('simulator|/simulator|simDb')
  })

  it('throws a clear error when used outside the provider', () => {
    const original = console.error
    console.error = () => {}
    try {
      expect(() => render(<Probe />)).toThrow(/AppConfigProvider/)
    } finally {
      console.error = original
    }
  })

  it('rejects an unknown app id', () => {
    const original = console.error
    console.error = () => {}
    try {
      expect(() =>
        render(
          <AppConfigProvider app="admin" basePath="" db={{}}>
            <Probe />
          </AppConfigProvider>
        )
      ).toThrow(/Unknown app/)
    } finally {
      console.error = original
    }
  })

  it('lists the supported app ids', () => {
    expect(APP_IDS).toEqual(['platform', 'simulator', 'planner'])
  })
})
