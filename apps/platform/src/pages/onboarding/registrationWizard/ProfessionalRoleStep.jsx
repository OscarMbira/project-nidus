/**
 * Registration wizard — Step 4: Professional Role (v918, CLAUDE.md Phase 5)
 * Informational-only "what do you do" picker — distinct from the security role assigned by
 * assignSystemRole() in organisationService.js, which is unaffected by this choice (PRD decision 4).
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { UserCog } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getProfessionalRoles } from '../../../services/professionalRoleService';
import WizardStepLayout from './WizardStepLayout';

export default function ProfessionalRoleStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgFormData, industrySelection } = location.state || {};

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoleId, setSelectedRoleId] = useState(location.state?.professionalRoleId || null);

  useEffect(() => {
    if (!orgFormData || !industrySelection) {
      navigate('/onboarding/organisation-setup', { replace: true });
    }
  }, [orgFormData, industrySelection, navigate]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getProfessionalRoles();
      if (result.success) {
        setRoles(result.data);
      } else {
        toast.error(result.error || 'Failed to load professional roles');
      }
      setLoading(false);
    })();
  }, []);

  const handleContinue = () => {
    if (!selectedRoleId) {
      toast.error('Select your professional role to continue.');
      return;
    }
    navigate('/onboarding/email-verification', {
      state: { orgFormData, industrySelection, professionalRoleId: selectedRoleId },
    });
  };

  if (!orgFormData || !industrySelection) return null;

  return (
    <WizardStepLayout
      stepId="professional-role"
      icon={UserCog}
      title="What's your professional role?"
      subtitle="This helps us tailor guidance for you. It doesn't affect your permissions in the system."
    >
      {loading ? (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">Loading roles...</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {roles.map((role) => (
              <label
                key={role.id}
                className={`flex items-start gap-3 border rounded-lg p-4 cursor-pointer transition ${
                  selectedRoleId === role.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
              >
                <input
                  type="radio"
                  name="professionalRole"
                  checked={selectedRoleId === role.id}
                  onChange={() => setSelectedRoleId(role.id)}
                  className="mt-1 w-4 h-4"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{role.role_label}</span>
                  {role.description && (
                    <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</span>
                  )}
                </span>
              </label>
            ))}
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!selectedRoleId}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      )}
    </WizardStepLayout>
  );
}
