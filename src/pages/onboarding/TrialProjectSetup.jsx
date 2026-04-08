/**
 * Trial Project Setup
 * Creates a FREE 10-day trial project
 * Limited to 5 members and basic features
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createTrialProject } from '../../services/trialService';
import { toast } from 'react-hot-toast';
import {
  Rocket,
  Calendar,
  Users,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Clock,
  Award
} from 'lucide-react';

const TrialProjectSetup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const organisationId = location.state?.organisationId;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'software',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    platformEnabled: true,
    simulatorEnabled: false
  });

  useEffect(() => {
    if (!organisationId) {
      toast.error('Organisation ID is required');
      navigate('/onboarding/project-type-selection');
      return;
    }

    // Calculate trial end date (10 days from today)
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 10);

    setFormData(prev => ({
      ...prev,
      endDate: endDate.toISOString().split('T')[0]
    }));
  }, [organisationId, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.platformEnabled && !formData.simulatorEnabled) {
      toast.error('Please select at least one subsystem (Platform or Simulator)');
      return;
    }

    setLoading(true);

    try {
      const projectData = {
        name: formData.name,
        type: formData.type,
        description: formData.description,
        organisation_id: organisationId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        platform_enabled: formData.platformEnabled,
        simulator_enabled: formData.simulatorEnabled
      };

      const project = await createTrialProject(projectData, organisationId);

      toast.success('Trial project created successfully! Welcome aboard!');

      // Redirect to trial dashboard
      navigate('/dashboard/trial', {
        state: {
          projectId: project.id,
          isNewTrial: true
        }
      });
    } catch (error) {
      console.error('Trial project creation error:', error);
      toast.error(error.message || 'Failed to create trial project');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <PlatformHeader />
      <div className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with Trial Badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-600/20 text-green-400 px-4 py-2 rounded-full mb-4">
            <Sparkles className="w-5 h-5" />
            <span className="font-semibold">FREE 10-DAY TRIAL</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">
            Create Your Trial Project
          </h1>
          <p className="text-xl text-gray-400">
            Test our platform risk-free with full features
          </p>
        </div>

        {/* Trial Benefits Banner */}
        <div className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border border-green-600/50 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3 mb-4">
            <Award className="w-6 h-6 text-green-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-white mb-2">
                Your Trial Includes:
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-start gap-2 text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">10 Days Access</strong>
                    <p className="text-sm text-gray-400">Full feature access</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Up to 5 Members</strong>
                    <p className="text-sm text-gray-400">Invite your team</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-gray-300">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">No Credit Card</strong>
                    <p className="text-sm text-gray-400">Totally free</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Name *
              </label>
              <div className="relative">
                <Rocket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none"
                  placeholder="My First Project"
                />
              </div>
            </div>

            {/* Project Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Type *
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => handleChange('type', e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none appearance-none cursor-pointer"
              >
                <option value="software">Software Development</option>
                <option value="construction">Construction</option>
                <option value="marketing">Marketing Campaign</option>
                <option value="product">Product Launch</option>
                <option value="event">Event Planning</option>
                <option value="research">Research & Development</option>
                <option value="internal">Internal Project</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Project Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-green-500 focus:outline-none resize-none"
                placeholder="Brief description of what this project is about..."
              />
            </div>

            {/* Trial Dates */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trial Start Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.startDate}
                    readOnly
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Starts today</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trial End Date
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-400" />
                  <input
                    type="date"
                    value={formData.endDate}
                    readOnly
                    className="w-full pl-12 pr-4 py-3 bg-gray-700 border border-green-600 rounded-lg text-white cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-green-400 mt-1">10 days from today</p>
              </div>
            </div>

            {/* Subsystem Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Subsystem(s) *
              </label>
              <div className="space-y-3">
                {/* Platform Checkbox */}
                <label className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                  <input
                    type="checkbox"
                    checked={formData.platformEnabled}
                    onChange={(e) => handleChange('platformEnabled', e.target.checked)}
                    className="mt-1 w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">Platform (Project Management)</span>
                      <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-0.5 rounded">Recommended</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Real project management: tasks, Gantt charts, team collaboration, resource planning
                    </p>
                  </div>
                </label>

                {/* Simulator Checkbox */}
                <label className="flex items-start gap-3 p-4 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition">
                  <input
                    type="checkbox"
                    checked={formData.simulatorEnabled}
                    onChange={(e) => handleChange('simulatorEnabled', e.target.checked)}
                    className="mt-1 w-5 h-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">Simulator (Learning & Training)</span>
                    </div>
                    <p className="text-sm text-gray-400">
                      Project management simulator: practice scenarios, AI events, skill building
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Trial Limitations Notice */}
            <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-200">
                  <strong className="block mb-1">Trial Limitations:</strong>
                  <ul className="space-y-1 text-yellow-300/90">
                    <li>• Maximum 5 team members</li>
                    <li>• Project will be locked after 10 days unless upgraded</li>
                    <li>• Basic features only (advanced features in paid plans)</li>
                    <li>• One trial project per organisation</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Upgrade Info */}
            <div className="bg-blue-900/20 border border-blue-600/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <strong className="block mb-1">Upgrade Anytime:</strong>
                  <p>
                    You can upgrade to a paid plan at any time during your trial to unlock unlimited
                    projects, more team members, and advanced features. All your trial data will be preserved!
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-lg transition text-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating Your Trial Project...
                </>
              ) : (
                <>
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-400 flex items-center justify-center gap-6 flex-wrap">
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No credit card required
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Cancel anytime
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Upgrade whenever ready
              </span>
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default TrialProjectSetup;
