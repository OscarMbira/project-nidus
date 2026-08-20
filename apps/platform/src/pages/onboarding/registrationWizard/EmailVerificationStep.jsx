/**
 * Registration wizard — Step 5: Email Verification (v918, CLAUDE.md Phase 5)
 * Matches Documentation/SaaS_Industry_Tenant_Provisioning_Revamp_Brief.md §1's target
 * onboarding model, which places Email Verification between Professional Role and
 * Organisation/Tenant Provisioning. Soft gate (confirmed decision): sends the real
 * verification email (v929) but never blocks continuing — GettingStarted.jsx shows a
 * persistent reminder banner afterward until the account is actually verified.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MailCheck, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  getMyVerificationStatus,
  requestEmailVerificationToken,
  sendAccountVerificationEmail,
} from '../../../services/registrationEmailService';
import WizardStepLayout from './WizardStepLayout';

export default function EmailVerificationStep() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orgFormData, industrySelection, professionalRoleId } = location.state || {};

  const [loading, setLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [hasSentOnce, setHasSentOnce] = useState(false);

  useEffect(() => {
    if (!orgFormData || !industrySelection || !professionalRoleId) {
      navigate('/onboarding/organisation-setup', { replace: true });
    }
  }, [orgFormData, industrySelection, professionalRoleId, navigate]);

  const sendVerificationEmail = async () => {
    setSending(true);
    const statusResult = await getMyVerificationStatus();
    if (statusResult.isVerified) {
      setIsVerified(true);
      setSending(false);
      return;
    }
    const tokenResult = await requestEmailVerificationToken();
    if (tokenResult.success && tokenResult.token) {
      await sendAccountVerificationEmail(orgFormData.email, orgFormData.contactPerson, tokenResult.token);
      toast.success('Verification email sent.');
    } else {
      toast.error(tokenResult.error || 'Could not send verification email.');
    }
    setHasSentOnce(true);
    setSending(false);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      const statusResult = await getMyVerificationStatus();
      setIsVerified(statusResult.isVerified);
      setLoading(false);
      if (!statusResult.isVerified && !hasSentOnce) {
        await sendVerificationEmail();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckStatus = async () => {
    setChecking(true);
    const statusResult = await getMyVerificationStatus();
    setIsVerified(statusResult.isVerified);
    setChecking(false);
    if (statusResult.isVerified) toast.success('Email verified!');
    else toast('Not verified yet — check your inbox.');
  };

  const handleContinue = () => {
    navigate('/onboarding/review', { state: { orgFormData, industrySelection, professionalRoleId } });
  };

  if (!orgFormData || !industrySelection || !professionalRoleId) return null;

  return (
    <WizardStepLayout
      stepId="email-verification"
      icon={MailCheck}
      title="Verify your email"
      subtitle={`We've sent a verification link to ${orgFormData.email || 'your email address'}.`}
    >
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {isVerified ? (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
              Your email is verified.
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
              Click the link in that email to verify your account. You don't have to wait for it —
              you can continue setting up your workspace now and verify later.
            </div>
          )}

          {!isVerified && (
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={checking}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50"
              >
                {checking ? 'Checking...' : "I've verified — check status"}
              </button>
              <button
                type="button"
                onClick={sendVerificationEmail}
                disabled={sending}
                className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium py-2.5 px-4 rounded-lg transition disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Resend email'}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={handleContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
          >
            Continue
          </button>
        </div>
      )}
    </WizardStepLayout>
  );
}
