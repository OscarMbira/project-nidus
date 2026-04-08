/**
 * Exception Report Version Service
 * Manages version control and revision history
 */

import { supabase } from './supabaseClient'

/**
 * Create New Version
 * @param {string} reportId - Report ID
 * @param {string} changesSummary - Summary of changes
 * @returns {Promise<Object>} New version record
 */
export async function createNewVersion(reportId, changesSummary) {
  try {
    const { data: userData } = await supabase.auth.getUser()
    if (!userData?.user) {
      throw new Error('User not authenticated')
    }

    // Get current report
    const { data: report } = await supabase
      .from('exception_reports')
      .select('version_no, date_of_this_revision')
      .eq('id', reportId)
      .single()

    if (!report) {
      throw new Error('Report not found')
    }

    // Increment version number
    const currentVersion = parseFloat(report.version_no || '1.0')
    const newVersion = (currentVersion + 0.1).toFixed(1)

    // Create revision history entry
    const { data: revision, error: revisionError } = await supabase
      .from('exception_report_revision_history')
      .insert({
        exception_report_id: reportId,
        revision_date: new Date().toISOString().split('T')[0],
        previous_revision_date: report.date_of_this_revision,
        summary_of_changes: changesSummary,
        revised_by: userData.user.id,
        version_no: newVersion
      })
      .select()
      .single()

    if (revisionError) throw revisionError

    // Update report version
    await supabase
      .from('exception_reports')
      .update({
        version_no: newVersion,
        date_of_this_revision: new Date().toISOString().split('T')[0],
        updated_by: userData.user.id
      })
      .eq('id', reportId)

    return revision
  } catch (error) {
    console.error('Error creating new version:', error)
    throw error
  }
}

/**
 * Get Version History
 * @param {string} reportId - Report ID
 * @returns {Promise<Array>} Version history
 */
export async function getVersionHistory(reportId) {
  try {
    const { data, error } = await supabase
      .from('exception_report_revision_history')
      .select(`
        *,
        revised_by_user:revised_by(id, full_name, email)
      `)
      .eq('exception_report_id', reportId)
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
 * @param {string} versionId1 - First version revision ID
 * @param {string} versionId2 - Second version revision ID
 * @returns {Promise<Object>} Comparison data
 */
export async function compareVersions(versionId1, versionId2) {
  try {
    const { data: version1 } = await supabase
      .from('exception_report_revision_history')
      .select('*')
      .eq('id', versionId1)
      .single()

    const { data: version2 } = await supabase
      .from('exception_report_revision_history')
      .select('*')
      .eq('id', versionId2)
      .single()

    if (!version1 || !version2) {
      throw new Error('One or both versions not found')
    }

    return {
      version1: {
        version_no: version1.version_no,
        revision_date: version1.revision_date,
        summary_of_changes: version1.summary_of_changes,
        changes_marked: version1.changes_marked
      },
      version2: {
        version_no: version2.version_no,
        revision_date: version2.revision_date,
        summary_of_changes: version2.summary_of_changes,
        changes_marked: version2.changes_marked
      },
      comparison: {
        versions_apart: Math.abs(parseFloat(version1.version_no) - parseFloat(version2.version_no)),
        days_apart: Math.abs(
          Math.floor(
            (new Date(version1.revision_date) - new Date(version2.revision_date)) / (1000 * 60 * 60 * 24)
          )
        )
      }
    }
  } catch (error) {
    console.error('Error comparing versions:', error)
    throw error
  }
}
