import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Link, useNavigate } from 'react-router-dom'
import { RowActionButton } from '@nidus/ui'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import ExpenseItemsTable from '@nidus/ui/ExpenseItemsTable'
import ViewToggle from '../../components/ui/ViewToggle'
import { useViewMode } from '../../hooks/useViewMode'
import { useSortableTable } from '../../hooks/useSortableTable'
import { TableRowNumberHeader, TableRowNumberCell } from '@nidus/ui/Table'
import { getDisplayRowNumber } from '@nidus/shared/utils/tableRowNumberUtils'
import { simDb } from '@nidus/supabase'
import {
  getMySimExpenses,
  saveSimDraft,
  submitSimExpense,
  deleteSimDraft,
  getSimExpenseClaimItems,
} from '../../services/simExpenseClaimService'
import { getSimExpenseCategories } from '../../services/simExpenseCategoryService'

const EMPTY_FORM = {
  id: null,
  practice_project_id: '',
  amount: '',
  description: '',
  notes: '',
  expense_date: new Date().toISOString().slice(0, 10),
  itemize: false,
  items: [],
}

const EXPENSE_TABS = [
  { value: 'claims', label: 'My claims' },
  { value: 'create', label: 'New claim' },
]

const STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  pending_l1: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  pending_l2: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  pending_l3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  fully_approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  processed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
}

