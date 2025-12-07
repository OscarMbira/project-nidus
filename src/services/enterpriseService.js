/**
 * Enterprise Service
 * 
 * Handles white-label configuration, LMS integration, API management, SSO, and analytics exports
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Get white-label configuration for organization
 */
export async function getWhiteLabelConfig(organizationId) {
  try {
    const { data, error } = await simDb
      .rpc('get_white_label_config', {
        organization_id_param: organizationId,
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting white-label config:', error);
    throw error;
  }
}

/**
 * Update white-label configuration
 */
export async function updateWhiteLabelConfig(organizationId, config) {
  try {
    // Check if config exists
    const { data: existing } = await simDb
      .from('white_label_configs')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await simDb
        .from('white_label_configs')
        .update({
          ...config,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new
      const { data, error } = await simDb
        .from('white_label_configs')
        .insert({
          organization_id: organizationId,
          ...config,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return result;
  } catch (error) {
    console.error('Error updating white-label config:', error);
    throw error;
  }
}

/**
 * Get LMS integrations for organization
 */
export async function getLMSIntegrations(organizationId) {
  try {
    const { data, error } = await simDb
      .from('lms_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting LMS integrations:', error);
    throw error;
  }
}

/**
 * Create LMS integration
 */
export async function createLMSIntegration(organizationId, integrationData) {
  try {
    const { data, error } = await simDb
      .from('lms_integrations')
      .insert({
        organization_id: organizationId,
        ...integrationData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating LMS integration:', error);
    throw error;
  }
}

/**
 * Test LMS connection
 */
export async function testLMSConnection(integrationId) {
  try {
    // In production, this would call a backend API to test the connection
    const response = await fetch('/api/lms/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ integrationId }),
    });

    if (!response.ok) {
      throw new Error('Connection test failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error testing LMS connection:', error);
    throw error;
  }
}

/**
 * Generate SCORM package
 */
export async function generateSCORMPackage(scenarioId, version = '1.2') {
  try {
    const response = await fetch('/api/lms/generate-scorm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId, version }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate SCORM package');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    return url;
  } catch (error) {
    console.error('Error generating SCORM package:', error);
    throw error;
  }
}

/**
 * Get API keys for user/organization
 */
export async function getAPIKeys(organizationId = null, userId = null) {
  try {
    let query = simDb
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting API keys:', error);
    throw error;
  }
}

/**
 * Create API key
 */
export async function createAPIKey(organizationId, userId, keyData) {
  try {
    // In production, this would call a backend API to generate and hash the key
    const response = await fetch('/api/keys/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        organizationId,
        userId,
        ...keyData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create API key');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating API key:', error);
    throw error;
  }
}

/**
 * Revoke API key
 */
export async function revokeAPIKey(keyId) {
  try {
    const { data, error } = await simDb
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error revoking API key:', error);
    throw error;
  }
}

/**
 * Get API usage statistics
 */
export async function getAPIUsageStats(apiKeyId, period = '24h') {
  try {
    const { data, error } = await simDb
      .from('api_usage_stats')
      .select('*')
      .eq('api_key_id', apiKeyId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting API usage stats:', error);
    throw error;
  }
}

/**
 * Get SSO configurations
 */
export async function getSSOConfigurations(organizationId) {
  try {
    const { data, error } = await simDb
      .from('sso_configurations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting SSO configurations:', error);
    throw error;
  }
}

/**
 * Create SSO configuration
 */
export async function createSSOConfiguration(organizationId, ssoData) {
  try {
    const { data, error } = await simDb
      .from('sso_configurations')
      .insert({
        organization_id: organizationId,
        ...ssoData,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating SSO configuration:', error);
    throw error;
  }
}

/**
 * Test SSO connection
 */
export async function testSSOConnection(configurationId) {
  try {
    const response = await fetch('/api/sso/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ configurationId }),
    });

    if (!response.ok) {
      throw new Error('SSO connection test failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Error testing SSO connection:', error);
    throw error;
  }
}

/**
 * Create analytics export job
 */
export async function createAnalyticsExport(organizationId, userId, exportConfig) {
  try {
    const { data, error } = await simDb
      .from('analytics_export_jobs')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        export_type: exportConfig.type,
        export_format: exportConfig.format || {},
        filters: exportConfig.filters || {},
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger export processing (would call backend API)
    fetch('/api/analytics/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: data.id }),
    }).catch(err => console.error('Error triggering export:', err));

    return data;
  } catch (error) {
    console.error('Error creating analytics export:', error);
    throw error;
  }
}

/**
 * Get analytics export jobs
 */
export async function getAnalyticsExports(organizationId, userId = null) {
  try {
    let query = simDb
      .from('analytics_export_jobs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting analytics exports:', error);
    throw error;
  }
}

export default {
  getWhiteLabelConfig,
  updateWhiteLabelConfig,
  getLMSIntegrations,
  createLMSIntegration,
  testLMSConnection,
  generateSCORMPackage,
  getAPIKeys,
  createAPIKey,
  revokeAPIKey,
  getAPIUsageStats,
  getSSOConfigurations,
  createSSOConfiguration,
  testSSOConnection,
  createAnalyticsExport,
  getAnalyticsExports,
};

