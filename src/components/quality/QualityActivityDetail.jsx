/**
 * Quality Activity Detail Component
 * Full detail view with tabs for Overview, Participants, Records, Actions, History
 */

import { useState, useEffect } from 'react';
import { Activity, Users, FileText, AlertCircle, History, ArrowLeft, RefreshCw } from 'lucide-react';
import { getActivityByIdentifier } from '../../services/qualityManagementService';
import { supabase } from '../../services/supabaseClient';
import QualityActivityEntry from './QualityActivityEntry';
import QualityActivityParticipants from './QualityActivityParticipants';
import QualityActivityRecords from './QualityActivityRecords';
import QualityActivityActions from './QualityActivityActions';
import QualityActivityExportMenu from './QualityActivityExportMenu';
import ExportRecordButtons from '../ui/ExportRecordButtons';
import { exportRecordToExcel, exportRecordToWord, exportRecordToPPT, exportRecordToCSV, exportRecordToXML, exportRecordToJSON, exportRecordToPrint } from '../../utils/exportUtils';

const QUALITY_ACTIVITY_EXPORT_SECTIONS = [
  { title: 'Basic Information', fields: [
    { key: 'activity_identifier', label: 'Identifier' },
    { key: 'product_title', label: 'Product' },
    { key: 'activity_type', label: 'Type' },
    { key: 'result', label: 'Result' },
    { key: 'activity_date', label: 'Date' }
  ]},
  { title: 'Details', fields: [
    { key: 'description', label: 'Description' },
    { key: 'findings', label: 'Findings' }
  ]}
];

export default function QualityActivityDetail({ activityIdentifier, onBack }) {
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [participants, setParticipants] = useState([]);

  useEffect(() => {
    fetchActivity();
  }, [activityIdentifier]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const result = await getActivityByIdentifier(activityIdentifier);
      if (result.success) {
        setActivity(result.data);
        await fetchParticipants(result.data);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (activityData) => {
    try {
      const tableName = (activityData.activity_type || activityData.type) === 'review'
        ? 'quality_review_participants'
        : 'quality_inspection_participants';

      const idField = (activityData.activity_type || activityData.type) === 'review'
        ? 'review_id'
        : 'inspection_id';

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .eq(idField, activityData.id || activityData.activity_id)
        .eq('is_deleted', false);

      if (!error && data) {
        setParticipants(data);
      }
    } catch (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    }
  };

  const handleTabView = (tab) => {
    setActiveTab(tab);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Activity Not Found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The quality activity with identifier "{activityIdentifier}" could not be found.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'records', label: 'Records', icon: FileText },
    { id: 'actions', label: 'Actions', icon: AlertCircle },
    { id: 'history', label: 'History', icon: History }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        )}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              Quality Activity: {activity.activity_identifier || activityIdentifier}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {activity.product_title || 'Quality Activity Details'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ExportRecordButtons
              onExportPPT={() => exportRecordToPPT(QUALITY_ACTIVITY_EXPORT_SECTIONS, activity, `QualityActivity_${activity.activity_identifier || activityIdentifier}`)}
              onExportWord={() => exportRecordToWord(QUALITY_ACTIVITY_EXPORT_SECTIONS, activity, `QualityActivity_${activity.activity_identifier || activityIdentifier}`)}
              onExportExcel={() => exportRecordToExcel(QUALITY_ACTIVITY_EXPORT_SECTIONS, activity, `QualityActivity_${activity.activity_identifier || activityIdentifier}`)}
              onExportCSV={() => exportRecordToCSV(QUALITY_ACTIVITY_EXPORT_SECTIONS, activity, `QualityActivity_${activity.activity_identifier || activityIdentifier}`)}
              onExportXML={() => exportRecordToXML(QUALITY_ACTIVITY_EXPORT_SECTIONS, activity, `QualityActivity_${activity.activity_identifier || activityIdentifier}`)}
              onExportJSON={() => exportRecordToJSON(QUALITY_ACTIVITY_EXPORT_SECTIONS, activity, `QualityActivity_${activity.activity_identifier || activityIdentifier}`)}
              onExportPrint={() => exportRecordToPrint(QUALITY_ACTIVITY_EXPORT_SECTIONS, activity, `QualityActivity_${activity.activity_identifier || activityIdentifier}`)}
            />
            <QualityActivityExportMenu activity={activity} />
            <button
              onClick={fetchActivity}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && (
          <div>
            <QualityActivityEntry activity={activity} onView={handleTabView} />
          </div>
        )}

        {activeTab === 'participants' && (
          <QualityActivityParticipants
            activityType={activity.activity_type || activity.type || 'review'}
            activityId={activity.id || activity.activity_id}
            participants={participants}
            onUpdate={fetchActivity}
          />
        )}

        {activeTab === 'records' && (
          <QualityActivityRecords
            activityType={activity.activity_type || activity.type || 'review'}
            activityId={activity.id || activity.activity_id}
            onUpdate={fetchActivity}
          />
        )}

        {activeTab === 'actions' && (
          <QualityActivityActions
            activityType={activity.activity_type || activity.type || 'review'}
            activityId={activity.id || activity.activity_id}
            onUpdate={fetchActivity}
          />
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Activity History
              </h3>
            </div>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Revision history and audit trail will be displayed here
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
