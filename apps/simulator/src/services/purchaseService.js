/**
 * Purchase Service
 * 
 * Handles one-time purchases: lifetime access, scenario packs, individual scenarios
 */

import { simDb } from './supabase/supabaseClient';
import { createPaymentIntent } from './stripeService';

/**
 * Purchase types
 */
export const PURCHASE_TYPES = {
  LIFETIME: 'lifetime',
  SCENARIO_PACK: 'scenario_pack',
  SCENARIO: 'scenario',
  CERTIFICATE: 'certificate',
  PHYSICAL_CERTIFICATE: 'physical_certificate',
};

/**
 * Create a purchase record
 */
export async function createPurchase(userId, purchaseData) {
  try {
    const { data, error } = await simDb
      .from('user_purchases')
      .insert({
        user_id: userId,
        item_type: purchaseData.itemType,
        item_id: purchaseData.itemId,
        item_name: purchaseData.itemName,
        amount: purchaseData.amount,
        currency: purchaseData.currency || 'USD',
        payment_provider: purchaseData.paymentProvider || 'stripe',
        payment_id: purchaseData.paymentId,
        payment_status: purchaseData.paymentStatus || 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating purchase record:', error);
    throw error;
  }
}

/**
 * Update purchase status
 */
export async function updatePurchaseStatus(purchaseId, status, updates = {}) {
  try {
    const updateData = {
      payment_status: status,
      ...updates,
    };

    const { data, error } = await simDb
      .from('user_purchases')
      .update(updateData)
      .eq('id', purchaseId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating purchase status:', error);
    throw error;
  }
}

/**
 * Get user's purchase history
 */
export async function getUserPurchases(userId, filters = {}) {
  try {
    let query = simDb
      .from('user_purchases')
      .select('*')
      .eq('user_id', userId)
      .order('purchased_at', { ascending: false });

    if (filters.itemType) {
      query = query.eq('item_type', filters.itemType);
    }

    if (filters.status) {
      query = query.eq('payment_status', filters.status);
    }

    if (filters.startDate) {
      query = query.gte('purchased_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('purchased_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting user purchases:', error);
    throw error;
  }
}

/**
 * Check if user owns an item
 */
export async function userOwnsItem(userId, itemType, itemId) {
  try {
    const { data, error } = await simDb
      .from('user_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('item_type', itemType)
      .eq('item_id', itemId)
      .eq('payment_status', 'completed')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return !!data;
  } catch (error) {
    console.error('Error checking item ownership:', error);
    return false;
  }
}

/**
 * Process lifetime access purchase
 */
export async function processLifetimePurchase(userId, tierId) {
  try {
    // Create payment intent
    const amount = tierId === 'lifetime_basic' ? 19999 : tierId === 'lifetime_professional' ? 29999 : 49999; // in cents
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      amount,
      'USD',
      userId,
      {
        item_type: 'lifetime',
        tier: tierId,
      }
    );

    // Create purchase record
    const purchase = await createPurchase(userId, {
      itemType: PURCHASE_TYPES.LIFETIME,
      itemName: `Lifetime Access - ${tierId}`,
      amount: amount / 100, // Convert to dollars
      currency: 'USD',
      paymentId: paymentIntentId,
      paymentStatus: 'pending',
    });

    return {
      purchaseId: purchase.id,
      clientSecret,
      paymentIntentId,
    };
  } catch (error) {
    console.error('Error processing lifetime purchase:', error);
    throw error;
  }
}

/**
 * Process scenario pack purchase
 */
export async function processScenarioPackPurchase(userId, packId) {
  try {
    // Get pack details
    const { data: pack, error: packError } = await simDb
      .from('scenario_packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (packError) throw packError;
    if (!pack) throw new Error('Scenario pack not found');

    // Check if already owned
    const ownsPack = await userOwnsItem(userId, PURCHASE_TYPES.SCENARIO_PACK, packId);
    if (ownsPack) {
      throw new Error('You already own this scenario pack');
    }

    // Create payment intent
    const amount = Math.round(pack.price * 100); // Convert to cents
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      amount,
      pack.currency || 'USD',
      userId,
      {
        item_type: 'scenario_pack',
        pack_id: packId,
      }
    );

    // Create purchase record
    const purchase = await createPurchase(userId, {
      itemType: PURCHASE_TYPES.SCENARIO_PACK,
      itemId: packId,
      itemName: pack.name,
      amount: pack.price,
      currency: pack.currency || 'USD',
      paymentId: paymentIntentId,
      paymentStatus: 'pending',
    });

    return {
      purchaseId: purchase.id,
      clientSecret,
      paymentIntentId,
      pack,
    };
  } catch (error) {
    console.error('Error processing scenario pack purchase:', error);
    throw error;
  }
}

/**
 * Process individual scenario purchase
 */
export async function processScenarioPurchase(userId, scenarioId) {
  try {
    // Get scenario details
    const { data: scenario, error: scenarioError } = await simDb
      .from('scenarios')
      .select('*')
      .eq('id', scenarioId)
      .single();

    if (scenarioError) throw scenarioError;
    if (!scenario) throw new Error('Scenario not found');

    // Check if already owned
    const ownsScenario = await userOwnsItem(userId, PURCHASE_TYPES.SCENARIO, scenarioId);
    if (ownsScenario) {
      throw new Error('You already own this scenario');
    }

    // Create payment intent (assuming scenario price is stored or default)
    const scenarioPrice = scenario.price || 4.99; // Default price if not set
    const amount = Math.round(scenarioPrice * 100); // Convert to cents
    const { clientSecret, paymentIntentId } = await createPaymentIntent(
      amount,
      'USD',
      userId,
      {
        item_type: 'scenario',
        scenario_id: scenarioId,
      }
    );

    // Create purchase record
    const purchase = await createPurchase(userId, {
      itemType: PURCHASE_TYPES.SCENARIO,
      itemId: scenarioId,
      itemName: scenario.name,
      amount: scenarioPrice,
      currency: 'USD',
      paymentId: paymentIntentId,
      paymentStatus: 'pending',
    });

    return {
      purchaseId: purchase.id,
      clientSecret,
      paymentIntentId,
      scenario,
    };
  } catch (error) {
    console.error('Error processing scenario purchase:', error);
    throw error;
  }
}

/**
 * Get all scenario packs
 */
export async function getScenarioPacks(filters = {}) {
  try {
    let query = simDb
      .from('scenario_packs')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (filters.industry) {
      query = query.eq('industry', filters.industry);
    }

    if (filters.featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting scenario packs:', error);
    throw error;
  }
}

/**
 * Get scenario pack details
 */
export async function getScenarioPack(packId) {
  try {
    const { data, error } = await simDb
      .from('scenario_packs')
      .select('*')
      .eq('id', packId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting scenario pack:', error);
    throw error;
  }
}

/**
 * Generate receipt for purchase
 */
export async function generateReceipt(purchaseId) {
  try {
    const { data: purchase, error } = await simDb
      .from('user_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (error) throw error;

    // In production, this would generate a PDF receipt
    // For now, return receipt data
    return {
      purchaseId: purchase.id,
      itemName: purchase.item_name,
      amount: purchase.amount,
      currency: purchase.currency,
      purchasedAt: purchase.purchased_at,
      receiptNumber: `RCP-${purchase.id.substring(0, 8).toUpperCase()}`,
      paymentId: purchase.payment_id,
    };
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw error;
  }
}

/**
 * Process refund
 */
export async function processRefund(purchaseId, refundAmount, reason) {
  try {
    const { data: purchase, error } = await simDb
      .from('user_purchases')
      .select('*')
      .eq('id', purchaseId)
      .single();

    if (error) throw error;

    if (purchase.payment_status !== 'completed') {
      throw new Error('Can only refund completed purchases');
    }

    // In production, this would call Stripe API to process refund
    // For now, update the purchase record
    const { data: updated, error: updateError } = await simDb
      .from('user_purchases')
      .update({
        payment_status: 'refunded',
        refund_amount: refundAmount || purchase.amount,
        refunded_at: new Date().toISOString(),
      })
      .eq('id', purchaseId)
      .select()
      .single();

    if (updateError) throw updateError;

    return updated;
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

export default {
  PURCHASE_TYPES,
  createPurchase,
  updatePurchaseStatus,
  getUserPurchases,
  userOwnsItem,
  processLifetimePurchase,
  processScenarioPackPurchase,
  processScenarioPurchase,
  getScenarioPacks,
  getScenarioPack,
  generateReceipt,
  processRefund,
};

