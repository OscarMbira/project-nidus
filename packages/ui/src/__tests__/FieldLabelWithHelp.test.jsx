import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const loadFieldHelp = vi.fn()
const recordFieldHelpOpen = vi.fn()
const recordFieldHelpVote = vi.fn(() => Promise.resolve({ success: true }))

vi.mock('@nidus/shared/services/fieldHelpService.js', () => ({
  loadFieldHelp: (...a) => loadFieldHelp(...a),
  recordFieldHelpOpen: (...a) => recordFieldHelpOpen(...a),
  recordFieldHelpVote: (...a) => recordFieldHelpVote(...a),
}))
vi.mock('@nidus/shared/hooks/useRegionalFormatSettings.js', () => ({
  useRegionalFormatSettings: () => ({ date_format: 'DD/MM/YYYY', locale: 'en-GB' }),
}))

const { FieldHelpScope } = await import('@nidus/shared/context/FieldHelpContext')
const { default: FieldLabelWithHelp, computeHelpPopoverPlacement } = await import('../FieldLabelWithHelp')

describe('help card placement — never cut off', () => {
  const vp = { viewportWidth: 1200, viewportHeight: 800 }

  it('opens below the ⓘ when the card fits there', () => {
    const p = computeHelpPopoverPlacement({ ...vp, rect: { left: 100, top: 100, bottom: 116 }, height: 300 })
    expect(p.side).toBe('below')
    expect(p.top).toBe(122)
  })

  it('flips above when the card does not fit below but fits above (field near the bottom)', () => {
    const p = computeHelpPopoverPlacement({ ...vp, rect: { left: 900, top: 670, bottom: 686 }, height: 300 })
    expect(p.side).toBe('above')
    expect(p.top).toBe(670 - 6 - 300)
    expect(p.top).toBeGreaterThanOrEqual(16)
  })

  it('uses the roomier side and scrolls inside when it fits neither', () => {
    const p = computeHelpPopoverPlacement({ ...vp, rect: { left: 100, top: 500, bottom: 516 }, height: 900 })
    expect(p.side).toBe('above')
    expect(p.top).toBe(16)
    expect(p.maxHeight).toBe(500 - 6 - 16)
  })

  it('keeps the card inside the screen horizontally', () => {
    const p = computeHelpPopoverPlacement({ ...vp, rect: { left: 1150, top: 100, bottom: 116 }, height: 100 })
    expect(p.left + p.width).toBeLessThanOrEqual(1200 - 16)
    const narrow = computeHelpPopoverPlacement({ viewportWidth: 320, viewportHeight: 700, rect: { left: 300, top: 100, bottom: 116 }, height: 100 })
    expect(narrow.width).toBe(320 - 32)
    expect(narrow.left).toBe(16)
  })
})

const NAME_HELP = {
  help_key: 'k.name', title: 'Stakeholder name', purpose: 'The person or group.', examples: '- Rutendo Chikwanha',
  format_notes: 'Shown as {date_format}', extra_notes: null, learn_more_kind: 'documentation', learn_more_key: 'stakeholders#basics',
}

function renderLabel(props = {}, helpKeys = ['k.name']) {
  return render(
    <FieldHelpScope helpKeys={helpKeys}>
      <FieldLabelWithHelp helpKey="k.name" htmlFor="name" className="block" {...props}>Stakeholder Name *</FieldLabelWithHelp>
      <input id="name" />
    </FieldHelpScope>,
  )
}

