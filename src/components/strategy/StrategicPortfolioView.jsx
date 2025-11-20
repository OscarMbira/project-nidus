import { useState, useEffect } from 'react';
import { FolderKanban, Target, TrendingUp, CheckCircle, AlertTriangle, BarChart3, PieChart } from 'lucide-react';
import { getStrategicObjectives, getProjectObjectiveMappings, getAlignmentScores } from '../../services/strategicService';
import { supabase } from '../../services/supabaseClient';

export default function StrategicPortfolioView({ portfolioId = null }) {
  const [portfolio, setPortfolio] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [projects, setProjects] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [alignmentScores, setAlignmentScores] = useState([]);
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(portfolioId || '');
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolioId) {
      fetchPortfolioData();
    }
  }, [selectedPortfolioId]);

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

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);

      // Fetch portfolio details
      const { data: portfolioData } = await supabase
        .from('portfolios')
        .select('*')
        .eq('id', selectedPortfolioId)
        .single();

      if (portfolioData) setPortfolio(portfolioData);

      // Fetch portfolio objectives
      const objectivesData = await getStrategicObjectives({ portfolio_id: selectedPortfolioId });
      setObjectives(objectivesData || []);

      // Fetch portfolio projects
      const { data: portfolioProjectsData } = await supabase
        .from('portfolio_projects')
        .select(`
          project:project_id (
            id,
            project_name,
            project_code,
            project_status,
            methodology
          )
        `)
        .eq('portfolio_id', selectedPortfolioId)
        .eq('is_deleted', false);

      if (portfolioProjectsData) {
        const projectList = portfolioProjectsData.map(pp => pp.project).filter(Boolean);
        setProjects(projectList);

        // Fetch mappings for these projects
        const projectIds = projectList.map(p => p.id);
        if (projectIds.length > 0) {
          const mappingsPromises = projectIds.map(projectId =>
            getProjectObjectiveMappings({ project_id: projectId })
          );
          const mappingsResults = await Promise.all(mappingsPromises);
          const allMappings = mappingsResults.flat();
          setMappings(allMappings);

          // Fetch alignment scores for portfolio
          const scoresData = await getAlignmentScores({ portfolio_id: selectedPortfolioId });
          setAlignmentScores(scoresData || []);
        }
      }
    } catch (error) {
      console.error('Error fetching portfolio data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate portfolio alignment metrics
  const mappedProjects = new Set(mappings.map(m => m.project_id)).size;
  const projectsWithHighAlignment = alignmentScores.filter(
    score => score.overall_alignment_score >= 80
  ).length;
  const averageAlignment = alignmentScores.length > 0
    ? alignmentScores.reduce((sum, s) => sum + (parseFloat(s.overall_alignment_score) || 0), 0) / alignmentScores.length
    : 0;

  // Group objectives by category
  const objectivesByCategory = objectives.reduce((acc, obj) => {
    const category = obj.objective_category || 'other';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  // Projects by alignment score
  const projectsByAlignment = projects.map(project => {
    const projectScore = alignmentScores.find(s => s.project_id === project.id);
    return {
      project,
      score: projectScore?.overall_alignment_score || null,
    };
  }).sort((a, b) => (b.score || 0) - (a.score || 0));

  return (
    <div className="space-y-6">
      {/* Portfolio Selector */}
      {!portfolioId && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Portfolio
          </label>
          <select
            value={selectedPortfolioId}
            onChange={(e) => setSelectedPortfolioId(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select a portfolio...</option>
            {portfolios.map(portfolio => (
              <option key={portfolio.id} value={portfolio.id}>
                {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedPortfolioId && (
        <>
          {/* Portfolio Summary */}
          {portfolio && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FolderKanban className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {portfolio.portfolio_name}
                    </h2>
                    {portfolio.portfolio_code && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Code: {portfolio.portfolio_code}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Strategic Alignment Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Average Alignment</p>
                  <p className={`text-3xl font-bold ${
                    averageAlignment >= 80 ? 'text-green-600 dark:text-green-400' :
                    averageAlignment >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {Math.round(averageAlignment)}
                  </p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Strategic Objectives</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {objectives.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {objectives.filter(o => o.objective_status === 'active').length} active
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mapped Projects</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {mappedProjects} / {projects.length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {Math.round((mappedProjects / projects.length) * 100) || 0}% mapped
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">High Alignment</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {projectsWithHighAlignment}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Projects ≥80% aligned
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Objectives by Category */}
          {Object.keys(objectivesByCategory).length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Objectives by Category
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(objectivesByCategory).map(([category, count]) => (
                  <div key={category} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{count}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize mt-1">
                      {category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects by Alignment Score */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Projects by Alignment Score
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Methodology
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Alignment Score
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Mapped Objectives
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {projectsByAlignment.map(({ project, score }) => {
                    const projectMappings = mappings.filter(m => m.project_id === project.id);
                    return (
                      <tr key={project.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {project.project_name}
                          </div>
                          {project.project_code && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {project.project_code}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${
                            project.project_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                            project.project_status === 'on_hold' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            project.project_status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {project.project_status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-white capitalize">
                            {project.methodology || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {score !== null ? (
                            <div className={`text-lg font-bold ${
                              score >= 80 ? 'text-green-600 dark:text-green-400' :
                              score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {Math.round(score)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">Not calculated</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-white">
                            {projectMappings.length} objective{projectMappings.length !== 1 ? 's' : ''}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {!selectedPortfolioId && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
              <FolderKanban className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Select a Portfolio
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Please select a portfolio from the dropdown above to view strategic alignment
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

