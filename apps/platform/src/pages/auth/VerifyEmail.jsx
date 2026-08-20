/**
 * Verify Email (v929) — landing page for Project-Nidus-driven account email
 * verification links (SQL/v929_account_email_verification.sql), sent via the
 * reliable send-email/Resend-API path instead of Supabase's own SMTP
 * integration. Route only becomes reachable in practice once
 * ACCOUNT_EMAIL_VERIFICATION_ENABLED is flipped on in registrationEmailService.js
 * — kept code-complete now so switching it on later needs no further build.
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader } from 'lucide-react';
import { verifyEmailToken } from '../../services/registrationEmailService';
import AuthPublicLayout from '../../components/auth/AuthPublicLayout';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('verifying'); // verifying | success | error
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setStatus('error');
        return;
      }
      const result = await verifyEmailToken(token);
      if (cancelled) return;
      if (result.success) {
        setUserEmail(result.userEmail || '');
        setStatus('success');
      } else {
        setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  return (
    <AuthPublicLayout>
      <div className="max-w-md w-full text-center bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {status === 'verifying' && (
          <>
            <Loader className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Verifying your email...</h1>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Email verified</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {userEmail ? `${userEmail} is now verified.` : 'Your email is now verified.'}
            </p>
            <Link to="/platform/dashboard" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Go to Dashboard
            </Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Verification link invalid or expired</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              This link may have already been used or has expired. You can request a new one from your account settings.
            </p>
            <Link to="/platform/login" className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Go to Login
            </Link>
          </>
        )}
      </div>
    </AuthPublicLayout>
  );
}