describe('FieldLabelWithHelp (v1345)', () => {
  beforeEach(() => {
    loadFieldHelp.mockReset()
    recordFieldHelpOpen.mockReset()
    loadFieldHelp.mockResolvedValue({ 'k.name': NAME_HELP })
  })

  it('shows a plain label with no affordance when the field has no help (D10)', async () => {
    loadFieldHelp.mockResolvedValue({ 'k.name': null })
    renderLabel()
    await waitFor(() => expect(loadFieldHelp).toHaveBeenCalled())
    expect(screen.getByText('Stakeholder Name *')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /help/i })).toBeNull()
  })

  it('opens the popover from ⓘ with purpose, derived rules, tokens and a safe Learn more link', async () => {
    renderLabel({ required: true, maxLength: 120 })
    fireEvent.click(await screen.findByRole('button', { name: 'Help: Stakeholder name' }))
    const dialog = screen.getByRole('dialog', { name: 'Stakeholder name' })
    expect(dialog).toHaveTextContent('The person or group.')
    expect(dialog).toHaveTextContent('Required.')
    expect(dialog).toHaveTextContent('Up to 120 characters.')
    expect(dialog).toHaveTextContent('Shown as DD/MM/YYYY')
    const link = screen.getByRole('link', { name: 'Learn more' })
    expect(link).toHaveAttribute('href', '/documentation/platform/stakeholders#basics')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(recordFieldHelpOpen).toHaveBeenCalledWith(null, 'k.name')
    expect(document.getElementById('name').getAttribute('aria-describedby')).toBe(dialog.id)
  })

  it('opens on label double-click without selecting text, and Escape closes it (G-D17, WCAG)', async () => {
    renderLabel()
    const label = (await screen.findByRole('button', { name: /help/i })).closest('label')
    const down = new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, detail: 2 })
    label.dispatchEvent(down)
    expect(down.defaultPrevented).toBe(true)
    fireEvent.doubleClick(label)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('does not open on double-click for checkbox labels, but ⓘ still works', async () => {
    renderLabel({ control: 'checkbox' })
    const button = await screen.findByRole('button', { name: /help/i })
    fireEvent.doubleClick(button.closest('label').firstChild)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(button)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('records a helpful vote', async () => {
    renderLabel()
    fireEvent.click(await screen.findByRole('button', { name: /help/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(recordFieldHelpVote).toHaveBeenCalledWith(null, 'k.name', true)
    expect(await screen.findByText('Thanks for your feedback.')).toBeInTheDocument()
  })

  it('keeps ⓘ faintly visible on touch screens only where help exists (G-D8, P19)', async () => {
    renderLabel()
    const button = await screen.findByRole('button', { name: /help/i })
    expect(button.className).toContain('pointer-coarse:opacity-60')
    expect(button.className).toContain('opacity-0')
  })

  it('reads rules from the labelled field itself (G-D7)', async () => {
    render(
      <FieldHelpScope helpKeys={['k.name']}>
        <FieldLabelWithHelp helpKey="k.name" htmlFor="type">Type</FieldLabelWithHelp>
        <select id="type" required><option value="">—</option><option>Internal</option><option>External</option></select>
      </FieldHelpScope>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /help/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Required.')
    expect(dialog).toHaveTextContent('Choose from: Internal, External.')
  })

  it('looks like an ordinary label — no underline (D4 amended)', async () => {
    renderLabel()
    const label = (await screen.findByRole('button', { name: /help/i })).closest('label')
    expect(label.innerHTML).not.toMatch(/underline|decoration-dotted/)
  })

  it('reveals ⓘ while the pointer is over the field itself', async () => {
    renderLabel()
    const button = await screen.findByRole('button', { name: /help/i })
    expect(button.className).toContain('opacity-0')
    fireEvent.mouseEnter(document.getElementById('name'))
    expect(button.className).toContain('opacity-100')
    fireEvent.mouseLeave(document.getElementById('name'))
    expect(button.className).toContain('opacity-0')
  })

  it('shows help written on a user-created field without any help row (slice 1b)', async () => {
    loadFieldHelp.mockResolvedValue({})
    render(
      <FieldHelpScope helpKeys={[]}>
        <FieldLabelWithHelp helpKey="custom:cf1" help={{ title: 'Supplier tier', purpose: 'How important the supplier is.', examples: 'Tier 1 – Dubai' }}>Supplier tier</FieldLabelWithHelp>
      </FieldHelpScope>,
    )
    fireEvent.click(await screen.findByRole('button', { name: 'Help: Supplier tier' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('How important the supplier is.')
    expect(screen.getByRole('dialog')).toHaveTextContent('Tier 1 – Dubai')
  })

  it('shows a plain label when a user-created field has no help yet (CF-D3)', () => {
    render(<FieldLabelWithHelp helpKey="custom:cf2" help={null}>Old field</FieldLabelWithHelp>)
    expect(screen.getByText('Old field')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /help/i })).toBeNull()
  })

  it('never lists the options of a record / people picker (listOptions={false})', async () => {
    render(
      <FieldHelpScope helpKeys={['k.name']}>
        <FieldLabelWithHelp helpKey="k.name" htmlFor="reports" listOptions={false}>Reports to</FieldLabelWithHelp>
        <select id="reports"><option value="">None</option><option>Head of Finance (STK-1)</option></select>
      </FieldHelpScope>,
    )
    fireEvent.click(await screen.findByRole('button', { name: /help/i }))
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Choose from')
    expect(screen.getByRole('dialog')).not.toHaveTextContent('Head of Finance (STK-1)')
  })

  it('reveals ⓘ while the field has focus', async () => {
    renderLabel()
    const button = await screen.findByRole('button', { name: /help/i })
    fireEvent.focus(document.getElementById('name'))
    expect(button.className).toContain('opacity-100')
  })
})
