/**
 * PMO Control Strip Component
 * 
 * Displays 5 intervention signals for PMO oversight:
 * 1. Projects Requiring Attention (RAG != Green)
 * 2. Projects in Exception
 * 3. Overdue Stage/Phase Gates
 * 4. PM Capacity Breaches
 * 5. Orphan Projects (no programme/no board)
 * 
 * Each signal is clickable and drills down to filtered project lists
 */

import { useState, useEffect, memo } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Users, 
  FolderX,
  X,
  ChevronRight
} from 'lucide-react';
import { getPMOControlStripData } from '../../../services/pmoAdminService';
import { platformDb } from '../../../services/supabase/supabaseClient';
import { useNavigate } from 'react-router-dom';

const PMOControlStrip = memo(function PMOControlStrip({ organizationId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSignal, setSelectedSignal] = useState(null);
  const [drillDownProjects, setDrillDownProjects] = useState([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (organizationId) {
      loadControlStripData();
    }
  }, [organizationId]);

  const loadControlStripData = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    const result = await getPMOControlStripData(organizationId);

    if (result.success) {
      setData(result.data);
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleSignalClick = async (signalType) => {
    setSelectedSignal(signalType);
    setDrillDownLoading(true);
    setDrillDownProjects([]);

    try {
      let projects = [];

      switch (signalType) {
        case 'attention':
          // Projects requiring attention (RAG != Green)
          const { data: attentionProjects } = await platformDb
            .from('projects')
            .select(`
              id,
              project_name,
              project_code,
              health_status,
              status_id,
              project_statuses:status_id (status_name)
            `)
            .eq('account_id', organizationId)
            .in('health_status', ['red', 'Red', 'amber', 'yellow', 'Amber', 'Yellow'])
            .eq('is_deleted', false)
            .order('project_name');

          projects = attentionProjects || [];
          break;

        case 'exception':
          // Projects in exception
          const { data: exceptionProjects } = await platformDb
            .from('exceptions')
            .select(`
              id,
              exception_title,
              exception_level,
              exception_status,
              project_id,
              projects:project_id (
                id,
                project_name,
                project_code,
                health_status
              )
            `)
            .in('exception_status', ['OPEN', 'ESCALATED', 'UNDER_REVIEW'])
            .eq('is_deleted', false)
            .order('raised_at', { ascending: false });

          projects = (exceptionProjects || []).map(e => ({
            ...e.projects,
            exception: {
              id: e.id,
              title: e.exception_title,
              level: e.exception_level,
              status: e.exception_status
            }
          }));
          break;

        case 'gates':
          // Overdue stage gates
          const { data: overdueGates } = await platformDb
            .from('stage_boundaries')
            .select(`
              id,
              gate_name,
              stage_name,
              planned_date,
              status,
              project_id,
              projects:project_id (
                id,
                project_name,
                project_code
              )
            `)
            .eq('is_deleted', false)
            .not('status', 'in', '(approved,rejected)')
            .lt('planned_date', new Date().toISOString().split('T')[0])
            .order('planned_date', { ascending: true });

          projects = (overdueGates || []).map(gate => ({
            ...gate.projects,
            gate: {
              id: gate.id,
              name: gate.gate_name,
              stage: gate.stage_name,
              plannedDate: gate.planned_date,
              status: gate.status
            }
          }));
          break;

        case 'capacity':
          // PM capacity breaches
          const { data: pmBreaches } = await platformDb
            .from('pm_capacity_view')
            .select('*')
            .eq('capacity_status', 'BREACH');

          // Get projects for breached PMs
          const pmIds = (pmBreaches || []).map(pm => pm.pm_user_id);
          if (pmIds.length > 0) {
            const { data: breachProjects } = await platformDb
              .from('project_assignments')
              .select(`
                project_id,
                user_id,
                projects:project_id (
                  id,
                  project_name,
                  project_code,
                  health_status
                ),
                users:user_id (
                  id,
                  full_name,
                  email
                )
              `)
              .in('user_id', pmIds)
              .eq('assignment_type', 'PROJECT_MANAGER')
              .eq('is_active', true)
              .eq('is_deleted', false);

            projects = (breachProjects || []).map(pa => ({
              ...pa.projects,
              pm: pa.users
            }));
          }
          break;

        case 'orphan':
          // Orphan projects
          const { data: orphanProjects } = await platformDb
            .from('projects')
            .select(`
              id,
              project_name,
              project_code,
              health_status,
              has_board,
              status_id,
              project_statuses:status_id (status_name)
            `)
            .eq('account_id', organizationId)
            .eq('is_orphan', true)
            .eq('is_deleted', false)
            .order('project_name');

          projects = orphanProjects || [];
          break;

        default:
          break;
      }

      setDrillDownProjects(projects);
    } catch (err) {
      console.error('Error loading drill-down data:', err);
      setError(err.message);
    } finally {
      setDrillDownLoading(false);
    }
  };

  const getSignalConfig = (type) => {
    const configs = {
      attention: {
        label: 'Projects Requiring Attention',
        icon: AlertTriangle,
        color: 'yellow',
        bgColor: 'bg-yellow-900/20',
        borderColor: 'border-yellow-500/50',
        textColor: 'text-yellow-400',
        count: data?.projects_requiring_attention || 0
      },
      exception: {
        label: 'Projects in Exception',
        icon: AlertCircle,
        color: 'red',
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-500/50',
        textColor: 'text-red-400',
        count: data?.projects_in_exception || 0
      },
      gates: {
        label: 'Overdue Stage Gates',
        icon: Clock,
        color: 'orange',
        bgColor: 'bg-orange-900/20',
        borderColor: 'border-orange-500/50',
        textColor: 'text-orange-400',
        count: data?.overdue_stage_gates || 0
      },
      capacity: {
        label: 'PM Capacity Breaches',
        icon: Users,
        color: 'red',
        bgColor: 'bg-red-900/20',
        borderColor: 'border-red-500/50',
        textColor: 'text-red-400',
        count: data?.pm_capacity_breaches || 0
      },
      orphan: {
        label: 'Orphan Projects',
        icon: FolderX,
        color: 'amber',
        bgColor: 'bg-amber-900/20',
        borderColor: 'border-amber-500/50',
        textColor: 'text-amber-400',
        count: data?.orphan_projects || 0
      }
    };
    return configs[type];
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-gray-200 dark:bg-gray-800 rounded-lg p-4 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-700 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4 mb-8">
        <p className="text-red-400">Error loading PMO Control Strip: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  const signals = ['attention', 'exception', 'gates', 'capacity', 'orphan'];

  return (
    <>
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">PMO Control Strip</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {signals.map(signalType => {
            const config = getSignalConfig(signalType);
            const Icon = config.icon;
            const hasIssues = config.count > 0;

            return (
              <button
                key={signalType}
                onClick={() => handleSignalClick(signalType)}
                className={`
                  ${config.bgColor} ${config.borderColor} ${config.textColor}
                  border-2 rounded-lg p-4 text-left transition-all
                  hover:scale-105 hover:shadow-lg
                  ${hasIssues ? 'ring-2 ring-offset-2 ring-offset-gray-900' : 'opacity-75'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-6 w-6 ${hasIssues ? '' : 'opacity-50'}`} />
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </div>
                <div className="text-sm font-medium mb-1">{config.label}</div>
                <div className={`text-3xl font-bold ${hasIssues ? '' : 'opacity-50'}`}>
                  {config.count}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drill-down Modal */}
      {selectedSignal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {getSignalConfig(selectedSignal).label}
              </h3>
              <button
                onClick={() => {
                  setSelectedSignal(null);
                  setDrillDownProjects([]);
                }}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {drillDownLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : drillDownProjects.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  No items found
                </div>
              ) : (
                <div className="space-y-3">
                  {drillDownProjects.map((project, index) => (
                    <div
                      key={project.id || index}
                      className="bg-gray-700/50 rounded-lg p-4 hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => {
                        if (project.id) {
                          navigate(`/platform/projects/${project.id}`);
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {project.project_name || 'Unknown Project'}
                          </div>
                          {project.project_code && (
                            <div className="text-sm text-gray-400">{project.project_code}</div>
                          )}
                          {project.exception && (
                            <div className="mt-2">
                              <span className="text-xs px-2 py-1 rounded bg-red-900/30 text-red-400">
                                {project.exception.level} - {project.exception.title}
                              </span>
                            </div>
                          )}
                          {project.gate && (
                            <div className="mt-2 text-sm text-gray-400">
                              Gate: {project.gate.name} - Due: {new Date(project.gate.plannedDate).toLocaleDateString()}
                            </div>
                          )}
                          {project.pm && (
                            <div className="mt-2 text-sm text-gray-400">
                              PM: {project.pm.full_name}
                            </div>
                          )}
                        </div>
                        {project.health_status && (
                          <div className={`
                            px-3 py-1 rounded text-xs font-medium
                            ${project.health_status.toLowerCase() === 'red' ? 'bg-red-900/30 text-red-400' : ''}
                            ${project.health_status.toLowerCase() === 'amber' || project.health_status.toLowerCase() === 'yellow' ? 'bg-yellow-900/30 text-yellow-400' : ''}
                            ${project.health_status.toLowerCase() === 'green' ? 'bg-green-900/30 text-green-400' : ''}
                          `}>
                            {project.health_status}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default PMOControlStrip;
