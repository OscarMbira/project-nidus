/**
 * Trial Expired Page
 * Shown when user tries to access an expired trial project
 * Displays expiry modal with upgrade options
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getTrialStatus } from '../../services/trialService';
import TrialExpiryModal from '../../components/trial/TrialExpiryModal';

const TrialExpired = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const projectId = location.state?.projectId;

  const [projectName, setProjectName] = useState('');

  useEffect(() => {
    if (projectId) {
      loadProjectInfo();
    }
  }, [projectId]);

  const loadProjectInfo = async () => {
    try {
      const status = await getTrialStatus(projectId);
      setProjectName(status.project_name);
    } catch (error) {
      console.error('Error loading project info:', error);
    }
  };

  const handleUpgrade = () => {
    navigate('/trial/upgrade', {
      state: {
        projectId,
        currentProject: projectName
      }
    });
  };

  const handleClose = () => {
    // Redirect to main dashboard or project list
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <TrialExpiryModal
        projectName={projectName}
        onUpgrade={handleUpgrade}
        onClose={handleClose}
        canClose={true}
      />
    </div>
  );
};

export default TrialExpired;
