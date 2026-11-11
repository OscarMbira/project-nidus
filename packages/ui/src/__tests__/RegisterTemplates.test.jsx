import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RegisterTemplatePicker from '../RegisterTemplatePicker'
import RegisterTemplatesTab from '../RegisterTemplatesTab'
import PlaceholderBanner from '../PlaceholderBanner'
import SaveAsTemplateDialog from '../SaveAsTemplateDialog'

const SYSTEM = { id: 's1', name: 'CBS Data Migration Strategy', template_scope: 'system', version: 1, child_count: 31, record_title: 'Data Migration Strategy – [Bank Name]', description: 'Core banking', created_at: '2026-10-01' }
const ORG = { id: 'o1', name: 'Our DMSD', template_scope: 'organisation', version: 2, child_count: 5, record_title: 'Our strategy', created_at: '2026-10-02' }

describe('RegisterTemplatePicker', () => {
  it('offers Blank or a template, then asks for the title before creating', () => {
    const onUse = vi.fn()
    const onBlank = vi.fn()
    render(<RegisterTemplatePicker isOpen onClose={() => {}} registerLabel="Data Migration Strategy" templates={[SYSTEM]} onBlank={onBlank} onUse={onUse} />)
    fireEvent.click(screen.getByText('Blank'))
    expect(onBlank).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Use template' }))
    expect(screen.getByLabelText('Title')).toHaveValue('Data Migration Strategy – [Bank Name]')
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'DMSD – Acme' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create from template' }))
    expect(onUse).toHaveBeenCalledWith(SYSTEM, 'DMSD – Acme')
  })
})

describe('RegisterTemplatePicker inline (routed "New …" page, v1361)', () => {
  it('renders as page content, without a dialog', () => {
    const onUse = vi.fn()
    render(<RegisterTemplatePicker inline registerLabel="Testing Strategy" templates={[SYSTEM]} onBlank={() => {}} onUse={onUse} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('Blank')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Use template' }))
    expect(screen.getByRole('heading', { name: /From “CBS Data Migration Strategy”/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create from template' }))
    expect(onUse).toHaveBeenCalledWith(SYSTEM, 'Data Migration Strategy – [Bank Name]')
  })
})

describe('RegisterTemplatesTab', () => {
  it('lists templates A→Z with row numbers; managers get Customise / Edit / Archive on organisation templates only', () => {
    const onEdit = vi.fn()
    const onArchive = vi.fn()
    render(
      <RegisterTemplatesTab registerKey="t-tab" templates={[ORG, SYSTEM]} canManage onPreview={vi.fn()} onUse={vi.fn()} onCustomise={vi.fn()} onEdit={onEdit} onArchive={onArchive} />
    )
    const names = screen.getAllByRole('row').slice(1).map((r) => r.textContent)
    expect(names[0]).toContain('CBS Data Migration Strategy')
    expect(names[1]).toContain('Our DMSD')
    expect(screen.queryByRole('button', { name: 'Edit CBS Data Migration Strategy' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit Our DMSD' }))
    expect(onEdit).toHaveBeenCalledWith(ORG)
    fireEvent.click(screen.getByRole('button', { name: /Archive/ }))
    expect(onArchive).toHaveBeenCalledWith(ORG, true)
    expect(screen.getAllByRole('button', { name: /Customise/ })).toHaveLength(2)
  })

  it('shows no management actions to other users', () => {
    render(<RegisterTemplatesTab registerKey="t-tab2" templates={[ORG]} onPreview={vi.fn()} onUse={vi.fn()} onCustomise={vi.fn()} onEdit={vi.fn()} onArchive={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /Customise/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Archive/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Use/ })).toBeInTheDocument()
  })
})

describe('PlaceholderBanner', () => {
  it('shows the count per tab and lists placeholders on demand; hidden when none remain', () => {
    const { rerender, container } = render(
      <PlaceholderBanner summary={{ total: 2, placeholders: ['[Bank Name]', '[Go-Live Date]'], tabs: [{ tab: 'Details', count: 2 }] }} />
    )
    expect(screen.getByRole('status')).toHaveTextContent('2 template placeholders still to fill — Details (2)')
    fireEvent.click(screen.getByRole('button', { name: /Show placeholders/ }))
    expect(screen.getByText('[Go-Live Date]')).toBeInTheDocument()
    rerender(<PlaceholderBanner summary={{ total: 0, placeholders: [], tabs: [] }} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('SaveAsTemplateDialog', () => {
  it('saves a new template, or replaces an existing one', () => {
    const onSave = vi.fn()
    render(<SaveAsTemplateDialog isOpen onClose={() => {}} defaultName="DMSD – Acme" organisationTemplates={[ORG]} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save template' }))
    expect(onSave).toHaveBeenLastCalledWith({ name: 'DMSD – Acme', description: '', templateId: null })
    fireEvent.change(screen.getByLabelText('Save as'), { target: { value: 'o1' } })
    expect(screen.getByLabelText('Template name')).toHaveValue('Our DMSD')
    fireEvent.click(screen.getByRole('button', { name: 'Replace template' }))
    expect(onSave).toHaveBeenLastCalledWith({ name: 'Our DMSD', description: '', templateId: 'o1' })
  })
})
