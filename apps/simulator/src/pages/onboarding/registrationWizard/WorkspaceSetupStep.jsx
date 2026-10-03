/**
 * Registration wizard — Step 6: Workspace Setup (v918, CLAUDE.md Phase 5)
 * The only step that writes to the database: creates the accounts row (createOrganisation
 * already has its own idempotency via the existing-default-org reuse path — see
 * organisationService.js), then provisions industries and sets the professional role in
 * parallel (both only need the account/user id createOrganisation just returned — rule 66).
 * Safe to retry: createOrganisation reuses an unverified/default org instead of duplicating,
 * and provision_organisation_tenant is an idempotent upsert (see v923).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Rocket, AlertTriangle } from 'lucide-react';
import { supabase } from '@nidus/supabase';
import { createOrganisation, provisionOrganisationTenant } from '../../../services/organisationService';
import { updateUserProfessionalRole } from '../../../services/professionalRoleService';
import { getUserSystemRoles } from '../../../services/roleService';
import { useSuccessModal } from '@nidus/shared/hooks/useSuccessModal';
import WizardStepLayout from './WizardStepLayout';

export default function WorkspaceSetupStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgFormData, industrySelection, professionalRoleId } = location.state || {};
  const { showSuccess, modal } = useSuccessModal();

  const [status, setStatus] = useState('idle'); // idle | running | error
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!orgFormData || !industrySelection || !professionalRoleId) {
      navigate('/onboarding/organisation-setup', { replace: true });
    }
  }, [orgFormData, industrySelection, professionalRoleId, navigate]);

  const runSetup = useCallback(async () => {
    setStatus('running');
    setErrorMessage('');
    try {
      const organisation = await createOrganisation(orgFormData);
      const accountId = organisation.id;
      const userId = organisation.owner_user_id;
      const industrySegmentIds = industrySelection.industryCategoryIds.map(
        (id) => industrySelection.segmentIdsByIndustry?.[id] || null
      );

      const [provisionResult, roleResult] = await Promise.all([
        provisionOrganisationTenant(
          accountId,
          industrySelection.industryCategoryIds,
          industrySelection.primaryIndustryId,
          industrySegmentIds
        ),
        updateUserProfessionalRole(userId, professionalRoleId),
      ]);

      if (!provisionResult.success) {
        throw new Error(provisionResult.error || 'Failed to provision industries for your organisation');
      }
      if (!roleResult.success) {
        console.warn('WorkspaceSetupStep: professional role save failed (non-blocking):', roleResult.error);
      }

      // v982 Phase 1 (task F): Platform's equivalent lands a declined-PMO Account Owner
      // in the Account & Subscription zone. Simulator has no such route mounted today
      // (confirmed by investigation — `platform/subscription` and `admin/send-role-invites`
      // are dead imports here, not live routes) — documented gap, not force-fit. Instead,
      // stay on the existing Getting Started landing and pass a flag so it can render the
      // same "Invite a PMO Administrator" messaging inline. Checked against the role the
      // user actually holds post-provisioning, not the toggle state.
      let showInvitePmoCta = false;
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const systemRoles = await getUserSystemRoles(authUser.id);
          const hasPmoAdmin = systemRoles.success
            && systemRoles.data.some((r) => r.roles?.role_name === 'pmo_admin');
          showInvitePmoCta = !hasPmoAdmin;
        }
      } catch (landingErr) {
        console.warn('WorkspaceSetupStep: could not resolve PMO Admin status for landing CTA (non-blocking):', landingErr?.message);
      }

      setStatus('idle');
      showSuccess({
        recordId: organisation.account_code || organisation.account_name,
        operation: 'created',
        message: 'Your workspace is ready.',
        onOk: () => navigate('/platform/getting-started', { replace: true, state: { showInvitePmoCta } }),
      });
    } catch (error) {
      console.error('WorkspaceSetupStep: setup failed:', error);
      setErrorMessage(error.message || 'Failed to set up your workspace');
      setStatus('error');
    }
  }, [orgFormData, industrySelection, professionalRoleId, navigate, showSuccess]);

  useEffect(() => {
    if (orgFormData && industrySelection && professionalRoleId && status === 'idle') {
      runSetup();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!orgFormData || !industrySelection || !professionalRoleId) return null;

  return (
    <WizardStepLayout
      stepId="workspace-setup"
      icon={status === 'error' ? AlertTriangle : Rocket}
      title={status === 'error' ? 'We hit a snag' : 'Setting up your workspace...'}
      subtitle={
        status === 'error'
          ? errorMessage
          : 'Creating your organisation, applying your industry selection, and preparing your workspace.'
      }
    >
      {status === 'error' ? (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/onboarding/review', { state: { orgFormData, industrySelection, professionalRoleId } })}
            className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-3 px-4 rounded-lg transition"
          >
            Back
          </button>
          <button
            type="button"
            onClick={runSetup}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="flex justify-center py-8">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {modal}
    </WizardStepLayout>
  );
}
