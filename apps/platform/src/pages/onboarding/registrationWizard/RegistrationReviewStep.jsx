/**
 * Registration wizard — Step 5: Verify (v918, CLAUDE.md Phase 5)
 * Read-only summary of everything entered in steps 2-4. No DB write here — actual submission
 * happens on the next (Workspace Setup) step. Email verification stays disabled per decision
 * at implementation time; this step is the review/confirm gate in its place.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { getIndustryCategories } from '../../../services/organisationCustomRoleService';
import { getProfessionalRoles } from '../../../services/professionalRoleService';
import WizardStepLayout from './WizardStepLayout';

export default function RegistrationReviewStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgFormData, industrySelection, professionalRoleId } = location.state || {};

  const [industries, setIndustries] = useState([]);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    if (!orgFormData || !industrySelection || !professionalRoleId) {
      navigate('/onboarding/organisation-setup', { replace: true });
    }
  }, [orgFormData, industrySelection, professionalRoleId, navigate]);

  useEffect(() => {
    (async () => {
      const [industryResult, roleResult] = await Promise.all([getIndustryCategories(), getProfessionalRoles()]);
      if (industryResult.success) setIndustries(industryResult.data);
      if (roleResult.success) setRoles(roleResult.data);
    })();
  }, []);

  if (!orgFormData || !industrySelection || !professionalRoleId) return null;

  const industryNameById = new Map(industries.map((i) => [i.id, i.name]));
  const roleLabel = roles.find((r) => r.id === professionalRoleId)?.role_label;

  const handleConfirm = () => {
    navigate('/onboarding/workspace-setup', { state: { orgFormData, industrySelection, professionalRoleId } });
  };

  const handleBack = () => {
    navigate('/onboarding/professional-role', { state: { orgFormData, industrySelection, professionalRoleId } });
  };

  return (
    <WizardStepLayout
      stepId="review"
      icon={ClipboardCheck}
      title="Review your details"
      subtitle="Confirm everything looks right before we set up your workspace."
    >
      <div className="space-y-6">
        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Organisation</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Name</dt>
              <dd className="text-gray-900 dark:text-gray-100">{orgFormData.name}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Type</dt>
              <dd className="text-gray-900 dark:text-gray-100">{orgFormData.type}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Country</dt>
              <dd className="text-gray-900 dark:text-gray-100">{orgFormData.country}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Contact person</dt>
              <dd className="text-gray-900 dark:text-gray-100">{orgFormData.contactPerson}</dd>
            </div>
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Email</dt>
              <dd className="text-gray-900 dark:text-gray-100">{orgFormData.email}</dd>
            </div>
          </dl>
        </section>

        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Industries</h2>
          <ul className="text-sm text-gray-900 dark:text-gray-100 space-y-1">
            {industrySelection.industryCategoryIds.map((id) => (
              <li key={id}>
                {industryNameById.get(id) || id}
                {id === industrySelection.primaryIndustryId && (
                  <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(Primary)</span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Professional role</h2>
          <p className="text-sm text-gray-900 dark:text-gray-100">{roleLabel || '—'}</p>
        </section>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-3 px-4 rounded-lg transition"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            Confirm & Create Workspace
          </button>
        </div>
      </div>
    </WizardStepLayout>
  );
}
