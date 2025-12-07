import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Shield, AlertTriangle, CheckCircle, Clock, User, Globe } from 'lucide-react';
import { logSecurityEvent, checkSuspiciousActivity } from '../../services/securityService';
import { simDb } from '../../services/supabase/supabaseClient';

const SecurityDashboard = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadSecurityData();
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

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Check for suspicious activity
      const suspicious = await checkSuspiciousActivity(userId);
      setSuspiciousActivity(suspicious);

      // In production, this would fetch from security_audit_log table
      // For now, show placeholder
      setSecurityEvents([]);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h1 className="text-2xl font-bold mb-2">Security Dashboard</h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Monitor security events and compliance
        </p>
      </div>

      {/* Security Status */}
      {suspiciousActivity && (
        <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Security Status</h2>
            {suspiciousActivity.suspicious ? (
              <AlertTriangle className="w-6 h-6 text-red-500" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>
          {suspiciousActivity.suspicious ? (
            <div>
              <p className="text-red-600 dark:text-red-400 mb-2">Suspicious activity detected:</p>
              <ul className="list-disc list-inside space-y-1">
                {suspiciousActivity.reasons.map((reason, idx) => (
                  <li key={idx} className="text-sm">{reason}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-green-600 dark:text-green-400">No suspicious activity detected</p>
          )}
        </div>
      )}

      {/* Security Events */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h2 className="text-xl font-bold mb-4">Recent Security Events</h2>
        {securityEvents.length === 0 ? (
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No security events to display
          </p>
        ) : (
          <div className="space-y-4">
            {securityEvents.map((event) => (
              <div
                key={event.id}
                className={`p-4 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{event.event_type}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      event.severity === 'critical'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : event.severity === 'high'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {event.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityDashboard;

