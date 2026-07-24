/**
 * CMS Communication Standards Service
 */

import { platformDb } from './supabaseClient';

export async function addStandard(cmsId, standardData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_communication_standards')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data, error } = await platformDb
      .from('cms_communication_standards')
      .insert({ ...standardData, cms_id: cmsId, display_order: standardData.display_order ?? nextOrder })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding standard:', error);
    throw error;
  }
}

export async function updateStandard(standardId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_standards')
      .update(updates)
      .eq('id', standardId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating standard:', error);
    throw error;
  }
}

export async function deleteStandard(standardId) {
  try {
    const { error } = await platformDb.from('cms_communication_standards').delete().eq('id', standardId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting standard:', error);
    throw error;
  }
}

export async function getStandards(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_communication_standards')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching standards:', error);
    throw error;
  }
}
