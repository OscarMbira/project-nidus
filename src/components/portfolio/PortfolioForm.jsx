import { useState, useEffect, useRef } from 'react';
import { X, Save, FolderKanban, User, DollarSign, Calendar, Target, Trash2, Info } from 'lucide-react';
import { savePortfolio } from '../../services/portfolioService';
import { platformDb } from '../../services/supabase/supabaseClient';
import { getPortfolioCategories } from '../../services/portfolioCategoryService';
import { getBudgetCategories } from '../../services/budgetCategoryService';
import { getFundingSources } from '../../services/fundingSourceService';
import { SmartAmountInput } from '../ui/SmartAmountInput';
import SearchableSelect from '../ui/SearchableSelect';

export default function PortfolioForm({ portfolio, onSave, onCancel, useModalLayout = true, readOnly = false }) {
  const [formData, setFormData] = useState({
    portfolio_code: '',
    portfolio_name: '',
    portfolio_description: '',
    portfolio_vision: '',
    portfolio_mission: '',
    portfolio_goals: [],
    portfolio_type: 'strategic',
    portfolio_category: '',
    portfolio_owner_user_id: '',
    portfolio_manager_user_id: '',
    portfolio_start_date: '',
    portfolio_end_date: '',
    portfolio_status: 'planning',
    parent_portfolio_id: '',
    total_budget: '',
    budget_currency: 'USD',
    governance_model: 'centralized',
    review_frequency: 'monthly',
    tags: [],
  });

  const [users, setUsers] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [budgetItems, setBudgetItems] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [fundingSources, setFundingSources] = useState([]);
  const [saveError, setSaveError] = useState(null);
  const savingRef = useRef(false);

  // Safety net: if saving stays true too long (e.g. promise never resolves), force unstick
  useEffect(() => {
    if (!saving) return;
    const t = setTimeout(() => {
      savingRef.current = false;
      setSaving(false);
      setSaveError(prev => prev || 'Save timed out. Please try again.');
    }, 22000);
    return () => clearTimeout(t);
  }, [saving]);

  const budgetTotalsByCurrency = budgetItems.reduce((acc, item) => {
    const amountNum =
      typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
    if (!Number.isFinite(amountNum)) {
      return acc;
    }
    const currency = (item.currency || formData.budget_currency || 'USD').toUpperCase();
    acc[currency] = (acc[currency] || 0) + amountNum;
    return acc;
  }, {});

  useEffect(() => {
    const init = async () => {
      if (portfolio) {
        // Normalize portfolio_goals into an array of strings
        let goals = []
        const rawGoals = portfolio.portfolio_goals
        if (Array.isArray(rawGoals)) {
          goals = rawGoals.map(g => (g == null ? '' : String(g)))
        } else if (typeof rawGoals === 'string' && rawGoals.trim()) {
          try {
            const parsed = JSON.parse(rawGoals)
            if (Array.isArray(parsed)) {
              goals = parsed.map(g => (g == null ? '' : String(g)))
            } else {
              goals = [rawGoals.trim()]
            }
          } catch {
            goals = rawGoals
              .split('\n')
              .map(t => t.trim())
              .filter(Boolean)
          }
        }
        setFormData({
          portfolio_code: portfolio.portfolio_code || '',
          portfolio_name: portfolio.portfolio_name || '',
          portfolio_description: portfolio.portfolio_description || '',
          portfolio_vision: portfolio.portfolio_vision || '',
          portfolio_mission: portfolio.portfolio_mission || '',
          portfolio_goals: goals,
          portfolio_type: portfolio.portfolio_type || 'strategic',
          portfolio_category: portfolio.portfolio_category || '',
          portfolio_owner_user_id: portfolio.portfolio_owner_user_id || '',
          portfolio_manager_user_id: portfolio.portfolio_manager_user_id || '',
          portfolio_start_date: portfolio.portfolio_start_date || '',
          portfolio_end_date: portfolio.portfolio_end_date || '',
          portfolio_status: portfolio.portfolio_status || 'planning',
          parent_portfolio_id: portfolio.parent_portfolio_id || '',
          total_budget: portfolio.total_budget || '',
          budget_currency: portfolio.budget_currency || 'USD',
          governance_model: portfolio.governance_model || 'centralized',
          review_frequency: portfolio.review_frequency || 'monthly',
          tags: portfolio.tags || [],
        });
        const existingBudgetItems = portfolio.custom_fields?.portfolio_budget_items;
        if (Array.isArray(existingBudgetItems) && existingBudgetItems.length) {
          setBudgetItems(
            existingBudgetItems.map((item) => ({
              category_name: item.category_name || '',
              amount:
                item.amount !== null && item.amount !== undefined && item.amount !== ''
                  ? Number(item.amount)
                  : '',
              currency: (item.currency || portfolio.budget_currency || 'USD').toUpperCase(),
              funding_source_id: item.funding_source_id || '',
            })),
          );
        } else if (portfolio.total_budget) {
          setBudgetItems([
            {
              category_name: '',
              amount: Number(portfolio.total_budget),
              currency: (portfolio.budget_currency || 'USD').toUpperCase(),
              funding_source_id: '',
            },
          ]);
        } else {
          setBudgetItems([]);
        }
        await fetchLookupData(setCategoriesLoading);
      } else {
        setBudgetItems([]);
        // Start loading lookups immediately (in parallel with code RPC) so Category dropdown is ready on first click
        fetchLookupData(setCategoriesLoading);
        // Auto-generate a default portfolio code for new portfolios (editable by user)
        try {
          const { data, error } = await platformDb.rpc('generate_portfolio_code');
          if (!error && data && !formData.portfolio_code) {
            setFormData(prev => ({
              ...prev,
              portfolio_code: data,
            }));
          }
        } catch (err) {
          console.error('Error auto-generating portfolio code:', err);
        }
      }
    };

    init();
  }, [portfolio]);

  const fetchLookupData = async (setCategoriesLoadingFn) => {
    try {
      if (setCategoriesLoadingFn) setCategoriesLoadingFn(true);
      // Fetch all lookups in parallel so Category dropdown is ready as fast as possible
      const [usersRes, portfoliosRes, catRes, budgetCatRes, fundingRes] = await Promise.all([
        platformDb.from('users').select('id, email, full_name').eq('is_active', true).eq('is_deleted', false).order('full_name', { ascending: true }),
        platformDb.from('portfolios').select('id, portfolio_name, portfolio_code').eq('is_deleted', false).order('portfolio_name', { ascending: true }),
        getPortfolioCategories({ activeOnly: true }),
        getBudgetCategories({ activeOnly: true }),
        getFundingSources({ activeOnly: true }),
      ]);

      if (usersRes?.data) setUsers(usersRes.data);
      if (portfoliosRes?.data) setPortfolios(portfoliosRes.data.filter(p => p.id !== portfolio?.id));
      if (catRes?.success && Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }
      if (setCategoriesLoadingFn) setCategoriesLoadingFn(false);

      if (budgetCatRes?.success && Array.isArray(budgetCatRes.data)) setBudgetCategories(budgetCatRes.data);
      if (fundingRes?.success && Array.isArray(fundingRes.data)) setFundingSources(fundingRes.data);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
      if (setCategoriesLoadingFn) setCategoriesLoadingFn(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : '') : value),
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const addBudgetItem = () => {
    setBudgetItems(prev => [
      ...prev,
      {
        category_name: '',
        amount: '',
        currency: (formData.budget_currency || 'USD').toUpperCase(),
        funding_source_id: '',
      },
    ]);
  };

  const updateBudgetItem = (index, field, value) => {
    setBudgetItems(prev => {
      const next = [...prev];
      const current =
        next[index] ||
        {
          category_name: '',
          amount: '',
          currency: (formData.budget_currency || 'USD').toUpperCase(),
        };
      next[index] = { ...current, [field]: value };
      return next;
    });
  };

  const removeBudgetItem = (index) => {
    setBudgetItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError(null);

    let timeoutId = setTimeout(() => {
      savingRef.current = false;
      setSaving(false);
      setSaveError('Save is taking too long. Check your connection and try again.');
    }, 20000);

    try {
      const { budget_type, ...restForm } = formData;

      const submitData = {
        ...restForm,
        portfolio_owner_user_id: formData.portfolio_owner_user_id || null,
        portfolio_manager_user_id: formData.portfolio_manager_user_id || null,
        parent_portfolio_id: formData.parent_portfolio_id || null,
        portfolio_start_date: formData.portfolio_start_date || null,
        portfolio_end_date: formData.portfolio_end_date || null,
        portfolio_goals:
          Array.isArray(formData.portfolio_goals) && formData.portfolio_goals.length
            ? JSON.stringify(
                formData.portfolio_goals
                  .map(g => (g == null ? '' : String(g).trim()))
                  .filter(Boolean),
              )
            : null,
      };

      const cleanedBudgetItems = Array.isArray(budgetItems)
        ? budgetItems
            .map(item => {
              const amountNum =
                typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
              const hasAmount = Number.isFinite(amountNum);
              const name = (item.category_name || '').trim();
              const currency = (item.currency || formData.budget_currency || 'USD').toUpperCase();

              if (!name && !hasAmount) {
                return null;
              }

              return {
                category_name: name,
                amount: hasAmount ? amountNum : null,
                currency,
                funding_source_id: item.funding_source_id || '',
              };
            })
            .filter(Boolean)
        : [];

      if (cleanedBudgetItems.length > 0) {
        const totalsByCurrency = cleanedBudgetItems.reduce((acc, item) => {
          const curr = (item.currency || formData.budget_currency || 'USD').toUpperCase();
          const amt = typeof item.amount === 'number' ? item.amount : 0;
          acc[curr] = (acc[curr] || 0) + amt;
          return acc;
        }, {});

        const baseCurrency = (formData.budget_currency || 'USD').toUpperCase();
        const totalForBase = totalsByCurrency[baseCurrency];

        submitData.total_budget = Number.isFinite(totalForBase) ? totalForBase : null;
        submitData.custom_fields = {
          ...(portfolio?.custom_fields || {}),
          portfolio_budget_items: cleanedBudgetItems,
          portfolio_budget_type: budget_type || null,
        };
      } else {
        submitData.total_budget = formData.total_budget
          ? parseFloat(formData.total_budget)
          : null;

        const baseCustom = portfolio?.custom_fields || {};
        submitData.custom_fields = {
          ...baseCustom,
          portfolio_budget_items: [],
          portfolio_budget_type: budget_type || null,
        };
      }

      const saved = await savePortfolio(submitData, portfolio?.id);
      try {
        onSave(saved);
      } catch (navError) {
        console.error('Error after save (e.g. navigation):', navError);
        setSaveError('Portfolio saved but something went wrong. You can go back to the list.');
      }
    } catch (error) {
      console.error('Error saving portfolio:', error);
      const message = error?.message || error?.error_description || (typeof error === 'string' ? error : 'Failed to save portfolio. Please try again.');
      setSaveError(message);
    } finally {
      savingRef.current = false;
      if (timeoutId) clearTimeout(timeoutId);
      setSaving(false);
    }
  };

  const header = (
    <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
      <div className="flex items-center gap-3">
        <FolderKanban className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {portfolio ? 'Edit Portfolio' : 'Create Portfolio'}
        </h2>
      </div>
      <button
        onClick={onCancel}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="h-6 w-6" />
      </button>
    </div>
  );

  const [activeSection, setActiveSection] = useState('basic');

  const form = (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Top-level tabs for key sections (outside fieldset so they work in readOnly) */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <nav className="flex gap-4 overflow-x-auto">
              {[
                { id: 'basic', label: 'Basic Information' },
                { id: 'ownership', label: 'Ownership & Management' },
                { id: 'timeline', label: 'Timeline' },
                { id: 'budget', label: 'Budget' },
              ].map((tab, index) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSection(tab.id)}
                  className={`px-3 py-2 text-sm border-b-2 whitespace-nowrap ${
                    activeSection === tab.id
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <fieldset disabled={readOnly} className="disabled:opacity-90 border-0 p-0 m-0 min-w-0">
          {/* Basic Information */}
          {activeSection === 'basic' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Row 1: Code + Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio Code
                </label>
                <input
                  type="text"
                  name="portfolio_code"
                  value={formData.portfolio_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio Name *
                </label>
                <input
                  type="text"
                  name="portfolio_name"
                  value={formData.portfolio_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Row 2: Status + Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  name="portfolio_status"
                  value={formData.portfolio_status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="planning">Planning</option>
                  <option value="active">Active</option>
                  <option value="on-hold">On Hold</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio Type *
                </label>
                <select
                  name="portfolio_type"
                  value={formData.portfolio_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="strategic">Strategic</option>
                  <option value="operational">Operational</option>
                  <option value="innovation">Innovation</option>
                  <option value="compliance">Compliance</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              {/* Row 3: Category + Parent Portfolio — same source as Programme: portfolio_categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <SearchableSelect
                  options={categories.map((c) => ({
                    value: c.code || c.name,
                    label: c.name,
                  }))}
                  value={formData.portfolio_category}
                  onChange={(val) => setFormData((prev) => ({ ...prev, portfolio_category: val }))}
                  placeholder={categoriesLoading ? 'Loading categories…' : 'Select category…'}
                  searchPlaceholder="Search categories…"
                  disabled={categoriesLoading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Same categories as Programmes. Manage in PMO Admin → Portfolio Categories.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Parent Portfolio (optional)
                </label>
                <SearchableSelect
                  options={portfolios.map(p => ({
                    value: p.id,
                    label: `${p.portfolio_name}${p.portfolio_code ? ` (${p.portfolio_code})` : ''}`,
                  }))}
                  value={formData.parent_portfolio_id}
                  onChange={(val) => setFormData(prev => ({ ...prev, parent_portfolio_id: val }))}
                  placeholder="None (Top Level)"
                  searchPlaceholder="Search portfolios..."
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Assign this as a sub-portfolio under another portfolio.
                </p>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="portfolio_description"
                  value={formData.portfolio_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Mission & Vision */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mission
                </label>
                <textarea
                  name="portfolio_mission"
                  value={formData.portfolio_mission}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mission statement for this portfolio..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vision
                </label>
                <textarea
                  name="portfolio_vision"
                  value={formData.portfolio_vision}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Strategic vision for this portfolio..."
                />
              </div>

              {/* Governance & Hierarchy */}
              <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Governance & Hierarchy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Governance Model
                    </label>
                    <select
                      name="governance_model"
                      value={formData.governance_model}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="centralized">Centralized</option>
                      <option value="decentralized">Decentralized</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Review Frequency
                    </label>
                    <select
                      name="review_frequency"
                      value={formData.review_frequency}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="bi-weekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Goals */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Goals
                </label>
                <div className="space-y-2">
                  {(!Array.isArray(formData.portfolio_goals) ||
                    formData.portfolio_goals.length === 0) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No goals added yet. Use &quot;Add goal&quot; to capture key outcomes.
                    </p>
                  )}
                  {Array.isArray(formData.portfolio_goals) &&
                    formData.portfolio_goals.map((goal, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={goal}
                          onChange={(e) => {
                            const value = e.target.value
                            setFormData((prev) => {
                              const next = Array.isArray(prev.portfolio_goals)
                                ? [...prev.portfolio_goals]
                                : []
                              next[index] = value
                              return { ...prev, portfolio_goals: next }
                            })
                          }}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`Goal ${index + 1}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormData((prev) => {
                              const next = Array.isArray(prev.portfolio_goals)
                                ? [...prev.portfolio_goals]
                                : []
                              next.splice(index, 1)
                              return { ...prev, portfolio_goals: next }
                            })
                          }
                          className="px-3 py-2 text-xs rounded-lg bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        portfolio_goals: [
                          ...(Array.isArray(prev.portfolio_goals) ? prev.portfolio_goals : []),
                          '',
                        ],
                      }))
                    }
                    className="px-4 py-2 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Add goal
                  </button>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Each goal is stored separately so you can capture multiple outcomes for the
                    portfolio.
                  </p>
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Ownership & Management */}
          {activeSection === 'ownership' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2">
              <User className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Ownership & Management
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio Owner
                </label>
                <select
                  name="portfolio_owner_user_id"
                  value={formData.portfolio_owner_user_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Owner</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Portfolio Manager
                </label>
                <select
                  name="portfolio_manager_user_id"
                  value={formData.portfolio_manager_user_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Manager</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          )}

          {/* Dates */}
          {activeSection === 'timeline' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  name="portfolio_start_date"
                  value={formData.portfolio_start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  name="portfolio_end_date"
                  value={formData.portfolio_end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          )}

          {/* Budget */}
          {activeSection === 'budget' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget
            </h3>

            {/* Reporting currency + Budget Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reporting Currency
                </label>
                <select
                  name="budget_currency"
                  value={formData.budget_currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="ZWL">ZWL (Z$)</option>
                  <option value="ZAR">ZAR (R)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This is the primary reporting currency for the portfolio. Line items can specify their own currency where needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Type
                </label>
                <select
                  name="budget_type"
                  value={formData.budget_type || ''}
                  onChange={(e) =>
                    setFormData(prev => ({
                      ...prev,
                      budget_type: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Budget Type...</option>
                  <option value="capex">CapEx (Capital Expenditure)</option>
                  <option value="opex">OpEx (Operational Expenditure)</option>
                  <option value="mixed">Mixed (CapEx + OpEx)</option>
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span>CapEx: capital investment. OpEx: operational costs. Mixed: both.</span>
                </p>
              </div>
            </div>

            {/* Budget categories with per-line currency */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Budget Categories
                </label>
                <button
                  type="button"
                  onClick={addBudgetItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
                >
                  <DollarSign className="h-4 w-4" />
                  Add category
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Add rows for each budget category (e.g. Facilities, Travel). Amounts are grouped by currency to derive totals. Categories come from PMO Admin → Portfolio Categories.
              </p>

              {budgetItems.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <div className="col-span-4">Category</div>
                    <div className="col-span-3">Amount</div>
                    <div className="col-span-2">Currency</div>
                    <div className="col-span-2">Funding source</div>
                    <div className="col-span-1" />
                  </div>

                  {budgetItems.map((row, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-start">                      <div className="col-span-4">
                        <select
                          value={row.category_name || ''}
                          onChange={(e) => updateBudgetItem(index, 'category_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          <option value="">
                            {categories.length > 0
                              ? 'Select category...'
                              : 'Select category... (PMO Admin → Budget Categories)'}
                          </option>
                          {budgetCategories.map(bc => (
                            <option key={bc.id} value={bc.name}>
                              {bc.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-3">
                        <SmartAmountInput
                          value={
                            row.amount !== '' && row.amount !== null && row.amount !== undefined
                              ? Number(row.amount)
                              : null
                          }
                          onChange={(num) =>
                            updateBudgetItem(index, 'amount', num !== null && num !== undefined ? num : '')
                          }
                          placeholder="0"
                          min={0}
                          inputClassName="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>

                      <div className="col-span-2">
                        <select
                          value={row.currency || formData.budget_currency || 'USD'}
                          onChange={(e) => updateBudgetItem(index, 'currency', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          <option value="USD">USD ($)</option>
                          <option value="EUR">EUR (€)</option>
                          <option value="GBP">GBP (£)</option>
                          <option value="ZWL">ZWL (Z$)</option>
                          <option value="ZAR">ZAR (R)</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <select
                          value={row.funding_source_id || ''}
                          onChange={(e) => updateBudgetItem(index, 'funding_source_id', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          <option value="">
                            {fundingSources.length > 0
                              ? 'Select funding source...'
                              : 'Select funding source... (PMO Admin → Funding Sources)'}
                          </option>
                          {fundingSources.map(fs => (
                            <option key={fs.id} value={fs.id}>
                              {fs.name}
                              {fs.code && fs.code !== fs.name ? ` (${fs.code})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-1 pt-2">
                        <button
                          type="button"
                          onClick={() => removeBudgetItem(index)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Remove category"
                          aria-label={`Remove budget category ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {budgetItems.length === 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No budget categories defined yet. Use &quot;Add category&quot; to capture budget lines for this portfolio.
                </p>
              )}

              {Object.keys(budgetTotalsByCurrency).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(budgetTotalsByCurrency).map(([currency, total]) => (
                    <div
                      key={currency}
                      className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-600/60 shadow-sm"
                    >
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Total budget ({currency}):
                      </span>
                      <span className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                        {total.toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          )}

          {saveError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-red-700 dark:text-red-300 text-sm">
              {saveError}
            </div>
          )}
          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {readOnly ? 'Back' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : portfolio ? 'Update Portfolio' : 'Create Portfolio'}
              </button>
            )}
          </div>
          </fieldset>
        </form>
  );

  if (useModalLayout) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {header}
          {form}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {header}
          {form}
        </div>
      </div>
    </div>
  );
}

