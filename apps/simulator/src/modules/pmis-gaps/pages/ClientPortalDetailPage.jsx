/**
 * Client Portal (GAP-07) — detail/view page. v963 Phase 10 (Simulator port).
 * Simulator mirror of apps/platform/src/modules/pmis-gaps/pages/ClientPortalDetailPage.jsx.
 * Details tab shows portal config plus inline section visibility management. Guests are a
 * separate routed sub-view (rule 65 — :id/guests). Audit tab per rule 63.1. Always sim schema.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Pencil, Users, Eye, EyeOff } from 'lucide-react'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { getPortal, listSections, createSection, updateSection } from '../../../services/clientPortalService'

const DEFAULT_SECTIONS = [
  { section_key: 'overview', section_label: 'Overview' },
  { section_key: 'milestones', section_label: 'Milestones' },
  { section_key: 'risks_issues', section_label: 'Risks & Issues' },
  { section_key: 'documents', section_label: 'Documents' },
]

export default function ClientPortalDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [portal, setPortal] = useState(null)
  const [sections, setSections] = useState([])
  const [activeTab, setActiveTab] = useState('details')

  const load = useCallback(async () => {
    setLoading(true)
    const [p, s] = await Promise.all([getPortal(id), listSections(id)])
    setPortal(p)
    setSections(s)
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  const handleSeedDefaults = async () => {
    for (let i = 0; i < DEFAULT_SECTIONS.length; i += 1) {
      const d = DEFAULT_SECTIONS[i]
      // eslint-disable-next-line no-await-in-loop
      await createSection(id, { ...d, sort_order: i })
    }
    await load()
  }

  const handleToggleVisible = async (section) => {
    await updateSection(section.id, { is_visible: !section.is_visible })
    await load()
  }

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>
  if (!portal) return <div className="p-8 text-gray-500 dark:text-gray-400">Client portal not found.</div>

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
      <button type="button" onClick={() => navigate('..')} className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
        <ArrowLeft className="h-4 w-4" />
        Back to Client Portal
      </button>

      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{portal.portal_name}</h1>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate('guests')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
            <Users className="h-4 w-4" />
            Guests
          </button>
          <button type="button" onClick={() => navigate('edit')} className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-sm font-medium">
            <Pencil className="h-4 w-4" />
            Edit
          </button>
        </div>
      </div>

      <DetailAuditTabList activeTab={activeTab} onChange={setActiveTab} ariaLabel="Client portal sections" />

      {activeTab === 'details' ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <p className="text-xs uppercase text-gray-400 mb-1">Status</p>
            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${portal.is_active ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
              {portal.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-5">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Visible sections</h2>
            {sections.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400 space-y-3">
                <p>No sections configured yet.</p>
                <button type="button" onClick={handleSeedDefaults} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium">
                  Add default sections
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {sections.map((section) => (
                  <div key={section.id} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-gray-900 dark:text-gray-100">{section.section_label}</span>
                    <button type="button" onClick={() => handleToggleVisible(section)} className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                      {section.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {section.is_visible ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <AuditDetailsPanel description="Who created or changed this client portal.">
          <AuditCard title="Identity">
            <AuditField label="Portal name" value={portal.portal_name} />
            <AuditField label="Slug" value={portal.portal_slug} />
          </AuditCard>
          <AuditCard title="Classification">
            <AuditField label="Status" value={portal.is_active ? 'Active' : 'Inactive'} />
          </AuditCard>
          <AuditCard title="Record history">
            <AuditTimestampPair dateLabel="Created at" value={portal.created_at} />
            <AuditTimestampPair dateLabel="Updated at" value={portal.updated_at} />
          </AuditCard>
        </AuditDetailsPanel>
      )}
    </div>
  )
}
