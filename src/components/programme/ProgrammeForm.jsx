import { useState, useEffect } from 'react';
import { X, Save, Target, User, DollarSign, Calendar, Trash2, Info } from 'lucide-react';
import { saveProgramme } from '../../services/programmeService';
import { getPortfolioCategories } from '../../services/portfolioCategoryService';
import { getBudgetCategories } from '../../services/budgetCategoryService';
import { getFundingSources } from '../../services/fundingSourceService';
import { platformDb } from '../../services/supabase/supabaseClient';
import SearchableSelect from '../ui/SearchableSelect';
import { SmartAmountInput } from '../ui/SmartAmountInput';

export default function ProgrammeForm({ programme, onSave, onCancel, embedded = true }) {
  const [formData, setFormData] = useState({
    programme_code: '',
    programme_name: '',
    programme_description: '',
    programme_vision: '',
    programme_mission: '',
    programme_type: 'business_transformation',
    programme_category: '',
    programme_owner_user_id: '',
    programme_manager_user_id: '',
    programme_start_date: '',
    programme_end_date: '',
    programme_status: 'planning',
    portfolio_id: '',
    total_budget: '',
    budget_currency: 'USD',
    budget_type: '',
    governance_model: 'centralized',
    review_frequency: 'monthly',
  });

  const [users, setUsers] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgetCategories, setBudgetCategories] = useState([]);
  const [fundingSources, setFundingSources] = useState([]);
  const [budgetItems, setBudgetItems] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const budgetTotalsByCurrency = budgetItems.reduce((acc, item) => {
    const amountNum = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
    if (!Number.isFinite(amountNum)) return acc;
    const currency = (item.currency || formData.budget_currency || 'USD').toUpperCase();
    acc[currency] = (acc[currency] || 0) + amountNum;
    return acc;
  }, {});

  const TAB_IDS = ['basic', 'ownership', 'timeline', 'budget', 'governance'];
  const TAB_LABELS = ['Basic Information', 'Ownership & Management', 'Timeline', 'Budget', 'Governance'];

  useEffect(() => {
    if (programme) {
      setFormData({
        programme_code: programme.programme_code || '',
        programme_name: programme.programme_name || '',
        programme_description: programme.programme_description || '',
        programme_vision: programme.programme_vision || '',
        programme_mission: programme.programme_mission || '',
        programme_type: programme.programme_type || 'business_transformation',
        programme_category: programme.programme_category || '',
        programme_owner_user_id: programme.programme_owner_user_id || '',
        programme_manager_user_id: programme.programme_manager_user_id || '',
        programme_start_date: programme.programme_start_date || '',
        programme_end_date: programme.programme_end_date || '',
        programme_status: programme.programme_status || 'planning',
        portfolio_id: programme.portfolio_id || '',
        total_budget: programme.total_budget || '',
        budget_currency: programme.budget_currency || 'USD',
        budget_type: programme.metadata?.programme_budget_type || '',
        governance_model: programme.governance_model || 'centralized',
        review_frequency: programme.review_frequency || 'monthly',
      });
      const existing = programme.metadata?.programme_budget_items;
      if (Array.isArray(existing) && existing.length) {
        setBudgetItems(
          existing.map((item) => ({
            category_name: item.category_name || '',
            amount: item.amount ?? '',
            currency: (item.currency || programme.budget_currency || 'USD').toUpperCase(),
            funding_source_id: item.funding_source_id || '',
          }))
        );
      } else if (programme.total_budget) {
        setBudgetItems([
          {
            category_name: '',
            amount: Number(programme.total_budget),
            currency: (programme.budget_currency || 'USD').toUpperCase(),
            funding_source_id: '',
          },
        ]);
      } else {
        setBudgetItems([]);
      }
    } else {
      setBudgetItems([]);
    }
  }, [programme]);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      fetchLookupData();
    });
    return () => cancelAnimationFrame(t);
  }, []);

  const fetchLookupData = async () => {
    try {
      setCategoriesLoading(true);
      const [usersRes, portfoliosRes, catRes, budgetCatRes, fundingRes] = await Promise.all([
        platformDb.from('users').select('id, email, full_name').eq('is_active', true).eq('is_deleted', false).order('full_name', { ascending: true }),
        platformDb.from('portfolios').select('id, portfolio_name, portfolio_code').eq('is_deleted', false).order('portfolio_name', { ascending: true }),
        getPortfolioCategories({ activeOnly: true }),
        getBudgetCategories({ activeOnly: true }),
        getFundingSources({ activeOnly: true }),
      ]);
      if (usersRes?.data) setUsers(usersRes.data);
      if (portfoliosRes?.data) setPortfolios(portfoliosRes.data);
      if (catRes?.success && Array.isArray(catRes.data)) setCategories(catRes.data || []);
      if (budgetCatRes?.success && Array.isArray(budgetCatRes.data)) setBudgetCategories(budgetCatRes.data || []);
      if (fundingRes?.success && Array.isArray(fundingRes.data)) setFundingSources(fundingRes.data || []);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const addBudgetItem = () => {
    setBudgetItems((prev) => [
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
    setBudgetItems((prev) => {
      const next = [...prev];
      const row = { ...(next[index] || {}), [field]: value };
      if (field === 'currency' && typeof value === 'string') row.currency = value.toUpperCase();
      next[index] = row;
      return next;
    });
  };

  const removeBudgetItem = (index) => {
    setBudgetItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (type === 'number' ? (value ? parseFloat(value) : '') : value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { budget_type, ...restForm } = formData;
      const submitData = {
        ...restForm,
        programme_owner_user_id: formData.programme_owner_user_id || null,
        programme_manager_user_id: formData.programme_manager_user_id || null,
        portfolio_id: formData.portfolio_id || null,
        programme_start_date: formData.programme_start_date || null,
        programme_end_date: formData.programme_end_date || null,
      };

      const cleanedBudgetItems = (budgetItems || [])
        .map((item) => {
          const amountNum = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
          const hasAmount = Number.isFinite(amountNum);
          const name = (item.category_name || '').trim();
          const currency = (item.currency || formData.budget_currency || 'USD').toUpperCase();
          if (!name && !hasAmount) return null;
          return {
            category_name: name || null,
            amount: hasAmount ? amountNum : null,
            currency,
            funding_source_id: item.funding_source_id || '',
          };
        })
        .filter(Boolean);

      if (cleanedBudgetItems.length > 0) {
        const totalsByCurrency = cleanedBudgetItems.reduce((acc, item) => {
          const curr = (item.currency || formData.budget_currency || 'USD').toUpperCase();
          const amt = typeof item.amount === 'number' ? item.amount : 0;
          acc[curr] = (acc[curr] || 0) + amt;
          return acc;
        }, {});
        const baseCurrency = (formData.budget_currency || 'USD').toUpperCase();
        submitData.total_budget = Number.isFinite(totalsByCurrency[baseCurrency]) ? totalsByCurrency[baseCurrency] : null;
        submitData.metadata = { ...(submitData.metadata || {}), programme_budget_items: cleanedBudgetItems, programme_budget_type: budget_type || null };
      } else {
        submitData.total_budget = formData.total_budget ? parseFloat(formData.total_budget) : null;
        submitData.metadata = { ...(submitData.metadata || {}), programme_budget_items: [], programme_budget_type: budget_type || null };
      }

      const saved = await saveProgramme(submitData, programme?.id);
      onSave(saved);
    } catch (error) {
      console.error('Error saving programme:', error);
      alert('Error saving programme: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="p-6 space-y-6">
      {/* Tab navigation */}
      <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
        {TAB_LABELS.map((label, idx) => (
          <button
            key={TAB_IDS[idx]}
            type="button"
            onClick={() => setActiveTab(idx)}
            className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === idx
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

          {/* Tab 0: Basic Information */}
          <div className="space-y-4" style={{ display: activeTab === 0 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Programme Code
                </label>
                <input
                  type="text"
                  name="programme_code"
                  value={formData.programme_code}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Programme Name *
                </label>
                <input
                  type="text"
                  name="programme_name"
                  value={formData.programme_name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  name="programme_status"
                  value={formData.programme_status}
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
                  Programme Type *
                </label>
                <select
                  name="programme_type"
                  value={formData.programme_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="business_transformation">Business Transformation</option>
                  <option value="technology">Technology</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="product">Product</option>
                  <option value="regulatory">Regulatory</option>
                  <option value="mixed">Mixed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <SearchableSelect
                  options={categories.map((c) => ({
                    value: c.code || c.name,
                    label: c.name,
                  }))}
                  value={formData.programme_category}
                  onChange={(val) => setFormData((prev) => ({ ...prev, programme_category: val }))}
                  placeholder={categoriesLoading ? 'Loading categories…' : 'Select category…'}
                  searchPlaceholder="Search categories…"
                  disabled={categoriesLoading}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Same as Portfolio categories. Manage in PMO Admin → Portfolio Categories.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  name="programme_description"
                  value={formData.programme_description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Vision
                </label>
                <textarea
                  name="programme_vision"
                  value={formData.programme_vision}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Strategic vision for this programme..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mission
                </label>
                <textarea
                  name="programme_mission"
                  value={formData.programme_mission}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Mission statement for this programme..."
                />
              </div>
            </div>
          </div>

          {/* Tab 1: Ownership & Management */}
          <div className="space-y-4" style={{ display: activeTab === 1 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <User className="h-5 w-5" />
              Ownership & Management
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Programme Owner
                </label>
                <select
                  name="programme_owner_user_id"
                  value={formData.programme_owner_user_id}
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
                  Programme Manager
                </label>
                <select
                  name="programme_manager_user_id"
                  value={formData.programme_manager_user_id}
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

              {portfolios.length > 0 && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Portfolio (optional)
                  </label>
                  <select
                    name="portfolio_id"
                    value={formData.portfolio_id}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">None (Independent Programme)</option>
                    {portfolios.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.portfolio_name} {p.portfolio_code ? `(${p.portfolio_code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Tab 2: Timeline */}
          <div className="space-y-4" style={{ display: activeTab === 2 ? 'block' : 'none' }}>
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
                  name="programme_start_date"
                  value={formData.programme_start_date}
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
                  name="programme_end_date"
                  value={formData.programme_end_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Tab 3: Budget - multiple lines per currency and funding source */}
          <div className="space-y-6" style={{ display: activeTab === 3 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget
            </h3>

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
                  Primary reporting currency. Line items can specify their own currency where needed.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Budget Type
                </label>
                <select
                  name="budget_type"
                  value={formData.budget_type || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, budget_type: e.target.value }))}
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
                Add rows for each budget category (e.g. Facilities, Travel). Amounts are grouped by currency to derive totals. Categories and funding sources from PMO Admin.
              </p>

              {budgetItems.length > 0 && (
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <div className="col-span-5">Category</div>
                    <div className="col-span-2">Amount</div>
                    <div className="col-span-2">Currency</div>
                    <div className="col-span-5">Funding source</div>
                    <div className="col-span-1" />
                  </div>
                  {budgetItems.map((row, index) => (
                    <div key={index} className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-2 items-start">
                      <div className="col-span-5 min-w-0">
                        <select
                          value={row.category_name || ''}
                          onChange={(e) => updateBudgetItem(index, 'category_name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          <option value="">{budgetCategories.length > 0 ? 'Select category...' : 'Select category... (PMO Admin → Budget Categories)'}</option>
                          {budgetCategories.map((bc) => (
                            <option key={bc.id} value={bc.name}>{bc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <SmartAmountInput
                          value={row.amount !== '' && row.amount != null && row.amount !== undefined ? Number(row.amount) : null}
                          onChange={(num) => updateBudgetItem(index, 'amount', num != null ? num : '')}
                          placeholder="0"
                          min={0}
                          inputClassName="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        />
                      </div>
                      <div className="col-span-2 min-w-0">
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
                      <div className="col-span-5 min-w-0">
                        <select
                          value={row.funding_source_id || ''}
                          onChange={(e) => updateBudgetItem(index, 'funding_source_id', e.target.value)}
                          className="w-full min-w-[10rem] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                        >
                          <option value="">{fundingSources.length > 0 ? 'Select funding source...' : 'Select... (PMO Admin → Funding Sources)'}</option>
                          {fundingSources.map((fs) => (
                            <option key={fs.id} value={fs.id}>{fs.name}{fs.code && fs.code !== fs.name ? ` (${fs.code})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-1 pt-2">
                        <button
                          type="button"
                          onClick={() => removeBudgetItem(index)}
                          className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Remove category"
                          aria-label={`Remove budget line ${index + 1}`}
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
                  No budget categories defined yet. Use &quot;Add category&quot; to capture budget lines per currency and funding source.
                </p>
              )}

              {Object.keys(budgetTotalsByCurrency).length > 0 && (
                <div className="mt-4 space-y-2">
                  {Object.entries(budgetTotalsByCurrency).map(([currency, total]) => (
                    <div key={currency} className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700">
                      <span className="text-sm font-medium text-amber-800 dark:text-amber-200">Total budget ({currency}):</span>
                      <span className="font-semibold text-amber-900 dark:text-amber-100">
                        {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tab 4: Governance */}
          <div className="space-y-4" style={{ display: activeTab === 4 ? 'block' : 'none' }}>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex items-center gap-2">
              <Target className="h-5 w-5" />
              Governance
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
                  <option value="steering_committee">Steering Committee</option>
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

          {/* Form Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : programme ? 'Update Programme' : 'Create Programme'}
            </button>
          </div>
        </form>
  );

  if (embedded) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {programme ? 'Edit Programme' : 'Create Programme'}
              </h2>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-visible">
        {formContent}
      </div>
    </div>
  );
}

