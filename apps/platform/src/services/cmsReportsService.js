/**
 * CMS Reports Service
 */

import { platformDb } from './supabaseClient';

export async function addReport(cmsId, reportData) {
  try {
    const { data: existing } = await platformDb
      .from('cms_reports')
      .select('display_order')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = existing && existing.length > 0 ? existing[0].display_order + 1 : 0;

    const { data, error } = await platformDb
      .from('cms_reports')
      .insert({ ...reportData, cms_id: cmsId, display_order: reportData.display_order ?? nextOrder })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding report:', error);
    throw error;
  }
}

export async function updateReport(reportId, updates) {
  try {
    const { data, error } = await platformDb
      .from('cms_reports')
      .update(updates)
      .eq('id', reportId)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating report:', error);
    throw error;
  }
}

export async function deleteReport(reportId) {
  try {
    const { error } = await platformDb.from('cms_reports').delete().eq('id', reportId);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting report:', error);
    throw error;
  }
}

export async function getReports(cmsId) {
  try {
    const { data, error } = await platformDb
      .from('cms_reports')
      .select('*')
      .eq('cms_id', cmsId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }
}

export async function getReportsByFrequency(cmsId, frequency) {
  try {
    const { data, error } = await platformDb
      .from('cms_reports')
      .select('*')
      .eq('cms_id', cmsId)
      .eq('frequency', frequency)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reports by frequency:', error);
    throw error;
  }
}
