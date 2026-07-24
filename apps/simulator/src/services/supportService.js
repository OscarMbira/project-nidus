/**
 * Support Service
 * 
 * Handles support tickets, FAQs, and help requests
 */

import { simDb } from './supabase/supabaseClient';

/**
 * Create support ticket
 */
export async function createSupportTicket(userId, subject, description, category = 'general', priority = 'normal') {
  try {
    // In production, this would create a ticket in support system
    const ticket = {
      user_id: userId,
      subject,
      description,
      category,
      priority,
      status: 'open',
      created_at: new Date().toISOString(),
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log('Support Ticket Created:', ticket);
    }

    // In production, send to support backend
    // const { data, error } = await simDb
    //   .from('support_tickets')
    //   .insert(ticket)
    //   .select()
    //   .single();

    // if (error) throw error;

    return ticket;
  } catch (error) {
    console.error('Error creating support ticket:', error);
    throw error;
  }
}

/**
 * Get user's support tickets
 */
export async function getUserTickets(userId) {
  try {
    // In production, fetch from support_tickets table
    // const { data, error } = await simDb
    //   .from('support_tickets')
    //   .select('*')
    //   .eq('user_id', userId)
    //   .order('created_at', { ascending: false });

    // if (error) throw error;

    // For now, return empty array
    return [];
  } catch (error) {
    console.error('Error getting user tickets:', error);
    throw error;
  }
}

/**
 * Get ticket by ID
 */
export async function getTicket(ticketId) {
  try {
    // In production, fetch from support_tickets table
    // const { data, error } = await simDb
    //   .from('support_tickets')
    //   .select('*, responses(*)')
    //   .eq('id', ticketId)
    //   .single();

    // if (error) throw error;

    return null;
  } catch (error) {
    console.error('Error getting ticket:', error);
    throw error;
  }
}

/**
 * Add response to ticket
 */
export async function addTicketResponse(ticketId, userId, message, isStaff = false) {
  try {
    const response = {
      ticket_id: ticketId,
      user_id: userId,
      message,
      is_staff: isStaff,
      created_at: new Date().toISOString(),
    };

    // In production, insert into support_ticket_responses table
    // const { data, error } = await simDb
    //   .from('support_ticket_responses')
    //   .insert(response)
    //   .select()
    //   .single();

    // if (error) throw error;

    return response;
  } catch (error) {
    console.error('Error adding ticket response:', error);
    throw error;
  }
}

/**
 * Search FAQs
 */
export async function searchFAQs(query) {
  try {
    // In production, this would search FAQ database
    // For now, return mock results
    const faqs = [
      {
        id: 1,
        question: 'How do I start a simulation?',
        answer: 'Navigate to Scenarios, choose a scenario, select your role, and click Start Simulation.',
        category: 'getting_started',
      },
      {
        id: 2,
        question: 'What score do I need for a certificate?',
        answer: 'You need a minimum score of 80% to earn a certificate.',
        category: 'certificates',
      },
      {
        id: 3,
        question: 'Can I pause a simulation?',
        answer: 'Yes, your progress is saved automatically. You can resume from where you left off.',
        category: 'simulations',
      },
    ];

    // Simple text search
    const filtered = faqs.filter(faq => 
      faq.question.toLowerCase().includes(query.toLowerCase()) ||
      faq.answer.toLowerCase().includes(query.toLowerCase())
    );

    return filtered;
  } catch (error) {
    console.error('Error searching FAQs:', error);
    return [];
  }
}

/**
 * Get FAQ categories
 */
export async function getFAQCategories() {
  return [
    { id: 'getting_started', name: 'Getting Started' },
    { id: 'simulations', name: 'Simulations' },
    { id: 'subscriptions', name: 'Subscriptions' },
    { id: 'certificates', name: 'Certificates' },
    { id: 'technical', name: 'Technical Issues' },
    { id: 'account', name: 'Account & Billing' },
  ];
}

export default {
  createSupportTicket,
  getUserTickets,
  getTicket,
  addTicketResponse,
  searchFAQs,
  getFAQCategories,
};

