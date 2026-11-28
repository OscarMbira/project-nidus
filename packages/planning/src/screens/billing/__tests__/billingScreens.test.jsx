import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PlanningProvider } from '../../../context/PlanningContext.jsx'
import { ThemeProvider } from '@nidus/shared/context/ThemeContext'

const { api } = vi.hoisted(() => ({
  api: {
    listInvoices: vi.fn(),
    loadInvoice: vi.fn(),
    loadDocumentSettings: vi.fn(async () => ({ payment_instructions: 'Pay to Example Bank', footer: 'Thank you' })),
    issueInvoice: vi.fn(async () => {}),
    recordPayment: vi.fn(async () => {}),
    submitInvoice: vi.fn(async () => {}),
    addManualLine: vi.fn(async () => {}),
    updateLine: vi.fn(async () => {}),
    removeLine: vi.fn(async () => {}),
    accountingBundle: vi.fn(async () => []),
    sendDueReminders: vi.fn(async () => 0),
    canIssue: vi.fn(async () => true),
    draftInvoice: vi.fn(async () => ({ invoice_reference: 'INV-9' })),
    figuresFor: vi.fn(async () => [{ revenue: 10, wip: 1, unbilledHours: 2, cost: 3, margin: 7 }]),
  },
}))

vi.mock('../../../services/billingData.js', () => ({
  createBillingData: () => api,
  accountingCsv: () => '',
  CLIENT_TEMPLATE: '',
  ACCOUNTING_DICTIONARY: [],
}))
vi.mock('@nidus/supabase', () => ({
  platformDb: { from() { return this }, select() { return this }, eq() { return this }, then(resolve) { resolve({ data: [] }) } },
  simDb: { from() { return this }, select() { return this }, eq() { return this }, then(resolve) { resolve({ data: [] }) } },
}))
vi.mock('@nidus/shared/hooks/useBranding', () => ({ useBranding: () => ({ branding: { app_display_name: 'Example Freight Ltd', primary_logo_url: null } }) }))
vi.mock('@nidus/shared/hooks/useSuccessModal', () => ({ useSuccessModal: () => ({ showSuccess: vi.fn(), modal: null }) }))

import { InvoicesScreen, InvoiceDetailScreen, RevenueScreen } from '../BillingScreens.jsx'

const issued = {
  id: 'i1', invoice_reference: 'INV-1', status: 'issued', client_id: 'c1',
  gross_amount: 100, amount_paid: 0, due_date: '2020-01-01', currency: 'USD', net_amount: 80, tax_amount: 20,
  clients: { name: 'Example Freight Ltd', kind: 'external' },
}
const draft = { ...issued, id: 'i2', invoice_reference: 'INV-2', status: 'draft', due_date: '2099-01-01', client_invoice_lines: [] }
const pending = { ...issued, id: 'i3', invoice_reference: 'INV-3', status: 'pending_approval', client_invoice_lines: [] }

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
      <PlanningProvider mode="platform" basePath="/platform/billing">
        <Routes>
          <Route path="/invoices" element={element} />
          <Route path="/invoices/:invoiceKey" element={element} />
        </Routes>
      </PlanningProvider>
      </ThemeProvider>
    </MemoryRouter>
  )
}

