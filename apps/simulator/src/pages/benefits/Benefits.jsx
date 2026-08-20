import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, Search, Filter, TrendingUp, CheckCircle, Clock } from 'lucide-react';
import { DashboardRegisterTabBar, RegisterOpenItemsWidget, DashboardStatCard } from '@nidus/ui';
import { getBenefits, getBenefitsDashboardStats } from '../../services/benefitsService';
import BenefitsRegister from '../../components/benefits/BenefitsRegister';
import BenefitForm from '../../components/benefits/BenefitForm';
import BenefitsRealizationChart from '../../components/benefits/BenefitsRealizationChart';

export default function Benefits() {
  const navigate = useNavigate();
  const [benefits, setBenefits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBenefitForm, setShowBenefitForm] = useState(false);
  const [selectedBenefit, setSelectedBenefit] = useState(null);
  const [pageTab, setPageTab] = useState('dashboard'); // 'dashboard' | 'register'
  const [filters, setFilters] = useState({
    portfolio_id: '',
    programme_id: '',
    project_id: '',
    benefit_category: '',
    benefit_type: '',
    benefit_status: '',
    search: '',
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [benefitsData, statsData] = await Promise.all([
        getBenefits(filters),
        getBenefitsDashboardStats(filters),
      ]);
      setBenefits(benefitsData || []);
      setStats(statsData);
    } catch (error) {
      console.error('Error fetching benefits data:', error);
      alert('Error loading benefits: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBenefit = () => {
    setSelectedBenefit(null);
    setShowBenefitForm(true);
  };

  const pendingBenefits = useMemo(
    () => benefits.filter((b) => b.benefit_status !== 'realized').slice(0, 5),
    [benefits]
  );

  const handleEditBenefit = (benefit) => {
    setSelectedBenefit(benefit);
    setShowBenefitForm(true);
  };

  const showRegisterFiltered = (benefit_status) => {
    setFilters({ ...filters, benefit_status });
    setPageTab('register');
  };

  const handleBenefitSaved = () => {
    setShowBenefitForm(false);
    setSelectedBenefit(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-3 sm:px-4 lg:px-5 xl:px-6 py-6">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
            Benefits Realization
          </h1>
          <DashboardRegisterTabBar
            value={pageTab}
            onChange={setPageTab}
            registerLabel="Register"
            ariaLabel="Benefits sections"
          />
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Track and measure benefits delivery from portfolios, programmes, and projects
        </p>
        {pageTab === 'register' && (
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <button
              onClick={() => navigate('/benefits/measurements')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <TrendingUp className="h-4 w-4" />
              Measurements
            </button>
            <button
              onClick={() => navigate('/benefits/realization')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors text-sm"
            >
              <CheckCircle className="h-4 w-4" />
              Realization
            </button>
            <button
              onClick={handleCreateBenefit}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Benefit
            </button>
          </div>
        )}
      </div>

      {pageTab === 'dashboard' && (
        <div role="tabpanel" aria-label="Benefits dashboard">
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <DashboardStatCard
                label="Total Benefits"
                value={stats.total || 0}
                icon={Target}
                onClick={() => showRegisterFiltered('')}
              />
              <DashboardStatCard
                label="Realized"
                value={stats.realized || 0}
                icon={CheckCircle}
                iconClassName="text-green-500"
                accentClassName="text-green-600 dark:text-green-400"
                borderClassName="border-green-200 dark:border-green-800"
                onClick={() => showRegisterFiltered('realized')}
              />
              <DashboardStatCard
                label="In Progress"
                value={stats.inProgress || 0}
                icon={Clock}
                iconClassName="text-blue-500"
                accentClassName="text-blue-600 dark:text-blue-400"
                borderClassName="border-blue-200 dark:border-blue-800"
                onClick={() => showRegisterFiltered('in_progress')}
              />
              <DashboardStatCard
                label="Estimated Value"
                value={`$${(stats.totalEstimatedValue || 0).toLocaleString()}`}
                icon={TrendingUp}
                iconClassName="text-purple-500"
                accentClassName="text-purple-600 dark:text-purple-400"
                borderClassName="border-purple-200 dark:border-purple-800"
                onClick={() => showRegisterFiltered('')}
              />
              <DashboardStatCard
                label="Realized Value"
                value={`$${(stats.totalRealizedValue || 0).toLocaleString()}`}
                icon={CheckCircle}
                iconClassName="text-green-500"
                accentClassName="text-green-600 dark:text-green-400"
                borderClassName="border-green-200 dark:border-green-800"
                onClick={() => showRegisterFiltered('realized')}
              />
            </div>
          )}

          {benefits.length > 0 && (
            <div className="mb-6">
              <BenefitsRealizationChart benefits={benefits} measurements={[]} />
            </div>
          )}

          {benefits.length > 0 && (
            <div className="mb-6">
              <RegisterOpenItemsWidget
                title="Benefits Not Yet Realized"
                icon={Target}
                rows={pendingBenefits}
                totalCount={benefits.filter((b) => b.benefit_status !== 'realized').length}
                columns={[
                  { key: 'benefit_code', label: 'Reference', className: 'font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap' },
                  { key: 'benefit_name', label: 'Name', className: 'font-medium text-gray-900 dark:text-white' },
                  { key: 'benefit_category', label: 'Category', className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap capitalize' },
                  {
                    key: 'benefit_status',
                    label: 'Status',
                    render: (b) => <span className="capitalize">{(b.benefit_status || 'unset').replace('_', ' ')}</span>,
                    className: 'text-gray-500 dark:text-gray-400 whitespace-nowrap',
                  },
                ]}
                rowKey={(b) => b.id}
                searchFields={['benefit_name', 'benefit_code']}
                onRowClick={handleEditBenefit}
                onViewAll={() => setPageTab('register')}
                viewAllLabel="Open full Benefits Register"
                emptyMessage="No benefits pending realization"
              />
            </div>
          )}
        </div>
      )}

      {pageTab === 'register' && (
        <div role="tabpanel" aria-label="Benefits register">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <Search className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search benefits..."
                    value={filters.search || ''}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                <select
                  value={filters.benefit_status || ''}
                  onChange={(e) => setFilters({ ...filters, benefit_status: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Status</option>
                  <option value="identified">Identified</option>
                  <option value="planned">Planned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="partially_realized">Partially Realized</option>
                  <option value="realized">Realized</option>
                  <option value="lost">Lost</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={filters.benefit_category || ''}
                  onChange={(e) => setFilters({ ...filters, benefit_category: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Categories</option>
                  <option value="financial">Financial</option>
                  <option value="operational">Operational</option>
                  <option value="strategic">Strategic</option>
                  <option value="compliance">Compliance</option>
                  <option value="customer">Customer</option>
                  <option value="employee">Employee</option>
                  <option value="technology">Technology</option>
                  <option value="environmental">Environmental</option>
                </select>
                <select
                  value={filters.benefit_type || ''}
                  onChange={(e) => setFilters({ ...filters, benefit_type: e.target.value })}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Types</option>
                  <option value="quantifiable">Quantifiable</option>
                  <option value="qualitative">Qualitative</option>
                  <option value="intangible">Intangible</option>
                </select>
              </div>
            </div>
          </div>

          <BenefitsRegister
            benefits={benefits}
            onEdit={handleEditBenefit}
            onRefresh={fetchData}
          />
        </div>
      )}

      {showBenefitForm && (
        <BenefitForm
          benefit={selectedBenefit}
          onSave={handleBenefitSaved}
          onCancel={() => {
            setShowBenefitForm(false);
            setSelectedBenefit(null);
          }}
        />
      )}
    </div>
  );
}

