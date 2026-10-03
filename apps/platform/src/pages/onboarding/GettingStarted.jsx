/**
 * Getting Started (v918, CLAUDE.md Phase 9)
 * "Welcome to Project Nidus / Your workspace includes: ✓ Core PM ✓ [industry pack features] /
 * Create My First Project" — the landing page after Workspace Setup (WorkspaceSetupStep.jsx
 * now redirects here instead of straight to the dashboard). Route: /platform/getting-started
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Rocket, Loader, MailWarning } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution';
import { getGettingStartedSummary } from '../../services/organisationIndustryService';
import { getMyProfessionalRoleCode } from '../../services/professionalRoleService';
import {
  getMyVerificationStatus,
  requestEmailVerificationToken,
  sendAccountVerificationEmail,
} from '../../services/registrationEmailService';

// PMO/Portfolio/Programme-facing roles aren't funneled into "create a project" —
// they use the existing Portfolio/Programme create flows whenever they're ready,
// not necessarily on their very first visit. Project Manager/Team Member/Other/
// unset roles keep the original "Create My First Project" default.
const ROLE_PRIMARY_CTA = {
  portfolio_manager: { label: 'Create Portfolio', path: '/platform/portfolio/create' },
  programme_manager: { label: 'Create Programme', path: '/platform/programme/create' },
  pmo_professional: { label: 'Go to Dashboard', path: '/platform/dashboard' },
};

const QUICK_LINKS = [
  { label: 'Create Portfolio', path: '/platform/portfolio/create' },
  { label: 'Create Programme', path: '/platform/programme/create' },
  { label: 'Create Project', path: '/platform/projects/create' },
];

export default function GettingStarted() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [packs, setPacks] = useState([]);
  const [verification, setVerification] = useState(null);
  const [resending, setResending] = useState(false);
  const [roleCode, setRoleCode] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const accountId = await getCurrentUserAccountId();
      const [result, verificationResult, roleResult] = await Promise.all([
        getGettingStartedSummary(accountId),
        getMyVerificationStatus(),
        getMyProfessionalRoleCode(),
      ]);
      if (cancelled) return;
      if (result.success) setPacks(result.data);
      setVerification(verificationResult);
      setRoleCode(roleResult.roleCode);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const primaryCta = ROLE_PRIMARY_CTA[roleCode] || { label: 'Create My First Project', path: '/platform/projects/create' };
  const isPmoRole = roleCode === 'pmo_professional' || roleCode === 'portfolio_manager' || roleCode === 'programme_manager';

  const handleResendVerification = async () => {
    setResending(true);
    const tokenResult = await requestEmailVerificationToken();
    if (tokenResult.success && tokenResult.token && verification?.email) {
      await sendAccountVerificationEmail(verification.email, verification.firstName, tokenResult.token);
      toast.success('Verification email sent.');
    } else {
      toast.error(tokenResult.error || 'Could not send verification email.');
    }
    setResending(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4 py-12">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-blue-600 dark:text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to Project Nidus</h1>
          <p className="text-gray-600 dark:text-gray-400">Your workspace is ready. Here's what's included.</p>
        </div>

        {!loading && verification && !verification.isVerified && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <MailWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <p className="flex-1 text-sm text-amber-800 dark:text-amber-200">
              Verify your email to unlock full access. Check your inbox for the verification link.
            </p>
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="text-sm font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline disabled:opacity-50 whitespace-nowrap"
            >
              {resending ? 'Sending...' : 'Resend email'}
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">Core Project Management — always included</span>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm pl-8">
              <Loader className="w-4 h-4 animate-spin" />
              Loading your industry capabilities...
            </div>
          ) : (
            packs.map((pack) => (
              <div key={pack.packName} className="pl-8 space-y-1">
                <div className="flex items-start gap-3 -ml-8">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{pack.packName}</span>
                </div>
                {pack.features.length > 0 && (
                  <ul className="pl-8 list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-0.5">
                    {pack.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate(primaryCta.path)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            {primaryCta.label}
          </button>
          {primaryCta.path !== '/platform/dashboard' && (
            <button
              type="button"
              onClick={() => navigate('/platform/dashboard')}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-3 px-4 rounded-lg transition"
            >
              Go to Dashboard
            </button>
          )}
        </div>

        {isPmoRole && (
          <div className="pt-1 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              No need to set anything up right now — create these whenever you're ready:
            </p>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => navigate(link.path)}
                  className="text-sm font-medium text-blue-600 dark:text-blue-400 underline hover:no-underline"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
