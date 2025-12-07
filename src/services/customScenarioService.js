/**
 * Custom Scenario Service
 * 
 * Handles custom scenario creation, upload, NLP extraction, validation, and sharing
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Upload a document for scenario extraction
 */
export async function uploadScenarioDocument(userId, file, sourceType = 'document') {
  try {
    // Upload file to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data: uploadData, error: uploadError } = await simDb.storage
      .from('scenario-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = simDb.storage
      .from('scenario-documents')
      .getPublicUrl(fileName);

    // Create custom scenario record
    const { data, error } = await simDb
      .from('custom_scenarios')
      .insert({
        user_id: userId,
        name: file.name,
        source_type: sourceType,
        original_file_url: publicUrl,
        validation_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger NLP extraction (this would call a backend API in production)
    await triggerNLPExtraction(data.id);

    return data;
  } catch (error) {
    console.error('Error uploading scenario document:', error);
    throw error;
  }
}

/**
 * Upload text content for scenario extraction
 */
export async function uploadScenarioText(userId, text, name) {
  try {
    const { data, error } = await simDb
      .from('custom_scenarios')
      .insert({
        user_id: userId,
        name: name || 'Custom Scenario',
        source_type: 'text',
        original_content: text,
        validation_status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger NLP extraction
    await triggerNLPExtraction(data.id);

    return data;
  } catch (error) {
    console.error('Error uploading scenario text:', error);
    throw error;
  }
}

/**
 * Trigger NLP extraction (calls backend API)
 */
async function triggerNLPExtraction(scenarioId) {
  try {
    // In production, this would call a backend API that processes the document
    const response = await fetch('/api/scenarios/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });

    if (!response.ok) {
      throw new Error('Failed to trigger extraction');
    }

    return await response.json();
  } catch (error) {
    console.error('Error triggering NLP extraction:', error);
    // Continue anyway - extraction will happen asynchronously
  }
}

/**
 * Get user's custom scenarios
 */
export async function getUserCustomScenarios(userId, filters = {}) {
  try {
    let query = simDb
      .from('custom_scenarios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.validationStatus) {
      query = query.eq('validation_status', filters.validationStatus);
    }

    if (filters.isPublic !== undefined) {
      query = query.eq('is_public', filters.isPublic);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting custom scenarios:', error);
    throw error;
  }
}

/**
 * Get custom scenario by ID
 */
export async function getCustomScenario(scenarioId) {
  try {
    const { data, error } = await simDb
      .from('custom_scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting custom scenario:', error);
    throw error;
  }
}

/**
 * Update custom scenario
 */
export async function updateCustomScenario(scenarioId, updates) {
  try {
    const { data, error } = await simDb
      .from('custom_scenarios')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scenarioId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating custom scenario:', error);
    throw error;
  }
}

/**
 * Validate custom scenario
 */
export async function validateCustomScenario(scenarioId) {
  try {
    // Update status to processing
    await updateCustomScenario(scenarioId, { validation_status: 'processing' });

    // In production, this would call a backend API for validation
    const response = await fetch('/api/scenarios/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenarioId }),
    });

    if (!response.ok) {
      throw new Error('Validation failed');
    }

    const validationResult = await response.json();

    // Update scenario with validation results
    const updates = {
      validation_status: validationResult.isValid ? 'valid' : 'invalid',
      validation_errors: validationResult.errors || [],
      extracted_data: validationResult.extractedData || {},
    };

    return await updateCustomScenario(scenarioId, updates);
  } catch (error) {
    console.error('Error validating custom scenario:', error);
    await updateCustomScenario(scenarioId, { validation_status: 'invalid' });
    throw error;
  }
}

/**
 * Calculate scenario quality score
 */
export async function calculateQualityScore(scenarioId) {
  try {
    const scenario = await getCustomScenario(scenarioId);

    if (!scenario.extracted_data || Object.keys(scenario.extracted_data).length === 0) {
      return 0;
    }

    let score = 0;
    const maxScore = 100;

    // Check required fields (40 points)
    const requiredFields = ['name', 'description', 'industry', 'methodology', 'difficulty_level'];
    const hasRequired = requiredFields.filter(field => 
      scenario.extracted_data[field] || scenario[field]
    ).length;
    score += (hasRequired / requiredFields.length) * 40;

    // Check description quality (20 points)
    const description = scenario.description || scenario.extracted_data.description || '';
    if (description.length > 200) score += 20;
    else if (description.length > 100) score += 15;
    else if (description.length > 50) score += 10;

    // Check learning objectives (20 points)
    const learningObjectives = scenario.extracted_data.learning_objectives || [];
    if (learningObjectives.length >= 5) score += 20;
    else if (learningObjectives.length >= 3) score += 15;
    else if (learningObjectives.length >= 1) score += 10;

    // Check skills covered (20 points)
    const skills = scenario.extracted_data.skills_covered || [];
    if (skills.length >= 5) score += 20;
    else if (skills.length >= 3) score += 15;
    else if (skills.length >= 1) score += 10;

    return Math.min(Math.round(score), maxScore);
  } catch (error) {
    console.error('Error calculating quality score:', error);
    return 0;
  }
}

/**
 * Publish custom scenario (make it public)
 */
export async function publishCustomScenario(scenarioId) {
  try {
    // Validate first
    const scenario = await getCustomScenario(scenarioId);
    
    if (scenario.validation_status !== 'valid') {
      throw new Error('Scenario must be validated before publishing');
    }

    // Calculate quality score
    const qualityScore = await calculateQualityScore(scenarioId);

    // Update scenario
    const { data, error } = await simDb
      .from('custom_scenarios')
      .update({
        is_public: true,
        is_approved: qualityScore >= 70, // Auto-approve if quality score is high
        updated_at: new Date().toISOString(),
      })
      .eq('id', scenarioId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error publishing custom scenario:', error);
    throw error;
  }
}

/**
 * Get public custom scenarios
 */
export async function getPublicCustomScenarios(filters = {}) {
  try {
    let query = simDb
      .from('custom_scenarios')
      .select('*')
      .eq('is_public', true)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });

    if (filters.industry) {
      query = query.eq('extracted_data->>industry', filters.industry);
    }

    if (filters.methodology) {
      query = query.eq('extracted_data->>methodology', filters.methodology);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting public custom scenarios:', error);
    throw error;
  }
}

/**
 * Convert custom scenario to regular scenario
 */
export async function convertToRegularScenario(customScenarioId) {
  try {
    const customScenario = await getCustomScenario(customScenarioId);

    if (customScenario.validation_status !== 'valid') {
      throw new Error('Scenario must be validated before conversion');
    }

    // Extract data
    const extracted = customScenario.extracted_data || {};

    // Create regular scenario
    const { data, error } = await simDb
      .from('scenarios')
      .insert({
        name: extracted.name || customScenario.name,
        short_description: extracted.short_description || extracted.description?.substring(0, 200),
        description: extracted.description || '',
        industry: extracted.industry || 'General',
        methodology: extracted.methodology || 'Hybrid',
        difficulty_level: extracted.difficulty_level || 'intermediate',
        duration_minutes: extracted.duration_minutes || 60,
        target_role: extracted.target_role || 'project_manager',
        is_premium: false,
        is_active: true,
        learning_objectives: extracted.learning_objectives || [],
        skills_covered: extracted.skills_covered || [],
        scenario_data: extracted.scenario_data || {},
        created_by: customScenario.user_id,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error converting to regular scenario:', error);
    throw error;
  }
}

export default {
  uploadScenarioDocument,
  uploadScenarioText,
  getUserCustomScenarios,
  getCustomScenario,
  updateCustomScenario,
  validateCustomScenario,
  calculateQualityScore,
  publishCustomScenario,
  getPublicCustomScenarios,
  convertToRegularScenario,
};

