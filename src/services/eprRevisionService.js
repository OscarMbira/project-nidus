/**
 * End Project Report Revision Service
 * Manages version control and revision history
 */

import { supabase } from './supabaseClient'

/**
 * Create New Version
 * @param {string} reportId - Report ID
 * @param {string} summaryOfChanges - Summary of changes
 * @param {string} changesMarked - Reference to marked changes
 * @returns {Promise<Object>} Revision record
 */
export async function createNewVersion(reportId, summaryOfChanges, changesMarked = null) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get current report to determine version
    const { data: report } = await supabase
      .from('end_project_reports')
      .select('version_no, date_of_this_revision')
      .eq('id', reportId)
      .single()

    if (!report) throw new Error('Report not found')

    // Increment version (minor version)
    const currentVersion = parseFloat(report.version_no || '1.0')
    const newVersion = (currentVersion + 0.1).toFixed(1)

    // Get previous revision date
    const { data: lastRevision } = await supabase
      .from('end_project_report_revision_history')
      .select('revision_date')
      .eq('end_project_report_id', reportId)
      .order('revision_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Create revision history entry
    const { data, error } = await supabase
      .from('end_project_report_revision_history')
      .insert({
        end_project_report_id: reportId,
        revision_date: new Date().toISOString().split('T')[0],
        previous_revision_date: lastRevision?.revision_date || report.date_of_this_revision,
        summary_of_changes: summaryOfChanges,
        changes_marked: changesMarked,
        revised_by: userData.user.id,
        version_no: newVersion
      })
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .single()

    if (error) throw error

    // Update report version
    await supabase
      .from('end_project_reports')
      .update({
        version_no: newVersion,
        date_of_this_revision: new Date().toISOString().split('T')[0]
      })
      .eq('id', reportId)

    return data
  } catch (error) {
    console.error('Error creating new version:', error)
    throw error
  }
}

/**
 * Get Version History
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Revision history
 */
export async function getVersionHistory(reportId) {
  try {
    const { data, error } = await supabase
      .from('end_project_report_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('end_project_report_id', reportId)
      .order('revision_date', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching version history:', error)
    throw error
  }
}

/**
 * Compare Versions
 * @param {string} reportId - Report ID
 * @param {string} version1 - First version
 * @param {string} version2 - Second version
 * @returns {Promise<Object>} Comparison data
 */
export async function compareVersions(reportId, version1, version2) {
  try {
    const { data: revisions, error } = await supabase
      .from('end_project_report_revision_history')
      .select('*')
      .eq('end_project_report_id', reportId)
      .in('version_no', [version1, version2])
      .order('revision_date', { ascending: false })

    if (error) throw error

    return {
      version1: revisions.find(r => r.version_no === version1),
      version2: revisions.find(r => r.version_no === version2),
      differences: {
        changes: revisions.map(r => r.summary_of_changes).join('\n\n')
      }
    }
  } catch (error) {
    console.error('Error comparing versions:', error)
    throw error
  }
}
