import { supabase } from './supabaseClient';

/**
 * Checkpoint Report Version Service
 * Handles version control and revision history for Checkpoint Reports
 */

/**
 * Create New Version
 * @param {string} reportId - Report ID
 * @param {string} summaryOfChanges - Summary of changes
 * @param {string} changesMarked - Changes marked text
 * @returns {Promise<Object>} Updated report with new version
 */
export async function createNewVersion(reportId, summaryOfChanges, changesMarked = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!userData) throw new Error('User not found');

    // Get current report
    const { data: currentReport } = await supabase
      .from('checkpoint_reports')
      .select('version_no, date_of_this_revision')
      .eq('id', reportId)
      .single();

    if (!currentReport) throw new Error('Report not found');

    // Calculate new version number
    const currentVersion = currentReport.version_no || '1.0';
    const versionParts = currentVersion.split('.');
    const majorVersion = parseInt(versionParts[0]) || 1;
    const minorVersion = parseInt(versionParts[1]) || 0;
    const newVersion = `${majorVersion}.${minorVersion + 1}`;

    // Create revision history entry
    const { data: revisionHistory } = await supabase
      .from('checkpoint_report_revision_history')
      .insert({
        checkpoint_report_id: reportId,
        revision_date: new Date().toISOString().split('T')[0],
        previous_revision_date: currentReport.date_of_this_revision,
        summary_of_changes: summaryOfChanges,
        changes_marked: changesMarked,
        revised_by: userData.id,
        version_no: newVersion
      })
      .select()
      .single();

    // Update report version
    const { data: updatedReport, error } = await supabase
      .from('checkpoint_reports')
      .update({
        version_no: newVersion,
        date_of_this_revision: new Date().toISOString().split('T')[0],
        updated_by: userData.id
      })
      .eq('id', reportId)
      .select()
      .single();

    if (error) throw error;

    return {
      report: updatedReport,
      revisionHistory
    };
  } catch (error) {
    console.error('Error creating new version:', error);
    throw error;
  }
}

/**
 * Get Version History
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Array of revision history entries
 */
export async function getVersionHistory(reportId) {
  try {
    const { data, error } = await supabase
      .from('checkpoint_report_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('checkpoint_report_id', reportId)
      .order('revision_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching version history:', error);
    throw error;
  }
}

/**
 * Compare Versions
 * @param {string} reportId - Report ID
 * @param {string} version1 - First version number
 * @param {string} version2 - Second version number
 * @returns {Promise<Object>} Comparison data
 */
export async function compareVersions(reportId, version1, version2) {
  try {
    // Get revision history for both versions
    const { data: history1 } = await supabase
      .from('checkpoint_report_revision_history')
      .select('*')
      .eq('checkpoint_report_id', reportId)
      .eq('version_no', version1)
      .single();

    const { data: history2 } = await supabase
      .from('checkpoint_report_revision_history')
      .select('*')
      .eq('checkpoint_report_id', reportId)
      .eq('version_no', version2)
      .single();

    return {
      version1: history1,
      version2: history2,
      changes: {
        summary1: history1?.summary_of_changes || '',
        summary2: history2?.summary_of_changes || '',
        marked1: history1?.changes_marked || '',
        marked2: history2?.changes_marked || ''
      }
    };
  } catch (error) {
    console.error('Error comparing versions:', error);
    throw error;
  }
}
