/**
 * Verify Organisation
 * Handles organisation verification token from email
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyOrganisation, resendVerificationEmail } from '../../services/organisationService';
import { toast } from 'react-hot-toast';
import { CheckCircle, XCircle, Loader, ArrowRight, Mail } from 'lucide-react';
import PlatformHeader from '../../components/homepage/PlatformHeader';

const VerifyOrganisation = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [organisationId, setOrganisationId] = useState(null);

  useEffect(() => {
    const token = searchParams.get('token');

    if (!token) {
      setStatus('error');
      setErrorMessage('Verification token is missing');
      return;
    }

    handleVerification(token);
  }, [searchParams]);

  const handleVerification = async (token) => {
    try {
      const organisation = await verifyOrganisation(token);

      setOrganisationId(organisation.id);
      setStatus('success');
      toast.success('Organisation verified successfully!');

      // Wait 2 seconds then redirect to project type selection
      setTimeout(() => {
        navigate('/onboarding/project-type-selection', {
          state: { organisationId: organisation.id }
        });
      }, 2000);
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('error');
      
      // Check if token is expired
      const isExpired = error.message?.toLowerCase().includes('expired');
      const isInvalid = error.message?.toLowerCase().includes('invalid');
      
      if (isExpired || isInvalid) {
        setErrorMessage(
          isExpired 
            ? 'This verification link has expired. Please request a new verification email.'
            : 'This verification link is invalid. Please request a new verification email.'
        );
      } else {
        setErrorMessage(error.message || 'Verification failed');
      }
      
      toast.error(error.message || 'Verification failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PlatformHeader />
      <div className="flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        {/* Verifying State */}
        {status === 'verifying' && (
          <>
            <Loader className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Verifying Organisation...
            </h1>
            <p className="text-gray-400">
              Please wait while we verify your organisation.
            </p>
            <div className="mt-6">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-75" />
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150" />
              </div>
            </div>
          </>
        )}

        {/* Success State */}
        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-600/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="w-12 h-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Organisation Verified!
            </h1>
            <p className="text-gray-400 mb-6">
              Your organisation has been successfully verified.
            </p>

            <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4 mb-6">
              <p className="text-green-400 text-sm">
                Redirecting you to project setup...
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-xs text-gray-400">Please wait</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/onboarding/project-type-selection', {
                state: { organisationId }
              })}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              Continue to Project Setup
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Error State */}
        {status === 'error' && (
          <>
            <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Verification Failed
            </h1>
            <p className="text-gray-400 mb-6">
              {errorMessage || 'The verification link is invalid or has expired.'}
            </p>

            <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-red-400 mb-2">Common Issues:</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Verification link has expired (24-hour limit)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Link has already been used</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Invalid or corrupted link</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => navigate('/onboarding/organisation-setup')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition"
              >
                Request New Verification Email
              </button>

              <button
                onClick={() => navigate('/login')}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-4 rounded-lg transition"
              >
                Return to Login
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Need help? Contact{' '}
              <a href="mailto:support@projectnidus.com" className="text-blue-400 hover:underline">
                support@projectnidus.com
              </a>
            </p>
          </>
        )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOrganisation;
