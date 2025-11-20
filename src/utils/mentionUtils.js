/**
 * Mention Utilities
 * Handles @mention parsing and notification creation
 */

import { supabase } from '../services/supabaseClient'

/**
 * Parse text for @mentions
 * @param {string} text - Text to parse
 * @returns {Array} Array of mention objects {username, position, length}
 */
export function parseMentions(text) {
  if (!text) return []
  
  const mentionRegex = /@(\w+)/g
  const mentions = []
  let match

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push({
      username: match[1],
      position: match.index,
      length: match[0].length,
      fullMatch: match[0],
    })
  }

  return mentions
}

/**
 * Create mentions from text
 * @param {string} text - Text containing mentions
 * @param {string} mentionType - Type of mention (comment, task_description, etc.)
 * @param {string} sourceType - Source entity type (comment, task, etc.)
 * @param {string} sourceId - Source entity ID
 * @param {string} projectId - Project ID
 * @param {string} mentionedById - User ID who created the mention
 */
export async function createMentions(text, mentionType, sourceType, sourceId, projectId, mentionedById) {
  const mentions = parseMentions(text)
  if (mentions.length === 0) return []

  try {
    // Get mentioned user IDs
    const usernames = mentions.map(m => m.username)
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('email', usernames)
      .or(usernames.map(u => `username.eq.${u}`).join(','))

    if (userError) throw userError

    // Get mentioned by user info
    const { data: mentionedByUser } = await supabase
      .from('users')
      .select('id, email, full_name')
      .eq('id', mentionedById)
      .single()

    const createdMentions = []

    // Create mention records and notifications
    for (const mention of mentions) {
      const user = users?.find(u => 
        u.email === mention.username || 
        u.username === mention.username
      )

      if (!user) continue

      // Create mention record
      const { data: mentionRecord, error: mentionError } = await supabase
        .from('mentions')
        .insert({
          mentioned_user_id: user.id,
          mention_type: mentionType,
          mention_source_type: sourceType,
          mention_source_id: sourceId,
          mention_text: text,
          mention_position: mention.position,
          project_id: projectId,
          mentioned_by_id: mentionedById,
          mentioned_by_name: mentionedByUser?.full_name || mentionedByUser?.email,
        })
        .select()
        .single()

      if (mentionError) {
        console.error('Error creating mention:', mentionError)
        continue
      }

      // Create notification for mention
      const { data: notification, error: notifError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          notification_type: 'mention',
          title: `You were mentioned by ${mentionedByUser?.full_name || 'someone'}`,
          message: `You were mentioned in a ${mentionType}: "${text.substring(0, 100)}..."`,
          related_entity_type: sourceType,
          related_entity_id: sourceId,
          project_id: projectId,
          sender_id: mentionedById,
          sender_name: mentionedByUser?.full_name || mentionedByUser?.email,
          action_url: getActionUrl(sourceType, sourceId, projectId),
          action_label: 'View',
          priority: 2, // Medium priority
        })
        .select()
        .single()

      if (notifError) {
        console.error('Error creating mention notification:', notifError)
      } else {
        // Update mention with notification ID
        await supabase
          .from('mentions')
          .update({
            notification_id: notification.id,
            notification_sent: true,
          })
          .eq('id', mentionRecord.id)
      }

      createdMentions.push(mentionRecord)
    }

    return createdMentions
  } catch (error) {
    console.error('Error creating mentions:', error)
    return []
  }
}

/**
 * Get action URL based on entity type
 */
function getActionUrl(entityType, entityId, projectId) {
  const urlMap = {
    'comment': `/projects/${projectId}`,
    'task': `/projects/${projectId}/tasks/${entityId}`,
    'document': `/projects/${projectId}/documents/${entityId}`,
    'issue': `/projects/${projectId}/issues/${entityId}`,
    'risk': `/projects/${projectId}/risks/${entityId}`,
  }
  return urlMap[entityType] || `/projects/${projectId}`
}

/**
 * Highlight mentions in text
 * @param {string} text - Text to highlight
 * @returns {string} HTML string with highlighted mentions
 */
export function highlightMentions(text) {
  if (!text) return ''
  
  const mentionRegex = /@(\w+)/g
  return text.replace(mentionRegex, '<span class="mention">@$1</span>')
}

/**
 * Get user suggestions for mention autocomplete
 * @param {string} query - Search query
 * @param {string} projectId - Optional project ID to filter by project members
 */
export async function getUserSuggestions(query, projectId = null) {
  try {
    let userQuery = supabase
      .from('users')
      .select('id, email, full_name, username')
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,username.ilike.%${query}%`)
      .eq('is_active', true)
      .limit(10)

    // If projectId provided, filter by project members
    if (projectId) {
      // This would require a join with project_members or similar
      // For now, just return all matching users
    }

    const { data, error } = await userQuery

    if (error) throw error

    return (data || []).map(user => ({
      id: user.id,
      email: user.email,
      name: user.full_name || user.email,
      username: user.username || user.email.split('@')[0],
    }))
  } catch (error) {
    console.error('Error fetching user suggestions:', error)
    return []
  }
}

