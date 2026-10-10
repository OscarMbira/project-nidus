import { useEffect, useState } from 'react'
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal'
import { useUnsavedChangesGuard } from '@nidus/shared/context/UnsavedChangesContext'
import { TEST_EVIDENCE_REQUIREMENT } from '@nidus/shared/utils/testEvidenceRequirement'
import {
  getOrganisationTestEvidenceDefault,
  setOrganisationTestEvidenceDefault,
  getProjectTestEvidenceRequirement,
  setProjectTestEvidenceRequirement,
} from '../../services/testEvidenceSettingsService'

const INHERIT = 'inherit'

/**
 * Passed-test evidence setting (PRD v1204 decision 3).
 * scope="organisation" edits accounts.test_evidence_default.
 * scope="project" edits projects.test_evidence_requirement; "inherit" stores NULL.
 */
export default function TestEvidenceSettingCard({ scope, targetId, canManage = false }) {
  const { showSuccess, modal } = useSuccessModal()
  const [value, setValue] = useState(null)
  const [saved, setSaved] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const isDirty = saved !== null && value !== saved
  useUnsavedChangesGuard(isDirty && canManage)

  useEffect(() => {
    if (!targetId) return
    let cancelled = false
    const load = scope === 'project' ? getProjectTestEvidenceRequirement : getOrganisationTestEvidenceDefault
    load(targetId)
      .then((v) => {
        if (cancelled) return
        const next = v ?? (scope === 'project' ? INHERIT : TEST_EVIDENCE_REQUIREMENT.OPTIONAL)
        setValue(next)
        setSaved(next)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message)
      })
    return () => {
      cancelled = true
    }
  }, [scope, targetId])

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      if (scope === 'project') {
        await setProjectTestEvidenceRequirement(targetId, value === INHERIT ? null : value)
      } else {
        await setOrganisationTestEvidenceDefault(targetId, value)
      }
      setSaved(value)
      showSuccess({
        recordId: targetId,
        operation: 'updated',
        message: 'Passed-test evidence setting saved.',
      })
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const options =
    scope === 'project'
      ? [
          { value: INHERIT, label: 'Use organisation default' },
          { value: TEST_EVIDENCE_REQUIREMENT.OPTIONAL, label: 'Optional' },
          { value: TEST_EVIDENCE_REQUIREMENT.REQUIRED, label: 'Required' },
        ]
      : [
          { value: TEST_EVIDENCE_REQUIREMENT.OPTIONAL, label: 'Optional' },
          { value: TEST_EVIDENCE_REQUIREMENT.REQUIRED, label: 'Required' },
        ]

  return (
    <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Passed-test evidence</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Whether testers must attach a file before marking a test as passed.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Passed-test evidence requirement"
          value={value ?? ''}
          disabled={!canManage || value === null || saving}
          onChange={(e) => setValue(e.target.value)}
          className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {canManage && (
          <button
            type="button"
            onClick={save}
            disabled={saving || value === null}
            className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400">{error}</p>}
      {modal}
    </section>
  )
}
