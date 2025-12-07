import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Award, Download, Share2, Package, CheckCircle, ExternalLink } from 'lucide-react';
import { getUserCertificates, shareToLinkedIn, orderPhysicalCertificate } from '../../services/certificateService';
import { simDb } from '../../services/supabase/supabaseClient';

const Certificates = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [certificates, setCertificates] = useState([]);
  const [userId, setUserId] = useState(null);
  const [sharing, setSharing] = useState(null);
  const [ordering, setOrdering] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadCertificates();
    }
  }, [userId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadCertificates = async () => {
    try {
      setLoading(true);
      const data = await getUserCertificates(userId);
      setCertificates(data);
    } catch (error) {
      console.error('Error loading certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (certificate) => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank');
    } else {
      alert('PDF is being generated. Please try again in a moment.');
    }
  };

  const handleShareLinkedIn = async (certificateId) => {
    try {
      setSharing(certificateId);
      const { shareUrl } = await shareToLinkedIn(certificateId);
      window.open(shareUrl, '_blank');
      await loadCertificates(); // Reload to update linkedin_shared status
    } catch (error) {
      console.error('Error sharing to LinkedIn:', error);
      alert('Error sharing to LinkedIn: ' + error.message);
    } finally {
      setSharing(null);
    }
  };

  const handleOrderPhysical = async (certificateId) => {
    if (!confirm('Order a physical certificate for $29.99? This will redirect you to checkout.')) {
      return;
    }

    try {
      setOrdering(certificateId);
      // In production, this would redirect to checkout
      // For now, show a message
      alert('Physical certificate ordering will be available soon. Please contact support.');
    } catch (error) {
      console.error('Error ordering physical certificate:', error);
      alert('Error ordering physical certificate: ' + error.message);
    } finally {
      setOrdering(null);
    }
  };

  const getCertificateTypeLabel = (type) => {
    const labels = {
      completion: 'Completion',
      achievement: 'Achievement',
      skill: 'Skill',
      professional: 'Professional',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">My Certificates</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              View and manage your earned certificates
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Award className="w-8 h-8 text-yellow-500" />
            <span className="text-2xl font-bold">{certificates.length}</span>
          </div>
        </div>
      </div>

      {/* Certificates List */}
      {certificates.length === 0 ? (
        <div className={`rounded-xl p-12 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <Award className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No certificates yet</h3>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Complete scenarios to earn certificates
          </p>
          <button
            onClick={() => navigate('/simulator/scenarios')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Browse Scenarios
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {certificates.map((certificate) => (
            <div
              key={certificate.id}
              className={`rounded-xl p-6 border-2 ${
                theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } shadow-lg`}
            >
              {/* Certificate Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <Award className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {getCertificateTypeLabel(certificate.certificate_type)} Certificate
                    </h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {certificate.certificate_number}
                    </p>
                  </div>
                </div>
                {certificate.verification_date && (
                  <CheckCircle className="w-5 h-5 text-green-500" title="Verified" />
                )}
              </div>

              {/* Certificate Details */}
              <div className="space-y-2 mb-4">
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Completion Date
                  </p>
                  <p className="font-medium">{formatDate(certificate.issue_date)}</p>
                </div>
                {certificate.score && (
                  <div>
                    <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Score
                    </p>
                    <p className="font-medium">{certificate.score}%</p>
                  </div>
                )}
                <div>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    Verification Code
                  </p>
                  <p className="font-mono text-sm">{certificate.verification_code}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2 pt-4 border-t border-gray-700">
                <button
                  onClick={() => handleDownload(certificate)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                  } flex items-center justify-center space-x-2`}
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => handleShareLinkedIn(certificate.id)}
                  disabled={sharing === certificate.id || certificate.linkedin_shared}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    certificate.linkedin_shared
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                  } flex items-center justify-center space-x-2`}
                  title={certificate.linkedin_shared ? 'Already shared to LinkedIn' : 'Share to LinkedIn'}
                >
                  {sharing === certificate.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      {certificate.linkedin_shared && <CheckCircle className="w-4 h-4" />}
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleOrderPhysical(certificate.id)}
                  disabled={ordering === certificate.id || certificate.physical_ordered}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    certificate.physical_ordered
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 cursor-not-allowed'
                      : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600'
                      : 'bg-gray-100 hover:bg-gray-200'
                  } flex items-center justify-center space-x-2`}
                  title={certificate.physical_ordered ? 'Physical certificate ordered' : 'Order physical certificate'}
                >
                  {ordering === certificate.id ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                  ) : (
                    <>
                      <Package className="w-4 h-4" />
                      {certificate.physical_ordered && <CheckCircle className="w-4 h-4" />}
                    </>
                  )}
                </button>
              </div>

              {/* Verification Link */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <a
                  href={`/certificate/verify/${certificate.verification_code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm flex items-center space-x-1 ${
                    theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <span>Verify Certificate</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Certificates;

