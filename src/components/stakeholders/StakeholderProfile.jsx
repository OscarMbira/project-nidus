/**
 * StakeholderProfile – read-only consolidated profile with 8 sections.
 * Sections: Basic Info, Contact, Project Role, Requirements & Expectations,
 * Analysis Summary, Engagement Actions, Communication History, Relationships.
 * Export (Word/Excel/PPT/Print) and Edit button.
 */

import { useState, useEffect } from 'react'
import { User, Mail, Building, Target, FileText, ListTodo, MessageSquare, GitBranch, Edit2, Download, ChevronDown } from 'lucide-react'
import {
  getStakeholderAnalysis,
  getEngagementActions,
  getStakeholderCommunications,
  getStakeholderRelationships,
} from '../../services/stakeholderService'
import EngagementActions from './EngagementActions'
import StakeholderRelationships from './StakeholderRelationships'
import { exportRecordToWord, exportRecordToExcel, exportRecordToPPT, exportRecordToPrint } from '../../utils/exportUtils'
import { getCompletenessPercent } from '../../utils/stakeholderCompleteness'

const ID_SOURCE_LABELS = {
  'project-charter': 'Project charter',
  'procurement-docs': 'Procurement docs',
  'interview': 'Interview',
  'workshop': 'Workshop',
  'previous-project': 'Previous project',
  'referral': 'Referral',
  'other': 'Other',
}

