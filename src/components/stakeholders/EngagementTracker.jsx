import { useState, useEffect } from 'react';
import { MessageSquare, Calendar, TrendingUp, TrendingDown, Minus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { getStakeholderEngagement, saveStakeholderEngagement } from '../../services/stakeholderService';

export default function EngagementTracker({ projectId, stakeholders = [] }) {
  const [engagement, setEngagement] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    engagement_level: '',
    satisfaction_level: null,
    support_level: '',
    engagement_date: new Date().toISOString().split('T')[0],
    engagement_notes: '',
  });

  useEffect(() => {
    if (projectId) {
      fetchEngagement();
    }
  }, [projectId]);

  const fetchEngagement = async () => {
    try {
      setLoading(true);
      const data = await getStakeholderEngagement({ project_id: projectId });
      setEngagement(data || []);
    } catch (error) {
      console.error('Error fetching engagement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEngagement = async (stakeholderId, data) => {
    try {
      await saveStakeholderEngagement({
        ...data,
        project_id: projectId,
        stakeholder_id: stakeholderId,
      });
      fetchEngagement();
      setEditingId(null);
      setFormData({
        engagement_level: '',
        satisfaction_level: null,
        support_level: '',
        engagement_date: new Date().toISOString().split('T')[0],
        engagement_notes: '',
      });
    } catch (error) {
      console.error('Error saving engagement:', error);
      alert('Error saving engagement: ' + error.message);
    }
  };

  const getEngagementColor = (level) => {
    switch (level) {
      case 'leading':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'supportive':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'neutral':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'unsupportive':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'blocking':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getEngagementIcon = (level) => {
    switch (level) {
      case 'leading':
        return <TrendingUp className="h-4 w-4" />;
      case 'supportive':
        return <CheckCircle className="h-4 w-4" />;
      case 'neutral':
        return <Minus className="h-4 w-4" />;
      case 'unsupportive':
        return <AlertTriangle className="h-4 w-4" />;
      case 'blocking':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getSatisfactionColor = (level) => {
    if (!level) return 'bg-gray-100 text-gray-800';
    if (level >= 4) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    if (level >= 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get latest engagement for each stakeholder
  const stakeholderEngagementMap = {};
  engagement.forEach(eng => {
    const shId = eng.stakeholder_id;
    if (!stakeholderEngagementMap[shId] || 
        new Date(eng.engagement_date) > new Date(stakeholderEngagementMap[shId].engagement_date)) {
      stakeholderEngagementMap[shId] = eng;
    }
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Stakeholder Engagement Tracking
        </h3>

        {stakeholders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No stakeholders to track engagement for
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {stakeholders.map((stakeholder) => {
              const latestEngagement = stakeholderEngagementMap[stakeholder.id];
              const isEditing = editingId === stakeholder.id;

              return (
                <div
                  key={stakeholder.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {stakeholder.stakeholder_name}
                      </h4>
                      {stakeholder.stakeholder_title && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {stakeholder.stakeholder_title}
                        </p>
                      )}
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setEditingId(stakeholder.id)}
                        className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                      >
                        {latestEngagement ? 'Update' : 'Record'}
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Engagement Level *
                          </label>
                          <select
                            value={formData.engagement_level || latestEngagement?.engagement_level || ''}
                            onChange={(e) => setFormData({ ...formData, engagement_level: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select level...</option>
                            <option value="leading">Leading</option>
                            <option value="supportive">Supportive</option>
                            <option value="neutral">Neutral</option>
                            <option value="unsupportive">Unsupportive</option>
                            <option value="blocking">Blocking</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Satisfaction (1-5)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            value={formData.satisfaction_level || latestEngagement?.satisfaction_level || ''}
                            onChange={(e) => setFormData({ ...formData, satisfaction_level: e.target.value ? parseInt(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Support Level *
                          </label>
                          <select
                            value={formData.support_level || latestEngagement?.support_level || ''}
                            onChange={(e) => setFormData({ ...formData, support_level: e.target.value })}
                            required
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select level...</option>
                            <option value="strongly-support">Strongly Support</option>
                            <option value="support">Support</option>
                            <option value="neutral">Neutral</option>
                            <option value="oppose">Oppose</option>
                            <option value="strongly-oppose">Strongly Oppose</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Engagement Date *
                        </label>
                        <input
                          type="date"
                          value={formData.engagement_date || latestEngagement?.engagement_date?.split('T')[0] || ''}
                          onChange={(e) => setFormData({ ...formData, engagement_date: e.target.value })}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Notes
                        </label>
                        <textarea
                          value={formData.engagement_notes || latestEngagement?.engagement_notes || ''}
                          onChange={(e) => setFormData({ ...formData, engagement_notes: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Record engagement details..."
                        />
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setFormData({
                              engagement_level: '',
                              satisfaction_level: null,
                              support_level: '',
                              engagement_date: new Date().toISOString().split('T')[0],
                              engagement_notes: '',
                            });
                          }}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEngagement(stakeholder.id, formData)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                          Engagement Level
                        </label>
                        {latestEngagement?.engagement_level ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded capitalize ${getEngagementColor(latestEngagement.engagement_level)}`}>
                            {getEngagementIcon(latestEngagement.engagement_level)}
                            {latestEngagement.engagement_level}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not recorded</span>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                          Satisfaction
                        </label>
                        {latestEngagement?.satisfaction_level ? (
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded ${getSatisfactionColor(latestEngagement.satisfaction_level)}`}>
                              {latestEngagement.satisfaction_level}/5
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not recorded</span>
                        )}
                      </div>

                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                          Support Level
                        </label>
                        {latestEngagement?.support_level ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded capitalize ${getEngagementColor(latestEngagement.support_level)}`}>
                            {latestEngagement.support_level?.replace('-', ' ')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">Not recorded</span>
                        )}
                      </div>

                      {latestEngagement?.engagement_date && (
                        <div className="md:col-span-3">
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                            <Calendar className="h-3 w-3" />
                            Last updated: {new Date(latestEngagement.engagement_date).toLocaleDateString()}
                          </div>
                          {latestEngagement.engagement_notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                              {latestEngagement.engagement_notes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