describe('billing screens', () => {
  beforeEach(() => vi.clearAllMocks())

  it('opens the overdue list from the dashboard card', async () => {
    api.listInvoices.mockResolvedValue([issued, { ...issued, id: 'i4', invoice_reference: 'INV-4', status: 'issued', due_date: '2099-01-01', amount_paid: 100 }])
    renderAt('/invoices', <InvoicesScreen />)
    expect(await screen.findByText('INV-1')).toBeTruthy()
    expect(screen.getByText('INV-4')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /Overdue/ }))
    expect(screen.getByText('INV-1')).toBeTruthy()
    expect(screen.queryByText('INV-4')).toBeNull()
  })

  it('shows the export menu and a draft line form', async () => {
    api.listInvoices.mockResolvedValue([draft])
    api.loadInvoice.mockResolvedValue({ ...draft, client_invoice_lines: [{ id: 'l1', description: 'Time', quantity: 1, rate: 10, amount: 10, tax_amount: 0, voided: false }] })
    renderAt('/invoices/INV-2', <InvoiceDetailScreen />)
    expect(await screen.findByRole('button', { name: 'Export' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add line' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Submit for approval' })).toBeTruthy()
  })

  it('requires a justification before the invoice can be issued', async () => {
    api.listInvoices.mockResolvedValue([pending])
    api.loadInvoice.mockResolvedValue(pending)
    renderAt('/invoices/INV-3', <InvoiceDetailScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve and issue' }))
    const approve = await screen.findByRole('button', { name: 'Approve' })
    expect(approve).toBeDisabled()
    fireEvent.change(screen.getByLabelText(/Justification/), { target: { value: 'Checked against the approved time.' } })
    expect(approve).not.toBeDisabled()
    fireEvent.click(approve)
    await waitFor(() => expect(api.issueInvoice).toHaveBeenCalledWith('i3', 'Checked against the approved time.'))
  })

  it('records a payment against an issued invoice', async () => {
    const open = { ...issued, due_date: '2099-01-01', client_invoice_lines: [] }
    api.listInvoices.mockResolvedValue([open])
    api.loadInvoice
      .mockResolvedValueOnce(open)
      .mockResolvedValueOnce({ ...open, status: 'part_paid', amount_paid: 40 })
    renderAt('/invoices/INV-1', <InvoiceDetailScreen />)
    const amount = await screen.findByLabelText('Amount received')
    fireEvent.change(amount, { target: { value: '40' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }))
    await waitFor(() => expect(api.recordPayment).toHaveBeenCalled())
    await waitFor(() => expect(screen.getByText(/Status: part_paid/)).toBeTruthy())
  })

  it('shows paid when the balance is cleared', async () => {
    const open = { ...issued, due_date: '2099-01-01', client_invoice_lines: [] }
    api.listInvoices.mockResolvedValue([open])
    api.loadInvoice
      .mockResolvedValueOnce(open)
      .mockResolvedValueOnce({ ...open, status: 'paid', amount_paid: 100 })
    renderAt('/invoices/INV-1', <InvoiceDetailScreen />)
    fireEvent.change(await screen.findByLabelText('Amount received'), { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record payment' }))
    await waitFor(() => expect(screen.getByText(/Status: paid/)).toBeTruthy())
  })

  it('locks the invoice once it is issued', async () => {
    api.listInvoices.mockResolvedValue([pending])
    api.loadInvoice
      .mockResolvedValueOnce(pending)
      .mockResolvedValueOnce({ ...pending, due_date: '2099-01-01', status: 'issued', client_invoice_lines: [] })
    renderAt('/invoices/INV-3', <InvoiceDetailScreen />)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve and issue' }))
    fireEvent.change(screen.getByLabelText(/Justification/), { target: { value: 'Checked against the approved time.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    await waitFor(() => expect(screen.getByText(/Status: issued/)).toBeTruthy())
    expect(screen.queryByRole('button', { name: 'Approve and issue' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add line' })).toBeNull()
  })

  it('drafts an invoice from the project period', async () => {
    api.listInvoices.mockResolvedValue([])
    renderAt('/invoices', <InvoicesScreen projectId="p1" />)
    fireEvent.click(await screen.findByRole('button', { name: 'Draft from approved work' }))
    await waitFor(() => expect(api.draftInvoice).toHaveBeenCalledWith('p1', expect.any(String), expect.any(String)))
  })

  it('opens this project\'s billed invoices from billed revenue, with money in the regional format', async () => {
    function InvoiceList() {
      const loc = useLocation()
      return <p>Invoice list {loc.search}</p>
    }
    render(
      <MemoryRouter initialEntries={['/revenue']}>
        <ThemeProvider>
          <PlanningProvider mode="platform" basePath="/platform/billing">
            <Routes>
              <Route path="/revenue" element={<RevenueScreen projectId="p1" />} />
              <Route path="/platform/billing/invoices" element={<InvoiceList />} />
            </Routes>
          </PlanningProvider>
        </ThemeProvider>
      </MemoryRouter>
    )
    const card = await screen.findByRole('button', { name: /Billed revenue/ })
    expect(card.textContent).toMatch(/10\.00/)
    fireEvent.click(card)
    expect(await screen.findByText('Invoice list ?status=billed&projectId=p1')).toBeTruthy()
  })

  it('starts the invoice list on the filter in the address and offers Show all', async () => {
    api.listInvoices.mockResolvedValue([
      { id: 'i1', invoice_reference: 'INV-001', status: 'issued', client_id: 'c1', clients: { name: 'Example Freight Ltd' }, due_date: '2099-01-01', gross_amount: 120 },
      { id: 'i2', invoice_reference: 'INV-002', status: 'draft', client_id: 'c1', clients: { name: 'Example Freight Ltd' }, gross_amount: 50 },
    ])
    renderAt('/invoices?status=billed&projectId=p1', <InvoicesScreen />)
    expect(await screen.findByText(/Showing billed \(issued, part paid and paid\) invoices/)).toBeTruthy()
    await waitFor(() => expect(api.listInvoices).toHaveBeenCalledWith('p1'))
    fireEvent.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.queryByText(/Showing billed/)).toBeNull()
  })
})
