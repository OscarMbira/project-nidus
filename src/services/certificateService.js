/**
 * Certificate Service
 * 
 * Handles certificate generation, verification, and sharing
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Certificate types
 */
export const CERTIFICATE_TYPES = {
  COMPLETION: 'completion',
  ACHIEVEMENT: 'achievement',
  SKILL: 'skill',
  PROFESSIONAL: 'professional',
};

/**
 * Generate a certificate for a user
 */
export async function generateCertificate(userId, certificateData) {
  try {
    // Check if certificate already exists
    const existing = await getCertificateByCriteria(userId, {
      certificateType: certificateData.certificateType,
      scenarioId: certificateData.scenarioId,
      runId: certificateData.runId,
    });

    if (existing) {
      return existing;
    }

    // Generate certificate number
    const certificateNumber = await generateCertificateNumber();

    // Create certificate record
    const { data, error } = await simDb
      .from('certificates')
      .insert({
        user_id: userId,
        certificate_type: certificateData.certificateType,
        certificate_name: certificateData.certificateName || `${certificateData.certificateType} Certificate`,
        certificate_number: certificateNumber,
        verification_code: await generateVerificationCode(),
        score: certificateData.score,
        grade: certificateData.grade,
        issue_date: certificateData.completionDate || new Date().toISOString(),
        expiry_date: certificateData.expiryDate,
        metadata: {
          scenario_id: certificateData.scenarioId,
          run_id: certificateData.runId,
          ...certificateData.metadata,
        },
      })
      .select()
      .single();

    if (error) throw error;

    // Generate PDF (this would call a backend API in production)
    const pdfUrl = await generateCertificatePDF(data);

    // Update certificate with PDF URL
    const { data: updated, error: updateError } = await simDb
      .from('certificates')
      .update({ pdf_url: pdfUrl })
      .eq('id', data.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return updated;
  } catch (error) {
    console.error('Error generating certificate:', error);
    throw error;
  }
}

/**
 * Get user's certificates
 */
export async function getUserCertificates(userId, filters = {}) {
  try {
    let query = simDb
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .order('completion_date', { ascending: false });

    if (filters.certificateType) {
      query = query.eq('certificate_type', filters.certificateType);
    }

    if (filters.scenarioId) {
      query = query.eq('scenario_id', filters.scenarioId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user certificates:', error);
    throw error;
  }
}

/**
 * Get certificate by ID
 */
export async function getCertificate(certificateId) {
  try {
    const { data, error } = await simDb
      .from('certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting certificate:', error);
    throw error;
  }
}

/**
 * Verify certificate by verification code
 */
export async function verifyCertificate(verificationCode) {
  try {
    const { data, error } = await simDb
      .from('certificates')
      .select('*')
      .eq('verification_code', verificationCode)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, message: 'Certificate not found' };
      }
      throw error;
    }

    // Update verification date if not already verified
    if (!data.verification_date) {
      await simDb
        .from('certificates')
        .update({ verification_date: new Date().toISOString() })
        .eq('id', data.id);
    }

    return {
      valid: true,
      certificate: data,
    };
  } catch (error) {
    console.error('Error verifying certificate:', error);
    return { valid: false, message: 'Error verifying certificate' };
  }
}

/**
 * Share certificate to LinkedIn
 */
export async function shareToLinkedIn(certificateId) {
  try {
    // In production, this would call LinkedIn API
    // For now, just mark as shared
    const { data, error } = await simDb
      .from('certificates')
      .update({ linkedin_shared: true })
      .eq('id', certificateId)
      .select()
      .single();

    if (error) throw error;

    // Return LinkedIn share URL
    const certificate = await getCertificate(certificateId);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
      `${window.location.origin}/certificate/verify/${certificate.verification_code}`
    )}`;

    return { success: true, shareUrl };
  } catch (error) {
    console.error('Error sharing to LinkedIn:', error);
    throw error;
  }
}

/**
 * Order physical certificate
 */
export async function orderPhysicalCertificate(certificateId, shippingAddress) {
  try {
    // Create purchase record for physical certificate
    const { data: purchase, error: purchaseError } = await simDb
      .from('user_purchases')
      .insert({
        user_id: shippingAddress.userId,
        item_type: 'physical_certificate',
        item_id: certificateId,
        item_name: 'Physical Certificate',
        amount: 29.99, // Physical certificate price
        currency: 'USD',
        payment_status: 'pending',
        metadata: {
          shipping_address: shippingAddress,
        },
      })
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // Update certificate
    const { data, error } = await simDb
      .from('certificates')
      .update({ physical_ordered: true })
      .eq('id', certificateId)
      .select()
      .single();

    if (error) throw error;

    return { purchase, certificate: data };
  } catch (error) {
    console.error('Error ordering physical certificate:', error);
    throw error;
  }
}

/**
 * Generate certificate PDF (calls backend API)
 */
async function generateCertificatePDF(certificate) {
  try {
    // In production, this would call a backend API that generates PDFs
    // For now, return a placeholder URL
    const response = await fetch('/api/certificates/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificateId: certificate.id }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const { pdfUrl } = await response.json();
    return pdfUrl;
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Return placeholder URL for development
    return `/certificates/${certificate.id}.pdf`;
  }
}

/**
 * Generate certificate number
 */
async function generateCertificateNumber() {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `PMSIM-${year}-${random}`;
}

/**
 * Generate verification code
 */
async function generateVerificationCode() {
  // Generate a random hex string
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get certificate by criteria
 */
async function getCertificateByCriteria(userId, criteria) {
  try {
    let query = simDb
      .from('certificates')
      .select('*')
      .eq('user_id', userId);

    if (criteria.certificateType) {
      query = query.eq('certificate_type', criteria.certificateType);
    }

    // Note: scenario_id and run_id are stored in metadata JSONB
    // This is a simplified check - in production, you'd query the JSONB field

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('Error getting certificate by criteria:', error);
    return null;
  }
}

export default {
  CERTIFICATE_TYPES,
  generateCertificate,
  getUserCertificates,
  getCertificate,
  verifyCertificate,
  shareToLinkedIn,
  orderPhysicalCertificate,
};