export default function SimMyExpenses() {
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [projects, setProjects] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])
  const [activeTab, setActiveTab] = useState('claims')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [viewMode, setViewMode] = useViewMode('sim-my-expenses', 'list')
  const { handleSort, getSortDirectionForColumn, sortedData } = useSortableTable({
    defaultSort: { column: 'project', direction: 'asc' },
    storageKey: 'sim-my-expenses-sort',
  })

  const load = async () => {
    try {
      setRows(await getMySimExpenses())
    } catch (e) {
      toast.error(e?.message || 'Failed to load')
    }
  }

  const loadProjects = async () => {
    const { data: { user } } = await simDb.auth.getUser()
    if (!user) return
    const { data } = await simDb
      .from('practice_projects')
      .select('id, project_code, project_name')
      .eq('user_id', user.id)
      .order('project_name', { ascending: true })
    const list = data || []
    setProjects(list)
    if (list.length > 0) {
      setForm((f) => (f.practice_project_id ? f : { ...f, practice_project_id: list[0].id }))
    }
  }

  useEffect(() => {
    load()
    loadProjects()
    getSimExpenseCategories().then((result) => {
      if (result.success) setCategories(result.data || [])
    })
  }, [])

  const isEditing = Boolean(form.id)
  const itemsTotal = form.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)

  const resetForm = () => setForm({ ...EMPTY_FORM, practice_project_id: projects[0]?.id || '' })

  const save = async () => {
    if (form.itemize && form.items.length === 0) {
      toast.error('Add at least one item, or turn off Itemize this expense.')
      return
    }
    try {
      await saveSimDraft({ ...form, amount: Number(form.amount), items: form.itemize ? form.items : [] })
      toast.success(isEditing ? 'Draft updated' : 'Draft saved')
      resetForm()
      load()
    } catch (e) {
      toast.error(e?.message)
    }
  }

  const submit = async (id) => {
    try {
      await submitSimExpense(id)
      toast.success('Submitted')
      load()
    } catch (e) {
      toast.error(e?.message)
    }
  }

  const handleEdit = async (row) => {
    setActiveTab('create')
    setForm({
      id: row.id,
      practice_project_id: row.practice_project_id,
      amount: String(row.amount ?? ''),
      description: row.description || '',
      notes: row.notes || '',
      expense_date: row.expense_date || new Date().toISOString().slice(0, 10),
      itemize: false,
      items: [],
    })
    try {
      const items = await getSimExpenseClaimItems(row.id)
      if (items.length > 0) {
        setForm((f) => ({
          ...f,
          itemize: true,
          items: items.map((it) => ({ description: it.description, amount: Number(it.amount), category_id: it.category_id, notes: it.notes })),
        }))
      }
    } catch {
      // Items are optional — a load failure just leaves the claim in simple (non-itemized) mode.
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete the draft claim for ${row.practice_projects?.project_code || 'this project'}?`)) return
    try {
      await deleteSimDraft(row.id)
      toast.success('Draft deleted')
      load()
    } catch (e) {
      toast.error(e?.message || 'Failed to delete')
    }
  }

  const query = search.trim().toLowerCase()
  const filteredRows = rows
    .filter((r) =>
      query
        ? [
            r.practice_projects?.project_code,
            r.practice_projects?.project_name,
            r.description,
            r.claim_status,
            r.expense_date,
            r.amount != null ? String(r.amount) : '',
          ].some((v) => (v || '').toString().toLowerCase().includes(query))
        : true,
    )
    .filter((r) => (dateFrom ? (r.expense_date || '') >= dateFrom : true))
    .filter((r) => (dateTo ? (r.expense_date || '') <= dateTo : true))
    .filter((r) => (amountMin !== '' ? Number(r.amount || 0) >= Number(amountMin) : true))
    .filter((r) => (amountMax !== '' ? Number(r.amount || 0) <= Number(amountMax) : true))
    .filter((r) => (statusFilter ? r.claim_status === statusFilter : true))

  const visibleRows = sortedData(filteredRows, {
    project: (r) => r.practice_projects?.project_code || '',
    date: (r) => r.expense_date || '',
    amount: (r) => Number(r.amount) || 0,
    status: (r) => r.claim_status || '',
  })

  const renderSortHeader = (column, label, align = 'left') => {
    const dir = getSortDirectionForColumn(column)
    return (
      <th
        scope="col"
        aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
        className={`px-3 py-3 text-${align} text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider`}
      >
        <button
          type="button"
          onClick={() => handleSort(column)}
          className={`flex items-center gap-1 uppercase hover:text-gray-700 dark:hover:text-gray-200 ${align === 'right' ? 'ml-auto' : ''}`}
        >
          {label}
          <span aria-hidden="true">{dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '⇅'}</span>
        </button>
      </th>
    )
  }

  const actionsFor = (r) => {
    const name = r.description || r.practice_projects?.project_code || 'claim'
    return (
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <RowActionButton variant="view" label={`View ${name}`} onClick={() => navigate(`/simulator/expenses/my/${r.id}`)} />
        {r.claim_status === 'draft' && (
          <>
            <RowActionButton variant="edit" label={`Edit ${name}`} onClick={() => handleEdit(r)} />
            <RowActionButton variant="delete" label={`Delete ${name}`} onClick={() => handleDelete(r)} />
            <button type="button" onClick={() => submit(r.id)} className="text-sm text-blue-400 hover:underline">Submit</button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-bold">My expenses</h1>
        <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} tabs={EXPENSE_TABS} />

        {activeTab === 'create' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
          <h2 className="font-semibold">{isEditing ? 'Edit draft' : 'New claim'}</h2>
          <label htmlFor="sim-expense-project" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Project</label>
          <select id="sim-expense-project" value={form.practice_project_id} onChange={(e) => setForm({ ...form, practice_project_id: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.project_code} — {p.project_name}</option>
            ))}
          </select>
          <label htmlFor="sim-expense-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Expense date</label>
          <input id="sim-expense-date" type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" />
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sim-expense-itemize"
              checked={form.itemize}
              onChange={(e) => setForm({ ...form, itemize: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="sim-expense-itemize" className="text-sm font-medium text-gray-700 dark:text-gray-300">Itemize this expense</label>
          </div>
          {form.itemize ? (
            <div className="space-y-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Computed from items: <span className="font-semibold text-gray-900 dark:text-gray-100">{itemsTotal.toLocaleString()}</span>
              </p>
              <ExpenseItemsTable items={form.items} onChange={(items) => setForm({ ...form, items })} categories={categories} />
            </div>
          ) : (
            <>
              <label htmlFor="sim-expense-amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
              <input id="sim-expense-amount" placeholder="e.g. 1500" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" />
            </>
          )}
          <label htmlFor="sim-expense-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
          <textarea id="sim-expense-description" placeholder="What was this for?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" rows={3} />
          <label htmlFor="sim-expense-notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
          <textarea id="sim-expense-notes" placeholder="Any additional context" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full rounded border border-gray-600 bg-gray-950 px-3 py-2 text-sm" rows={3} />
          <div className="flex gap-2">
            <button type="button" onClick={save} className="px-4 py-2 rounded-lg border border-gray-600 text-sm">{isEditing ? 'Save changes' : 'Save draft'}</button>
            {isEditing && (
              <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
            )}
          </div>
        </div>
        )}

        {activeTab === 'claims' && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">My claims</h2>
            <button type="button" onClick={() => setActiveTab('create')} className="text-sm text-blue-400 hover:underline">+ New claim</button>
            <ViewToggle value={viewMode} onChange={setViewMode} ariaLabel="My expenses layout" />
          </div>
          <input
            type="search"
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div>
              <label htmlFor="sim-expenses-date-from" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">From date</label>
              <input id="sim-expenses-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="sim-expenses-date-to" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">To date</label>
              <input id="sim-expenses-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="sim-expenses-amount-min" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Min amount</label>
              <input id="sim-expenses-amount-min" type="number" placeholder="0" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="sim-expenses-amount-max" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Max amount</label>
              <input id="sim-expenses-amount-max" type="number" placeholder="Any" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm" />
            </div>
            <div>
              <label htmlFor="sim-expenses-status-filter" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Status</label>
              <select id="sim-expenses-status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-950 px-2 py-1.5 text-sm">
                <option value="">All</option>
                {Object.keys(STATUS_STYLES).map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <p className="p-6 text-center text-gray-500 dark:text-gray-400">
              {rows.length === 0 ? 'No expense claims yet.' : 'No claims match your search.'}
            </p>
          ) : viewMode === 'list' ? (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 dark:bg-gray-800">
                  <tr>
                    <TableRowNumberHeader className="!normal-case" />
                    {renderSortHeader('project', 'Project')}
                    {renderSortHeader('date', 'Date')}
                    {renderSortHeader('amount', 'Amount', 'right')}
                    {renderSortHeader('status', 'Status')}
                    <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {visibleRows.map((r, index) => (
                    <tr key={r.id}>
                      <TableRowNumberCell number={getDisplayRowNumber(index)} />
                      <td className="px-3 py-3">
                        <div className="font-medium">{r.practice_projects?.project_code}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{r.practice_projects?.project_name}</div>
                        {r.description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{r.description}</div>}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">{r.expense_date}</td>
                      <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap">{Number(r.amount || 0).toLocaleString()} {r.currency}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.claim_status] || STATUS_STYLES.draft}`}>
                          {(r.claim_status || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-3">{actionsFor(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleRows.map((r, index) => (
                <div key={r.id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">#{getDisplayRowNumber(index)}</span>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[r.claim_status] || STATUS_STYLES.draft}`}>
                      {(r.claim_status || '').replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="font-medium">{r.practice_projects?.project_code}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{r.practice_projects?.project_name}</div>
                  {r.description && <div className="text-sm">{r.description}</div>}
                  <div className="flex items-center justify-between">
                    <span className="tabular-nums text-sm">{Number(r.amount || 0).toLocaleString()} {r.currency}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{r.expense_date}</span>
                  </div>
                  {actionsFor(r)}
                </div>
              ))}
            </div>
          )}
        </div>
        )}
        <Link to="/simulator/expenses/approvals" className="text-blue-400 text-sm hover:underline">Go to approvals</Link>
      </div>
    </div>
  )
}
