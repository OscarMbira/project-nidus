import { useState, useEffect } from 'react';
import { Compass, Target, Link2, TrendingUp } from 'lucide-react';
import AlignmentDashboard from '../components/strategy/AlignmentDashboard';
import ProjectObjectiveMapper from '../components/strategy/ProjectObjectiveMapper';
import ObjectiveForm from '../components/strategy/ObjectiveForm';
import { saveProjectObjectiveMapping } from '../services/strategicService';
import { supabase } from '../services/supabaseClient';

export default function StrategicAlignment() {
  const [portfolioId, setPortfolioId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [portfolios, setPortfolios] = useState([]);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [selectedMappingData, setSelectedMappingData] = useState(null);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const { data } = await supabase
        .from('portfolios')
        .select('id, portfolio_name, portfolio_code')
        .eq('is_deleted', false)
        .order('portfolio_name', { ascending: true });

      if (data) setPortfolios(data);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    }
  };

  const handleAddMapping = (projectIdParam) => {
    setSelectedMappingData({ project_id: projectIdParam });
    setShowMappingForm(true);
  };

  const handleMappingSaved = () => {
    setShowMappingForm(false);
    setSelectedMappingData(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Compass className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            Strategic Alignment
          </h1>
          <div className="flex items-center gap-2">
            <select
              value={portfolioId}
              onChange={(e) => {
                setPortfolioId(e.target.value);
                setProjectId('');
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Portfolios</option>
              {portfolios.map(portfolio => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          View alignment scores and map projects to strategic objectives
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Alignment Dashboard
            </button>
          </nav>
        </div>
      </div>

      {/* Alignment Dashboard */}
      <div className="mb-6">
        <AlignmentDashboard portfolioId={portfolioId || null} projectId={projectId || null} />
      </div>

      {/* Project-Objective Mapper */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Project-Objective Mappings
        </h2>
        <ProjectObjectiveMapper
          projectId={projectId}
          onAddMapping={handleAddMapping}
        />
      </div>

      {/* Mapping Form Modal - TODO: Create proper mapping form component */}
    </div>
  );
}

