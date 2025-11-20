import { useState, useEffect } from 'react';
import { Target, TrendingUp, CheckCircle, AlertTriangle, BarChart3, PieChart } from 'lucide-react';
import { getAlignmentScores, getStrategicAlignmentDashboardStats } from '../../services/strategicService';
import { supabase } from '../../services/supabaseClient';

export default function AlignmentDashboard({ portfolioId = null, projectId = null }) {
  const [stats, setStats] = useState(null);
  const [scores, setScores] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [portfolioId, projectId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (portfolioId) filters.portfolio_id = portfolioId;
      if (projectId) filters.project_id = projectId;

      const [statsData, scoresData] = await Promise.all([
        getStrategicAlignmentDashboardStats(filters),
        getAlignmentScores(filters),
      ]);

      setStats(statsData);

      // Get recent scores (last 10)
      const recentScores = (scoresData || []).slice(0, 10);
      setScores(recentScores);

      // Fetch project details if portfolio selected
      if (portfolioId) {
        const { data: projectsData } = await supabase
          .from('portfolio_projects')
          .select(`
            project:project_id (
              id,
              project_name,
              project_code,
              project_status
            )
          `)
          .eq('portfolio_id', portfolioId)
          .eq('is_deleted', false)
          .limit(20);

        if (projectsData) {
          setProjects(projectsData.map(pp => pp.project).filter(Boolean));
        }
      } else if (projectId) {
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, project_name, project_code, project_status')
          .eq('id', projectId)
          .single();

        if (projectData) {
          setProjects([projectData]);
        }
      }
    } catch (error) {
      console.error('Error fetching alignment dashboard data:', error);
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

  const averageScore = stats?.averageAlignmentScore || 0;
  const scoreColor = averageScore >= 80 ? 'text-green-600 dark:text-green-400' :
                     averageScore >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                     'text-red-600 dark:text-red-400';

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Average Alignment</p>
              <p className={`text-3xl font-bold ${scoreColor}`}>
                {Math.round(averageScore)}
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Objectives</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.totalObjectives || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats?.activeObjectives || 0} active
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Project Mappings</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.totalMappings || 0}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats?.activeMappings || 0} active
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Mapped Projects</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats?.projectsWithMappings || 0}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Objectives by Category */}
      {stats?.byCategory && Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Objectives by Category
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byCategory).map(([category, count]) => (
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

      {/* Recent Alignment Scores */}
      {scores.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Recent Alignment Scores
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Context
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Overall Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Strategic
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Financial
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Operational
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {scores.map((score) => (
                  <tr key={score.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {score.portfolio?.portfolio_name || score.project?.project_name || 'N/A'}
                      </div>
                      {score.portfolio && score.portfolio.portfolio_code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {score.portfolio.portfolio_code}
                        </div>
                      )}
                      {score.project && score.project.project_code && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {score.project.project_code}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-lg font-bold ${
                        score.overall_alignment_score >= 80 ? 'text-green-600 dark:text-green-400' :
                        score.overall_alignment_score >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {Math.round(score.overall_alignment_score || 0)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {score.strategic_alignment_score !== null ? Math.round(score.strategic_alignment_score) : '--'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {score.financial_alignment_score !== null ? Math.round(score.financial_alignment_score) : '--'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {score.operational_alignment_score !== null ? Math.round(score.operational_alignment_score) : '--'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {score.score_date && new Date(score.score_date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {scores.length === 0 && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Alignment Scores Yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Alignment scores will appear here once projects are mapped to strategic objectives
          </p>
        </div>
      )}
    </div>
  );
}

