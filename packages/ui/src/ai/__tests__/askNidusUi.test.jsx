import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AiAnswerText, { answerBlocks } from '../AiAnswerText.jsx'
import AiAccessNotice, { accessMessage } from '../AiAccessNotice.jsx'
import AiResultTable from '../AiResultTable.jsx'

describe('Ask Nidus modules', () => {
  it('load without errors', async () => {
    for (const mod of await Promise.all([
      import('../AskNidusChat.jsx'),
      import('../AskNidusWidget.jsx'),
      import('../AskNidusWorkspace.jsx'),
      import('../AiSettingsPage.jsx'),
    ])) expect(typeof mod.default).toBe('function')
  })
})

describe('AiAnswerText', () => {
  it('splits paragraphs, bullet and numbered lists', () => {
    const blocks = answerBlocks('There are 3 risks.\n\n- RSK-1 open\n- RSK-2 open\n1. First\n2. Second')
    expect(blocks.map((b) => b.type)).toEqual(['p', 'list', 'list'])
    expect(blocks[1].ordered).toBe(false)
    expect(blocks[2].items).toEqual(['First', 'Second'])
  })

  it('renders bold text without using HTML from the model', () => {
    render(<AiAnswerText text={'**3 risks** are high <script>x</script>'} />)
    expect(screen.getByText('3 risks').tagName).toBe('STRONG')
    expect(document.querySelector('script')).toBeNull()
  })
})

describe('AiAccessNotice', () => {
  const base = { allowed: false, owner_name: 'Ana', can_manage: false }

  it('asks members to contact the owner when AI is not enabled', () => {
    expect(accessMessage({ ...base, reason: 'not_enabled' })).toMatch(/Ask Ana/)
  })

  it('points managers to AI Settings', () => {
    render(<MemoryRouter><AiAccessNotice status={{ ...base, reason: 'not_enabled', can_manage: true }} settingsPath="/x/ai" /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Open AI Settings' })).toHaveAttribute('href', '/x/ai')
  })

  it('uses the translated message when one is provided', () => {
    expect(accessMessage({ ...base, reason: 'kill_switch' }, { kill_switch: 'IA indisponible' })).toBe('IA indisponible')
  })

  it('warns at the warning level and shows nothing when all is fine', () => {
    const { rerender, container } = render(<MemoryRouter><AiAccessNotice status={{ allowed: true, warning_level: 'warn', percent: 84.6 }} /></MemoryRouter>)
    expect(screen.getByText(/85% of this period's AI credits/)).toBeInTheDocument()
    rerender(<MemoryRouter><AiAccessNotice status={{ allowed: true, warning_level: 'none' }} /></MemoryRouter>)
    expect(container.textContent).toBe('')
  })
})

describe('AiResultTable', () => {
  const result = {
    entity_label: 'Risks',
    explanation: 'Risks where status eq open',
    route_template: '/platform/risks/{id}',
    mode: 'rows',
    total_count: 2,
    row_count: 2,
    columns: [{ key: 'display_id', label: 'Risk ID', type: 'text' }, { key: 'risk_score', label: 'Score', type: 'number' }],
    rows: [
      { __id: 'a', display_id: 'RSK-1', risk_score: 4 },
      { __id: 'b', display_id: 'RSK-2', risk_score: 12 },
    ],
  }

  it('shows what was looked up, row numbers and record links', () => {
    render(<MemoryRouter><AiResultTable result={result} /></MemoryRouter>)
    expect(screen.getByText(/Risks where status eq open/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'RSK-1' })).toHaveAttribute('href', '/platform/risks/a')
    expect(screen.getByLabelText('Row 2')).toBeInTheDocument()
  })

  it('does not link grouped rows or Planner results', () => {
    render(<MemoryRouter><AiResultTable result={{ ...result, mode: 'grouped' }} /></MemoryRouter>)
    expect(screen.queryByRole('link', { name: 'RSK-1' })).toBeNull()
  })
})

describe('AskNidusAboutButton (v1272 S1.3)', () => {
  it('opens the widget pre-filled for the register', async () => {
    const { default: AskNidusAboutButton, askNidusAboutText } = await import('../AskNidusAboutButton.jsx')
    const { fireEvent } = await import('@testing-library/react')
    const { AppConfigProvider } = await import('@nidus/shared/context/AppConfigContext')
    const seen = []
    const onPrefill = (e) => seen.push(e.detail.question)
    window.addEventListener('ai-widget-prefill', onPrefill)
    render(<AppConfigProvider app="platform" db={null}><AskNidusAboutButton registerLabel="Risk Register" /></AppConfigProvider>)
    fireEvent.click(screen.getByRole('button', { name: /ask nidus about this/i }))
    window.removeEventListener('ai-widget-prefill', onPrefill)
    expect(seen).toEqual([askNidusAboutText('Risk Register')])
    expect(seen[0]).toBe('About the risk register: ')
  })
})
