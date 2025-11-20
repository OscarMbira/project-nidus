import { useState, useEffect } from 'react';
import { BarChart3, Filter } from 'lucide-react';
import PortfolioAnalyticsDashboard from '../../components/analytics/PortfolioAnalyticsDashboard';
import { supabase } from '../../services/supabaseClient';

export default function AnalyticsPortfolio() {
  const [selectedPortfolioId, setSelectedPortfolioId] = useState('');
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('portfolios')
        .select('id, portfolio_name, portfolio_code, portfolio_status')
        .eq('is_deleted', false)
        .order('portfolio_name', { ascending: true });

      if (data) setPortfolios(data);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          Portfolio Analytics
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Analyze portfolio performance across all projects
        </p>
      </div>

      {/* Portfolio Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Filter by Portfolio:
            </label>
          </div>
          <select
            value={selectedPortfolioId}
            onChange={(e) => setSelectedPortfolioId(e.target.value)}
            className="flex-1 max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Projects (Global View)</option>
            {portfolios.map(portfolio => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Portfolio Analytics Dashboard */}
      <PortfolioAnalyticsDashboard portfolioId={selectedPortfolioId || null} />
    </div>
  );
}

