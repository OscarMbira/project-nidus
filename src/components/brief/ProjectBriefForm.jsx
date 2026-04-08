/**
 * Project Brief Form Component
 * Main form container with tabs for all brief sections
 */

import { useState } from 'react'
import { HoldButton } from '../ui/HoldButton'
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
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex overflow-x-auto px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  py-4 px-4 border-b-2 font-medium text-sm whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
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
