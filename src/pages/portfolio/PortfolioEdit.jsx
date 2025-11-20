import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderKanban } from 'lucide-react';
import { getPortfolio, savePortfolio } from '../../services/portfolioService';
import PortfolioForm from '../../components/portfolio/PortfolioForm';

export default function PortfolioEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchPortfolio();
    }
  }, [id]);

  const fetchPortfolio = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPortfolio(id);
      setPortfolio(data);
    } catch (err) {
      console.error('Error fetching portfolio:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    navigate(`/portfolio/${id}`);
  };

  const handleCancel = () => {
    navigate(`/portfolio/${id}`);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading portfolio...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800 dark:text-red-300">
            <span className="font-medium">Error loading portfolio: {error}</span>
          </div>
          <button
            onClick={() => navigate('/portfolio')}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Back to Portfolios
          </button>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">Portfolio not found</p>
          <button
            onClick={() => navigate('/portfolio')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Back to Portfolios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate(`/portfolio/${id}`)}
        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 flex items-center gap-2"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Portfolio
      </button>

      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <FolderKanban className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Edit Portfolio
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Update portfolio details and configuration
        </p>
      </div>

      <PortfolioForm
        portfolio={portfolio}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}

