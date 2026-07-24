/**
 * CMS Tools and Technologies Service
 */

import { platformDb } from './supabaseClient';

export async function addTool(cmsId, toolData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_tools_technologies')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data, error } = await platformDb
      .from('cms_tools_technologies')
      .insert({ ...toolData, cms_id: cmsId, display_order: toolData.display_order ?? nextOrder })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding tool:', error);
    throw error;
  }
}

export async function updateTool(toolId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_tools_technologies')
      .update(updates)
      .eq('id', toolId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating tool:', error);
    throw error;
  }
}

export async function deleteTool(toolId) {
  try {
    const { error } = await platformDb.from('cms_tools_technologies').delete().eq('id', toolId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting tool:', error);
    throw error;
  }
}

export async function getTools(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_tools_technologies')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
}
