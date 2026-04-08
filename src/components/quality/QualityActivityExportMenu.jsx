/**
 * Quality Activity Export Menu Component
 * Provides export options for quality activities (PDF, CSV, Print)
 */

import { useState } from 'react';
import { Download, FileText, FileSpreadsheet, Printer } from 'lucide-react';
import {
  exportActivityToPDF,
  exportActivitiesToCSV,
  exportActivitySummaryToCSV,
  exportActivitiesSummaryToPDF,
  printActivity
} from '../../utils/qualityActivityExport';
import { getRecords } from '../../services/qualityActivityRecordsService';
import { getActions } from '../../services/qualityActivityActionsService';
import { supabase } from '../../services/supabaseClient';

export default function QualityActivityExportMenu({
  activity = null,
  activities = [],
  project = null,
  onExportStart,
  onExportComplete
}) {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('');

  const handleStart = () => {
    setExporting(true);
    if (onExportStart) onExportStart();
  };

  const handleComplete = () => {
    setExporting(false);
    setExportType('');
    if (onExportComplete) onExportComplete();
  };

  const handleExportActivityPDF = async () => {
    if (!activity) {
      alert('Please select an activity to export');
      return;
    }

    try {
      handleStart();
      setExportType('PDF');

      // Fetch related data
      const [recordsResult, actionsResult, participantsResult] = await Promise.all([
        getRecords(activity.activity_type || activity.type, activity.id || activity.activity_id),
        getActions(activity.activity_type || activity.type, activity.id || activity.activity_id),
        fetchParticipants(activity)
      ]);

      const participants = participantsResult || [];
      const records = recordsResult.success ? recordsResult.data : [];
      const actions = actionsResult.success ? actionsResult.data : [];

      await exportActivityToPDF(
        activity,
        participants,
        records,
        actions,
        `Quality-Activity-${activity.activity_identifier || activity.id}-${new Date().toISOString().split('T')[0]}.pdf`
      );
    } catch (error) {
      console.error('Error exporting activity PDF:', error);
      alert('Error exporting PDF: ' + error.message);
    } finally {
      handleComplete();
    }
  };

  const handleExportActivitiesCSV = () => {
    if (!activities || activities.length === 0) {
      alert('No activities to export');
      return;
    }

    try {
      handleStart();
      setExportType('CSV');
      exportActivitiesToCSV(activities, `quality-activities-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Error exporting CSV: ' + error.message);
    } finally {
      handleComplete();
    }
  };

  const handleExportSummaryCSV = () => {
    if (!activities || activities.length === 0) {
      alert('No activities to export');
      return;
    }

    try {
      handleStart();
      setExportType('Summary CSV');
      exportActivitySummaryToCSV(activities, project, `quality-activities-summary-${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Error exporting summary CSV:', error);
      alert('Error exporting summary CSV: ' + error.message);
    } finally {
      handleComplete();
    }
  };

  const handleExportSummaryPDF = async () => {
    if (!activities || activities.length === 0) {
      alert('No activities to export');
      return;
    }

    try {
      handleStart();
      setExportType('Summary PDF');
      await exportActivitiesSummaryToPDF(activities, project, {}, `Quality-Activities-Summary-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting summary PDF:', error);
      alert('Error exporting summary PDF: ' + error.message);
    } finally {
      handleComplete();
    }
  };

  const handlePrintActivity = async () => {
    if (!activity) {
      alert('Please select an activity to print');
      return;
    }

    try {
      handleStart();
      setExportType('Print');

      const [recordsResult, actionsResult, participantsResult] = await Promise.all([
        getRecords(activity.activity_type || activity.type, activity.id || activity.activity_id),
        getActions(activity.activity_type || activity.type, activity.id || activity.activity_id),
        fetchParticipants(activity)
      ]);

      const participants = participantsResult || [];
      const records = recordsResult.success ? recordsResult.data : [];
      const actions = actionsResult.success ? actionsResult.data : [];

      printActivity(activity, participants, records, actions);
    } catch (error) {
      console.error('Error printing activity:', error);
      alert('Error printing: ' + error.message);
    } finally {
      handleComplete();
    }
  };

  const fetchParticipants = async (activity) => {
    try {
      const tableName = (activity.activity_type || activity.type) === 'review'
        ? 'quality_review_participants'
        : 'quality_inspection_participants';

      const idField = (activity.activity_type || activity.type) === 'review'
        ? 'review_id'
        : 'inspection_id';

      const { data, error } = await supabase
        .from(tableName)
        .select(`
          *,
          user:user_id(id, full_name, email)
        `)
        .eq(idField, activity.id || activity.activity_id)
        .eq('is_deleted', false);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching participants:', error);
      return [];
    }
  };

  return (
    <div className="relative inline-block">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Single Activity Exports */}
        {activity && (
          <>
            <button
              onClick={handleExportActivityPDF}
              disabled={exporting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Activity to PDF"
            >
              <FileText className="h-4 w-4" />
              {exporting && exportType === 'PDF' ? 'Exporting...' : 'Activity PDF'}
            </button>
            <button
              onClick={handlePrintActivity}
              disabled={exporting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Print Activity"
            >
              <Printer className="h-4 w-4" />
              {exporting && exportType === 'Print' ? 'Preparing...' : 'Print'}
            </button>
          </>
        )}

        {/* Multiple Activities Exports */}
        {activities && activities.length > 0 && (
          <>
            <button
              onClick={handleExportActivitiesCSV}
              disabled={exporting || activities.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export All Activities to CSV"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting && exportType === 'CSV' ? 'Exporting...' : 'CSV'}
            </button>
            <button
              onClick={handleExportSummaryCSV}
              disabled={exporting || activities.length === 0}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Summary Report to CSV"
            >
              <FileSpreadsheet className="h-4 w-4" />
              {exporting && exportType === 'Summary CSV' ? 'Exporting...' : 'Summary CSV'}
            </button>
            <button
              onClick={handleExportSummaryPDF}
              disabled={exporting || activities.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Export Summary Report to PDF"
            >
              <FileText className="h-4 w-4" />
              {exporting && exportType === 'Summary PDF' ? 'Exporting...' : 'Summary PDF'}
            </button>
          </>
        )}
      </div>

      {exporting && (
        <div className="absolute top-full left-0 mt-2 px-4 py-2 bg-gray-800 text-white rounded-lg text-sm whitespace-nowrap z-50">
          Exporting {exportType}...
        </div>
      )}
    </div>
  );
}
