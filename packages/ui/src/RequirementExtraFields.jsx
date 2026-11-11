import SelectField from './SelectField'
import { NFR_CATEGORY, VERIFICATION_METHODS } from '@nidus/shared/services/requirementExtrasService'

const LABEL_CLS = 'mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400'
const INPUT_CLS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'

/**
 * Requirement fields added in v1338 (Owner, Rationale, Non-Functional Area on Details; Verification Method
 * on Acceptance). Renders nothing until the columns exist (`available`).
 * @param {{ section: 'details'|'acceptance', form: object, onChange: (patch: object) => void,
 *   disabled?: boolean, available: boolean, areas: {value: string, label: string}[] }} props
 */
export default function RequirementExtraFields({ section, form, onChange, disabled = false, available, areas = [] }) {
  if (!available) return null

  if (section === 'acceptance') {
    return (
      <div>
        <label htmlFor="req-verification-method" className={LABEL_CLS}>Verification method</label>
        <SelectField
          id="req-verification-method"
          options={VERIFICATION_METHODS}
          value={form.verification_method || ''}
          onChange={(value) => onChange({ verification_method: value })}
          placeholder="How will this be shown to be met?"
          disabled={disabled}
        />
      </div>
    )
  }

  const showArea = form.category === NFR_CATEGORY && areas.length > 0
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="req-owner" className={LABEL_CLS}>Owner</label>
          <input
            id="req-owner"
            value={form.owner_name || ''}
            onChange={(e) => onChange({ owner_name: e.target.value })}
            disabled={disabled}
            placeholder="Person accountable for this requirement"
            className={INPUT_CLS}
          />
        </div>
        {showArea && (
          <div>
            <label htmlFor="req-nfr-area" className={LABEL_CLS}>Non-functional area</label>
            <SelectField
              id="req-nfr-area"
              options={areas}
              value={form.nfr_area_key || ''}
              onChange={(value) => onChange({ nfr_area_key: value })}
              placeholder="Choose an area"
              disabled={disabled}
            />
          </div>
        )}
      </div>
      <div>
        <label htmlFor="req-rationale" className={LABEL_CLS}>Rationale</label>
        <textarea
          id="req-rationale"
          value={form.rationale || ''}
          onChange={(e) => onChange({ rationale: e.target.value })}
          disabled={disabled}
          rows={2}
          placeholder="Why this requirement is needed"
          className={INPUT_CLS}
        />
      </div>
    </>
  )
}
