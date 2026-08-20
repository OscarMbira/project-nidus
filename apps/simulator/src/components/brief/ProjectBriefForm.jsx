/**
 * Project Brief Form Component
 * Main form container with tabs for all brief sections
 */

import { useState, useEffect } from 'react'
import { HoldButton } from '../ui/HoldButton'
import { platformDb } from '@nidus/supabase'
import DetailAuditTabList from '@nidus/ui/DetailAuditTabList'
import AuditDetailsPanel from '@nidus/ui/AuditDetailsPanel'
import AuditCard from '@nidus/ui/AuditCard'
import AuditField from '@nidus/ui/AuditField'
import AuditTimestampPair from '@nidus/ui/AuditTimestampPair'
import { humanizeAuditToken, resolveAuditUserLabels } from '@nidus/shared/utils/auditDisplayUtils'
import BriefMetadataSection from './BriefMetadataSection'
import ProjectDefinitionSection from './ProjectDefinitionSection'
import ScopeSection from './ScopeSection'
import TolerancesSection from './TolerancesSection'
import StakeholdersSection from './StakeholdersSection'
import InterfacesSection from './InterfacesSection'
import OutlineBusinessCaseSection from './OutlineBusinessCaseSection'
import ProductDescriptionSection from './ProductDescriptionSection'
import ProductQualitySection from './ProductQualitySection'
import ProjectApproachSection from './ProjectApproachSection'
import TeamStructureSection from './TeamStructureSection'
import RoleDescriptionsSection from './RoleDescriptionsSection'
import LessonsReviewSection from './LessonsReviewSection'
import ReferencesSection from './ReferencesSection'
import BriefCompletionProgress from './BriefCompletionProgress'

export default function ProjectBriefForm({
  formData,
  onChange,
  errors = {},
  readOnly = false,
  onSave,
  onSaveDraft,
  onSubmit,
  onHoldComplete,
  saving = false,
  showHoldButton = true
}) {
  const [activeTab, setActiveTab] = useState('metadata')
  const [auditUserLabels, setAuditUserLabels] = useState({})

  useEffect(() => {
    if (activeTab !== 'audit' || !formData?.id) return
    let cancelled = false
    ;(async () => {
      const labels = await resolveAuditUserLabels(platformDb, [
        formData.created_by,
        formData.updated_by,
      ])
      if (!cancelled) setAuditUserLabels(labels || {})
    })()
    return () => { cancelled = true }
  }, [activeTab, formData?.id, formData?.created_by, formData?.updated_by])

  const tabs = [
    { id: 'metadata', label: 'Metadata', icon: '📄' },
    { id: 'definition', label: 'Project Definition', icon: '🎯' },
    { id: 'scope', label: 'Scope', icon: '📋' },
    { id: 'tolerances', label: 'Tolerances', icon: '⚖️' },
    { id: 'stakeholders', label: 'Stakeholders', icon: '👥' },
    { id: 'interfaces', label: 'Interfaces', icon: '🔗' },
    { id: 'business-case', label: 'Business Case', icon: '💼' },
    { id: 'products', label: 'Products', icon: '📦' },
    { id: 'quality', label: 'Quality', icon: '✨' },
    { id: 'approach', label: 'Approach', icon: '🚀' },
    { id: 'team', label: 'Team Structure', icon: '👔' },
    { id: 'roles', label: 'Roles', icon: '🎭' },
    { id: 'lessons', label: 'Lessons', icon: '📚' },
    { id: 'references', label: 'References', icon: '📖' }
  ]

  const renderTabContent = () => {
    switch (activeTab) {
      case 'metadata':
        return <BriefMetadataSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'definition':
        return <ProjectDefinitionSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'scope':
        return <ScopeSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'tolerances':
        return <TolerancesSection briefId={formData.id} readOnly={readOnly} />
      case 'stakeholders':
        return <StakeholdersSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'interfaces':
        return <InterfacesSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'business-case':
        return <OutlineBusinessCaseSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'products':
        return <ProductDescriptionSection briefId={formData.id} readOnly={readOnly} />
      case 'quality':
        return <ProductQualitySection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'approach':
        return <ProjectApproachSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'team':
        return <TeamStructureSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'roles':
        return <RoleDescriptionsSection briefId={formData.id} readOnly={readOnly} />
      case 'lessons':
        return <LessonsReviewSection formData={formData} onChange={onChange} errors={errors} readOnly={readOnly} />
      case 'references':
        return <ReferencesSection briefId={formData.id} readOnly={readOnly} />
      case 'audit':
        return !formData?.id ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Audit details appear after this brief is saved.</p>
        ) : (
          <AuditDetailsPanel description="Who created or changed this project brief, and how it is classified.">
            <AuditCard title="Identity" description="How this brief is labelled and tracked.">
              <AuditField label="Title" value={formData.brief_title || formData.project_title} />
              <AuditField label="Status" value={humanizeAuditToken(formData.status)} />
            </AuditCard>
            <AuditCard title="Classification" description="Where this brief sits.">
              <AuditField label="Project definition" value={formData.project_definition} />
            </AuditCard>
            <AuditCard title="Record history" description="When this brief was created and last changed.">
              <AuditField label="Created by" value={formData.created_by ? auditUserLabels[formData.created_by] || null : null} />
              <AuditTimestampPair dateLabel="Created at" value={formData.created_at} />
              <AuditField label="Updated by" value={formData.updated_by ? auditUserLabels[formData.updated_by] || null : null} />
              <AuditTimestampPair dateLabel="Last updated" value={formData.updated_at} />
            </AuditCard>
          </AuditDetailsPanel>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Completion Progress */}
      {!readOnly && formData.id && (
        <BriefCompletionProgress briefId={formData.id} />
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700 px-2">
          <DetailAuditTabList
            activeTab={activeTab}
            onChange={setActiveTab}
            ariaLabel="Project brief sections"
            tabs={[
              ...tabs.map((tab) => ({ value: tab.id, label: `${tab.icon} ${tab.label}` })),
              { value: 'audit', label: 'Audit details' },
            ]}
          />
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Action Buttons */}
      {!readOnly && (
        <div className="flex justify-end gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          {showHoldButton && (
            <HoldButton
              entityType="project_brief"
              entityId={formData.id}
              formData={formData}
              onHoldComplete={onHoldComplete}
            />
          )}
          {onSaveDraft && (
            <button
              type="button"
              onClick={onSaveDraft}
              disabled={saving}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          )}
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          )}
          {onSubmit && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            >
              {saving ? 'Submitting...' : 'Submit for Approval'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