export default function StakeholderProfile({ stakeholder, onEdit }) {
  const [analysis, setAnalysis] = useState([])
  const [communications, setCommunications] = useState([])
  const [exportOpen, setExportOpen] = useState(false)

  const projectId = stakeholder?.project_id || null

  useEffect(() => {
    if (!stakeholder?.id) return
    if (projectId) {
      Promise.all([
        getStakeholderAnalysis({ project_id: projectId, stakeholder_id: stakeholder.id }),
        getStakeholderCommunications({ project_id: projectId }),
      ]).then(([a, c]) => {
        setAnalysis(Array.isArray(a) ? a : [])
        const comms = Array.isArray(c) ? c : []
        setCommunications(comms.slice(0, 5))
      }).catch(() => {})
    } else {
      setAnalysis([])
      setCommunications([])
    }
  }, [stakeholder?.id, projectId])

  const latestAnalysis = analysis[0] || null

  const exportSections = [
    { title: 'Basic Info', fields: [
      { key: 'stakeholder_reference', label: 'Reference' },
      { key: 'stakeholder_name', label: 'Name' },
      { key: 'stakeholder_title', label: 'Title' },
      { key: 'stakeholder_organization', label: 'Organization' },
      { key: 'stakeholder_department', label: 'Department' },
      { key: 'stakeholder_type', label: 'Type' },
      { key: 'stakeholder_category', label: 'Category' },
      { key: 'identification_source', label: 'Identification source' },
      { key: 'identification_date', label: 'Identification date' },
    ]},
    { title: 'Contact', fields: [
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'mobile', label: 'Mobile' },
      { key: 'office_location', label: 'Office location' },
      { key: 'preferred_contact_method', label: 'Preferred contact' },
    ]},
    { title: 'Project Role & Expectations', fields: [
      { key: 'project_role', label: 'Project role' },
      { key: 'special_requirements', label: 'Special requirements' },
      { key: 'expectations', label: 'Expectations' },
      { key: 'notes', label: 'Notes' },
    ]},
  ]

  const handleExport = (type) => {
    setExportOpen(false)
    const rec = { ...stakeholder }
    if (rec.identification_source) rec.identification_source = ID_SOURCE_LABELS[rec.identification_source] || rec.identification_source
    if (rec.identification_date) rec.identification_date = new Date(rec.identification_date).toLocaleDateString()
    const name = (stakeholder?.stakeholder_name || 'Stakeholder').replace(/\s+/g, '_')
    const base = `Stakeholder_${name}`
    if (type === 'word') exportRecordToWord(exportSections, rec, base)
    else if (type === 'excel') exportRecordToExcel(exportSections, rec, base)
    else if (type === 'ppt') exportRecordToPPT(exportSections, rec, base)
    else if (type === 'print') exportRecordToPrint(exportSections, rec, base)
  }

  if (!stakeholder) return null

  const completeness = getCompletenessPercent(stakeholder)
  const sectionClass = 'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4'
  const labelClass = 'text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide'
  const valueClass = 'text-sm text-gray-900 dark:text-white mt-0.5'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{stakeholder.stakeholder_name}</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen(!exportOpen)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4" /> Export <ChevronDown className="h-4 w-4" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-1 py-1 min-w-[160px] rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg z-20">
                  <button type="button" onClick={() => handleExport('word')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Word</button>
                  <button type="button" onClick={() => handleExport('excel')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Excel</button>
                  <button type="button" onClick={() => handleExport('ppt')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">PowerPoint</button>
                  <button type="button" onClick={() => handleExport('print')} className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">Print / PDF</button>
                </div>
              </>
            )}
          </div>
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              <Edit2 className="h-4 w-4" /> Edit
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap">Completeness</span>
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 dark:bg-blue-500 transition-all"
            style={{ width: `${completeness}%` }}
          />
        </div>
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 tabular-nums">{completeness}%</span>
      </div>

      {/* 1. Basic Info */}
      <section className={sectionClass}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><User className="h-5 w-5" /> Basic information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><div className={labelClass}>Reference</div><div className={valueClass}>{stakeholder.stakeholder_reference || '—'}</div></div>
          <div><div className={labelClass}>Name</div><div className={valueClass}>{stakeholder.stakeholder_name || '—'}</div></div>
          <div><div className={labelClass}>Title</div><div className={valueClass}>{stakeholder.stakeholder_title || '—'}</div></div>
          <div><div className={labelClass}>Organization</div><div className={valueClass}>{stakeholder.stakeholder_organization || '—'}</div></div>
          <div><div className={labelClass}>Department</div><div className={valueClass}>{stakeholder.stakeholder_department || '—'}</div></div>
          <div><div className={labelClass}>Type</div><div className={valueClass}>{stakeholder.stakeholder_type || '—'}</div></div>
          <div><div className={labelClass}>Category</div><div className={valueClass}>{stakeholder.stakeholder_category || '—'}</div></div>
          <div><div className={labelClass}>Identification source</div><div className={valueClass}>{ID_SOURCE_LABELS[stakeholder.identification_source] || stakeholder.identification_source || '—'}</div></div>
          <div><div className={labelClass}>Identification date</div><div className={valueClass}>{stakeholder.identification_date ? new Date(stakeholder.identification_date).toLocaleDateString() : '—'}</div></div>
        </div>
      </section>

      {/* 2. Contact */}
      <section className={sectionClass}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Mail className="h-5 w-5" /> Contact</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><div className={labelClass}>Email</div><div className={valueClass}>{stakeholder.email || (Array.isArray(stakeholder.emails) && stakeholder.emails.length ? stakeholder.emails.join(', ') : '—')}</div></div>
          <div><div className={labelClass}>Phone</div><div className={valueClass}>{stakeholder.phone || (Array.isArray(stakeholder.phones) && stakeholder.phones.length ? stakeholder.phones.join(', ') : '—')}</div></div>
          <div><div className={labelClass}>Mobile</div><div className={valueClass}>{stakeholder.mobile || (Array.isArray(stakeholder.mobiles) && stakeholder.mobiles.length ? stakeholder.mobiles.join(', ') : '—')}</div></div>
          <div><div className={labelClass}>Office location</div><div className={valueClass}>{stakeholder.office_location || '—'}</div></div>
          <div><div className={labelClass}>Preferred contact</div><div className={valueClass}>{stakeholder.preferred_contact_method || '—'}</div></div>
        </div>
      </section>

      {/* 3. Project Role & Characteristics */}
      <section className={sectionClass}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><Target className="h-5 w-5" /> Project role & characteristics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><div className={labelClass}>Project role</div><div className={valueClass}>{stakeholder.project_role || '—'}</div></div>
          <div><div className={labelClass}>Organization level</div><div className={valueClass}>{stakeholder.organization_level || '—'}</div></div>
          <div><div className={labelClass}>Decision maker</div><div className={valueClass}>{stakeholder.is_decision_maker ? 'Yes' : 'No'}</div></div>
          <div><div className={labelClass}>Influencer</div><div className={valueClass}>{stakeholder.is_influencer ? 'Yes' : 'No'}</div></div>
          <div><div className={labelClass}>Status</div><div className={valueClass}>{stakeholder.stakeholder_status || '—'}</div></div>
        </div>
      </section>

      {/* 4. Requirements & Expectations */}
      <section className={sectionClass}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><FileText className="h-5 w-5" /> Requirements & expectations</h3>
        <div className="space-y-3">
          <div><div className={labelClass}>Special requirements</div><div className={valueClass}>{stakeholder.special_requirements || '—'}</div></div>
          <div><div className={labelClass}>Expectations</div><div className={valueClass}>{stakeholder.expectations || '—'}</div></div>
          <div><div className={labelClass}>Notes</div><div className={valueClass}>{stakeholder.notes || '—'}</div></div>
        </div>
      </section>

      {/* 5. Analysis Summary */}
      {latestAnalysis && (
        <section className={sectionClass}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Analysis summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><div className={labelClass}>Power level</div><div className={valueClass}>{latestAnalysis.power_level ?? '—'}</div></div>
            <div><div className={labelClass}>Interest level</div><div className={valueClass}>{latestAnalysis.interest_level ?? '—'}</div></div>
            <div><div className={labelClass}>Matrix quadrant</div><div className={valueClass}>{latestAnalysis.matrix_quadrant || '—'}</div></div>
            <div><div className={labelClass}>Current attitude</div><div className={valueClass}>{latestAnalysis.current_attitude || '—'}</div></div>
            <div><div className={labelClass}>Desired attitude</div><div className={valueClass}>{latestAnalysis.desired_attitude || '—'}</div></div>
          </div>
        </section>
      )}

      {/* 6. Engagement Actions */}
      {projectId && (
        <section className={sectionClass}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><ListTodo className="h-5 w-5" /> Engagement actions</h3>
          <EngagementActions projectId={projectId} stakeholderId={stakeholder.id} />
        </section>
      )}

      {/* 7. Communication History (last 5) */}
      {projectId && (
        <section className={sectionClass}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Communication history (last 5)</h3>
          {communications.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No communications recorded.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {communications.map((c) => (
                <li key={c.id} className="py-2">
                  <div className="font-medium text-gray-900 dark:text-white text-sm">{c.communication_subject || '—'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{c.communication_type} · {c.actual_date ? new Date(c.actual_date).toLocaleDateString() : ''} · {c.communication_status}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 8. Relationships */}
      {projectId && (
        <section className={sectionClass}>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2"><GitBranch className="h-5 w-5" /> Relationships</h3>
          <StakeholderRelationships projectId={projectId} stakeholderId={stakeholder.id} />
        </section>
      )}

      {!projectId && (
        <section className={sectionClass}>
          <p className="text-sm text-gray-500 dark:text-gray-400">This stakeholder is not assigned to a project. Assign a project to see engagement actions, communication history, and relationships.</p>
        </section>
      )}
    </div>
  )
}
