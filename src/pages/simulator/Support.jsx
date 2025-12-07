import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { HelpCircle, MessageSquare, Search, Send, CheckCircle } from 'lucide-react';
import { createSupportTicket, searchFAQs, getFAQCategories } from '../../services/supportService';
import { simDb } from '../../services/supabase/supabaseClient';

const Support = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('faq');
  const [searchQuery, setSearchQuery] = useState('');
  const [faqResults, setFaqResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'normal',
  });
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const [userId, setUserId] = useState(null);

  React.useEffect(() => {
    getCurrentUser();
    loadCategories();
  }, []);

  React.useEffect(() => {
    if (searchQuery) {
      handleSearch();
    } else {
      setFaqResults([]);
    }
  }, [searchQuery]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadCategories = async () => {
    const cats = await getFAQCategories();
    setCategories(cats);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setFaqResults([]);
      return;
    }
    const results = await searchFAQs(searchQuery);
    setFaqResults(results);
  };

  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!userId) {
      alert('Please log in to submit a support ticket');
      return;
    }

    try {
      await createSupportTicket(
        userId,
        ticketForm.subject,
        ticketForm.description,
        ticketForm.category,
        ticketForm.priority
      );
      setTicketSubmitted(true);
      setTicketForm({
        subject: '',
        description: '',
        category: 'general',
        priority: 'normal',
      });
      setTimeout(() => setTicketSubmitted(false), 5000);
    } catch (error) {
      console.error('Error submitting ticket:', error);
      alert('Failed to submit ticket. Please try again.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <h1 className="text-2xl font-bold mb-2">Support Center</h1>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Find answers or contact our support team
        </p>
      </div>

      {/* Tabs */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex space-x-4 border-b mb-6">
          <button
            onClick={() => setActiveTab('faq')}
            className={`pb-3 px-4 font-medium ${
              activeTab === 'faq'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <HelpCircle className="w-5 h-5 inline mr-2" />
            FAQ
          </button>
          <button
            onClick={() => setActiveTab('ticket')}
            className={`pb-3 px-4 font-medium ${
              activeTab === 'ticket'
                ? 'border-b-2 border-blue-500 text-blue-500'
                : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            <MessageSquare className="w-5 h-5 inline mr-2" />
            Submit Ticket
          </button>
        </div>

        {/* FAQ Tab */}
        {activeTab === 'faq' && (
          <div>
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search FAQs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {faqResults.length > 0 ? (
              <div className="space-y-4">
                {faqResults.map((faq) => (
                  <div
                    key={faq.id}
                    className={`p-4 rounded-lg border ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <h3 className="font-semibold mb-2">{faq.question}</h3>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            ) : searchQuery ? (
              <p className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                No FAQs found for "{searchQuery}"
              </p>
            ) : (
              <div>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Search for frequently asked questions or browse by category:
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSearchQuery(cat.name)}
                      className={`p-4 rounded-lg border text-left ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <h3 className="font-medium">{cat.name}</h3>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ticket Tab */}
        {activeTab === 'ticket' && (
          <form onSubmit={handleSubmitTicket} className="space-y-4">
            {ticketSubmitted && (
              <div className="p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-700 rounded-lg flex items-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                <span className="text-green-800 dark:text-green-200">
                  Ticket submitted successfully! We'll respond within 24 hours.
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                required
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={ticketForm.category}
                onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="general">General</option>
                <option value="technical">Technical Issue</option>
                <option value="billing">Billing</option>
                <option value="account">Account</option>
                <option value="feature">Feature Request</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Priority</label>
              <select
                value={ticketForm.priority}
                onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                required
                rows={6}
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                placeholder="Please provide as much detail as possible..."
              />
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 flex items-center justify-center"
            >
              <Send className="w-5 h-5 mr-2" />
              Submit Ticket
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Support;

