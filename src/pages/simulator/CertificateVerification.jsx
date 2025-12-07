import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Award, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { verifyCertificate } from '../../services/certificateService';

const CertificateVerification = () => {
  const { theme } = useTheme();
  const { verificationCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (verificationCode) {
      verify();
    }
  }, [verificationCode]);

  const verify = async () => {
    try {
      setLoading(true);
      const result = await verifyCertificate(verificationCode);
      setVerification(result);
    } catch (error) {
      console.error('Error verifying certificate:', error);
      setVerification({ valid: false, message: 'Error verifying certificate' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const isValid = verification?.valid;
  const certificate = verification?.certificate;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className={`max-w-2xl w-full rounded-xl p-8 shadow-lg ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}>
        {isValid ? (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
                <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Certificate Verified</h1>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                This certificate is authentic and has been verified
              </p>
            </div>

            <div className={`rounded-lg p-6 mb-6 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              <div className="space-y-4">
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Certificate Number
                  </p>
                  <p className="font-mono font-semibold">{certificate.certificate_number}</p>
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Certificate Type
                  </p>
                  <p className="font-semibold capitalize">{certificate.certificate_type}</p>
                </div>
                <div>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                    Completion Date
                  </p>
                  <p className="font-semibold">
                    {new Date(certificate.issue_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {certificate.score && (
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      Score
                    </p>
                    <p className="font-semibold">{certificate.score}%</p>
                  </div>
                )}
                {certificate.grade && (
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
                      Grade
                    </p>
                    <p className="font-semibold">{certificate.grade}</p>
                  </div>
                )}
              </div>
            </div>

            {certificate.pdf_url && (
              <div className="text-center">
                <a
                  href={certificate.pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <Award className="w-5 h-5" />
                  <span>Download Certificate PDF</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Certificate Not Found</h1>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {verification?.message || 'The certificate could not be verified. Please check the verification code and try again.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateVerification;

