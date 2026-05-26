import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, CheckCircle, XCircle, AlertTriangle, Calendar, User } from 'lucide-react';
import { getQualityInspections, deleteQualityInspection } from '../services/qualityManagementService';
import QualityInspectionForm from '../components/quality/QualityInspectionForm';
import ExportListMenu from '../components/ui/ExportListMenu';
import { supabase } from '../services/supabaseClient';
import { TableRowNumberHeader, TableRowNumberCell } from '../components/ui/Table'
import { getDisplayRowNumber } from '../utils/tableRowNumberUtils'

export default function QualityInspections() {
  const navigate = useNavigate();
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [projects, setProjects] = useState([]);
  const [deleting, setDeleting] = useState(null);
  const [filters, setFilters] = useState({
    project_id: '',
    quality_register_id: '',
    inspection_status: '',
    search: '',
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setFilters(prev => ({ ...prev, project_id: selectedProjectId }));
    }
    fetchInspections();
  }, [filters, selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const { data } = await supabase
        .from('projects')
        .select('id, project_name, project_code')
        .eq('is_deleted', false)
        .order('project_name', { ascending: true });

      if (data) setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const data = await getQualityInspections(filters);
      setInspections(data || []);
    } catch (error) {
      console.error('Error fetching inspections:', error);
      alert('Error loading quality inspections: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInspection = () => {
    setSelectedInspection(null);
    setShowInspectionForm(true);
  };

  const handleEditInspection = (inspection) => {
    setSelectedInspection(inspection);
    setShowInspectionForm(true);
  };

  const handleDelete = async (inspection) => {
    if (!window.confirm(`Are you sure you want to delete inspection "${inspection.inspection_title}"?`)) {
      return;
    }

    try {
      setDeleting(inspection.id);
      await deleteQualityInspection(inspection.id);
      fetchInspections();
    } catch (error) {
      console.error('Error deleting inspection:', error);
      alert('Error deleting inspection: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleInspectionSaved = () => {
    setShowInspectionForm(false);
    setSelectedInspection(null);
    fetchInspections();
  };

  const getResultColor = (result) => {
    switch (result) {
      case 'passed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'passed-with-conditions':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'deferred':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getResultIcon = (result) => {
    switch (result) {
      case 'passed':
        return <CheckCircle className="h-4 w-4" />;
      case 'passed-with-conditions':
        return <AlertTriangle className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
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
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate('/platform/quality-management')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Search className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              Quality Inspections
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Record and track quality inspection results
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportListMenu
              columns={[
                { key: 'inspection_title', label: 'Inspection' },
                { key: 'inspection_reference', label: 'Reference' },
                { key: 'inspection_type', label: 'Type' },
                { key: 'product_name', label: 'Product/Deliverable' },
                { key: 'inspector_name', label: 'Inspector' },
                { key: 'inspection_date', label: 'Date' },
                { key: 'defects_found_count', label: 'Defects' },
                { key: 'inspection_result', label: 'Result' },
                { key: 'project_name', label: 'Project' },
              ]}
              data={inspections.map(i => ({
                inspection_title: i.inspection_title,
                inspection_reference: i.inspection_reference || '',
                inspection_type: i.inspection_type || '',
                product_name: i.quality_register?.product_name || 'N/A',
                inspector_name: i.inspector?.full_name || i.inspector?.email || 'N/A',
                inspection_date: i.inspection_date || '',
                defects_found_count: i.defects_found_count ?? '',
                inspection_result: i.inspection_result || '',
                project_name: i.project?.project_name || '',
              }))}
              baseFilename="Quality-Inspections"
              disabled={inspections.length === 0}
            />
            <button
              onClick={handleCreateInspection}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Inspection
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Filter by Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
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
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search inspections..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.inspection_status || ''}
            onChange={(e) => setFilters({ ...filters, inspection_status: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="planned">Planned</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Inspections List */}
      {inspections.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Search className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Quality Inspections
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Create your first quality inspection to start recording inspection results
          </p>
          <button
            onClick={handleCreateInspection}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Inspection
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                <TableRowNumberHeader className="!normal-case" />
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Inspection
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product/Deliverable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Inspector
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Defects
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Result
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {inspections.map((inspection, index) => (
                  <tr key={inspection.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {inspection.inspection_title}
                        </div>
                        {inspection.inspection_reference && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {inspection.inspection_reference}
                          </div>
                        )}
                        {inspection.project && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            {inspection.project.project_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 dark:text-white capitalize">
                        {inspection.inspection_type?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inspection.quality_register ? (
                        <div className="text-sm text-gray-900 dark:text-white">
                          {inspection.quality_register.product_name}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inspection.inspector ? (
                        <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-white">
                          <User className="h-3 w-3 text-gray-400" />
                          {inspection.inspector.full_name || inspection.inspector.email}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {inspection.inspection_date ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(inspection.inspection_date).toLocaleDateString()}
                        </div>
                      ) : (
                        'Not set'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {inspection.defects_found_count > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {inspection.defects_found_count} total
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {inspection.critical_defects_count > 0 && (
                              <span className="text-red-600 dark:text-red-400 mr-2">
                                {inspection.critical_defects_count} critical
                              </span>
                            )}
                            {inspection.major_defects_count > 0 && (
                              <span className="text-orange-600 dark:text-orange-400 mr-2">
                                {inspection.major_defects_count} major
                              </span>
                            )}
                            {inspection.minor_defects_count > 0 && (
                              <span className="text-yellow-600 dark:text-yellow-400">
                                {inspection.minor_defects_count} minor
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-green-600 dark:text-green-400">No defects</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${getResultColor(inspection.inspection_result)}`}>
                        {getResultIcon(inspection.inspection_result)}
                        {inspection.inspection_result?.replace('-', ' ')}
                      </span>
                      {inspection.inspection_score !== null && (
                        <div className={`text-xs mt-1 font-semibold ${
                          inspection.inspection_score >= 90 ? 'text-green-600 dark:text-green-400' :
                          inspection.inspection_score >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                          'text-red-600 dark:text-red-400'
                        }`}>
                          {Math.round(inspection.inspection_score)}%
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEditInspection(inspection)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Edit Inspection"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(inspection)}
                          disabled={deleting === inspection.id}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                          title="Delete Inspection"
                        >
                          Delete
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

      {/* Inspection Form Modal */}
      {showInspectionForm && (
        <QualityInspectionForm
          inspection={selectedInspection}
          projectId={selectedProjectId || null}
          qualityRegisterId={selectedRegisterId || null}
          onSave={handleInspectionSaved}
          onCancel={() => {
            setShowInspectionForm(false);
            setSelectedInspection(null);
          }}
        />
      )}
    </div>
  );
}

