/**
 * Organisation Verification Notice
 * Displayed after organisation creation
 * Informs user to check email for verification link
 */

import React, { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { resendVerificationEmail } from '../../services/organisationService';
import { toast } from 'react-hot-toast';
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { platformDb } from '../../services/supabase/supabaseClient';

// Lazy load header for better performance
const PlatformHeader = lazy(() => import('../../components/homepage/PlatformHeader'));

const OrganisationVerificationNotice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const organisationId = location.state?.organisationId;
  const emailSent = location.state?.emailSent !== false; // Default to true for backward compatibility
  const emailError = location.state?.emailError;
  const [resending, setResending] = useState(false);
  const [resentCount, setResentCount] = useState(0);
  const [lastResendError, setLastResendError] = useState(null);

  // TEMPORARILY DISABLED: Email verification
  // Redirect to dashboard if organisation is verified (since verification is disabled)
  useEffect(() => {
    const checkOrganisationStatus = async () => {
      try {
        const { data: { user } } = await platformDb.auth.getUser();
        if (!user) return;

        // Get user record ID
        const { data: userRecord } = await platformDb
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userRecord) return;

        // Check if organisation exists and is verified
        const { data: org } = await platformDb
          .from('accounts')
          .select('id, organisation_verified')
          .eq('owner_user_id', userRecord.id)
          .eq('is_deleted', false)
          .maybeSingle();

        // Since verification is disabled, organisations are auto-verified
        // Redirect to dashboard if organisation exists
        if (org && org.organisation_verified) {
          navigate('/platform/dashboard', { replace: true });
        }
      } catch (error) {
        console.error('Error checking organisation status:', error);
        // Continue to show page if check fails
      }
    };

    checkOrganisationStatus();
  }, [navigate]);

  const handleResend = useCallback(async () => {
    if (!organisationId) {
      toast.error('Organisation ID not found');
      return;
    }

    if (resending) return;

    setResending(true);
    setLastResendError(null);

    try {
      const result = await resendVerificationEmail(organisationId);
      
      // Check if email was actually sent
      if (result.emailSent === false) {
        setLastResendError(result.emailError || 'Email service is not configured');
        toast.error(
          result.emailError || 
          'Could not send verification email. Email service is not configured. Please contact support.',
          { duration: 6000 }
        );
      } else {
        toast.success('Verification email resent! Please check your inbox.');
        setResentCount(prev => prev + 1);
        setLastResendError(null);
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      const errorMessage = error.message || 'Failed to resend verification email';
      setLastResendError(errorMessage);
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setResending(false);
    }
  }, [organisationId, resending]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Suspense fallback={<div className="h-16 bg-gray-900" />}>
        <PlatformHeader />
      </Suspense>
      <div className="flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Mail className="w-10 h-10 text-blue-500" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-4">
          Verify Your Organisation
        </h1>

        {/* Main Message */}
        {emailSent ? (
          <p className="text-gray-400 mb-6">
            We've sent a verification email to activate your organisation.
            Please check your inbox and click the verification link to continue.
          </p>
        ) : (
          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-200">
                <strong className="text-yellow-300">Verification email could not be sent.</strong>
                <p className="mt-1">
                  {emailError || 'Email service is not configured. Please use the resend button below or contact support.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Why Verification Box */}
        <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-gray-300">
              <strong className="text-white">Why verification?</strong>
              <p className="mt-1">
                This ensures one email = one organisation and prevents duplicate accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Resent Confirmation or Error */}
        {resentCount > 0 && !lastResendError && (
          <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4" />
              <span>Email resent successfully! ({resentCount})</span>
            </div>
          </div>
        )}
        
        {lastResendError && (
          <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-red-300">Failed to resend email:</strong>
                <p className="mt-1">{lastResendError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Resend Button */}
        <button
          onClick={handleResend}
          disabled={resending}
          className="flex items-center justify-center gap-2 w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed mb-6"
        >
          <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
          {resending ? 'Resending...' : 'Resend Verification Email'}
        </button>

        {/* Help Text */}
        <div className="space-y-3 text-sm text-gray-400">
          <div className="flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-gray-300">Didn't receive the email?</strong>
              <br />
              Check your spam folder or wait a few minutes before resending.
            </p>
          </div>

          <div className="flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p>
              <strong className="text-gray-300">Still having issues?</strong>
              <br />
              Contact support at{' '}
              <a href="mailto:support@projectnidus.com" className="text-blue-400 hover:underline">
                support@projectnidus.com
              </a>
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500">
            The verification link will expire in 24 hours.
            <br />
            Make sure to verify your organisation before the link expires.
          </p>
        </div>
        </div>
      </div>
    </div>
  );
};

export default OrganisationVerificationNotice;
