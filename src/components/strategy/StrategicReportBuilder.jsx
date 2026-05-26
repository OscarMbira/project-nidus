import { useState, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, Download, Eye, Calendar, FolderKanban, Target } from 'lucide-react';
import { getStrategicReports, deleteStrategicReport } from '../../services/strategicService';
import { supabase } from '../../services/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function StrategicReportBuilder({ portfolioId = null, projectId = null, onGenerate }) {
  const [reports, setReports] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filters, setFilters] = useState({
    portfolio_id: portfolioId || '',
    project_id: projectId || '',
    report_type: '',
    report_status: '',
  });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchLookupData();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [filters]);

  const fetchLookupData = async () => {
    try {
      const [portfoliosData, projectsData] = await Promise.all([
        supabase
          .from('portfolios')
          .select('id, portfolio_name, portfolio_code')
          .eq('is_deleted', false)
          .order('portfolio_name', { ascending: true }),
        supabase
          .from('projects')
          .select('id, project_name, project_code')
          .eq('is_deleted', false)
          .order('project_name', { ascending: true }),
      ]);

      if (portfoliosData.data) setPortfolios(portfoliosData.data);
      if (projectsData.data) setProjects(projectsData.data);
    } catch (error) {
      console.error('Error fetching lookup data:', error);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const filterObj = {};
      if (filters.portfolio_id) filterObj.portfolio_id = filters.portfolio_id;
      if (filters.project_id) filterObj.project_id = filters.project_id;
      if (filters.report_type) filterObj.report_type = filters.report_type;
      if (filters.report_status) filterObj.report_status = filters.report_status;

      const data = await getStrategicReports(filterObj);
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (report) => {
    if (!window.confirm(`Are you sure you want to delete the report "${report.report_name}"?`)) {
      return;
    }

    try {
      setDeleting(report.id);
      await deleteStrategicReport(report.id);
      fetchReports();
    } catch (error) {
      console.error('Error deleting report:', error);
      alert('Error deleting report: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const getReportTypeColor = (type) => {
    switch (type) {
      case 'comprehensive':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'alignment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'contribution':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'objective_status':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'portfolio_optimization':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'final':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'archived':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters and Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Portfolio
            </label>
            <select
              value={filters.portfolio_id}
              onChange={(e) => setFilters({ ...filters, portfolio_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Portfolios</option>
              {portfolios.map(portfolio => (
                <option key={portfolio.id} value={portfolio.id}>
                  {portfolio.portfolio_name} {portfolio.portfolio_code ? `(${portfolio.portfolio_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Project
            </label>
            <select
              value={filters.project_id}
              onChange={(e) => setFilters({ ...filters, project_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Projects</option>
              {projects.map(project => (
                <option key={project.id} value={project.id}>
                  {project.project_name} {project.project_code ? `(${project.project_code})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Report Type
            </label>
            <select
              value={filters.report_type}
              onChange={(e) => setFilters({ ...filters, report_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Types</option>
              <option value="alignment">Alignment</option>
              <option value="contribution">Contribution</option>
              <option value="objective_status">Objective Status</option>
              <option value="portfolio_optimization">Portfolio Optimization</option>
              <option value="comprehensive">Comprehensive</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={filters.report_status}
              onChange={(e) => setFilters({ ...filters, report_status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="final">Final</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {onGenerate && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => onGenerate({ portfolioId: filters.portfolio_id, projectId: filters.project_id })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Generate New Report
            </button>
          </div>
        )}
      </div>

      {/* Reports List */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Strategic Reports
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Generate strategic alignment reports to track progress
          </p>
          {onGenerate && (
            <button
              onClick={() => onGenerate({ portfolioId: filters.portfolio_id, projectId: filters.project_id })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              Generate First Report
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Report Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Context
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Generated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {reports.map((report, index) => (
                  <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {report.report_name}
                          </div>
                          {report.report_description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md truncate">
                              {report.report_description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {report.portfolio ? (
                          <div className="flex items-center gap-1">
                            <FolderKanban className="h-3 w-3 text-purple-500" />
                            <span>{report.portfolio.portfolio_name}</span>
                          </div>
                        ) : report.project ? (
                          <div className="flex items-center gap-1">
                            <Target className="h-3 w-3 text-blue-500" />
                            <span>{report.project.project_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getReportTypeColor(report.report_type)}`}>
                        {report.report_type?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.report_start_date && report.report_end_date ? (
                        <div>
                          <div>{new Date(report.report_start_date).toLocaleDateString()}</div>
                          <div className="text-xs">to</div>
                          <div>{new Date(report.report_end_date).toLocaleDateString()}</div>
                        </div>
                      ) : (
                        <span className="text-xs">Not specified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${getStatusColor(report.report_status)}`}>
                        {report.report_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {report.report_date && new Date(report.report_date).toLocaleDateString()}
                      {report.generated_by && (
                        <div className="text-xs text-gray-400 mt-1">
                          by {report.generated_by.full_name || report.generated_by.email}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {report.report_file_url && (
                          <a
                            href={report.report_file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Download Report"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                        {onEdit && (
                          <button
                            onClick={() => onEdit(report)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit Report"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(report)}
                          disabled={deleting === report.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete Report"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

