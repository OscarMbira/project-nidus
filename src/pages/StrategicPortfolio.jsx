import { useState } from 'react';
import { FolderKanban, Target, BarChart3 } from 'lucide-react';
import StrategicPortfolioView from '../components/strategy/StrategicPortfolioView';

export default function StrategicPortfolio() {
  const [portfolioId, setPortfolioId] = useState('');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FolderKanban className="h-8 w-8 text-purple-600 dark:text-purple-400" />
            Strategic Portfolio View
          </h1>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View strategic alignment across portfolios and optimize project selection
        </p>
      </div>

      <StrategicPortfolioView portfolioId={portfolioId || null} />
    </div>
  );
}

