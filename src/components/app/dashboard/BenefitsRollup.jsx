/**
 * Benefits Rollup Component
 * 
 * Displays three-tier roll-up: Project → Programme → Portfolio
 * - Planned vs Forecast vs Realised benefits
 * - Benefits at risk indicator
 * - Drill-down by level
 * - Visual charts
 */

import { useState, useEffect, memo } from 'react';
import { Target, TrendingUp, TrendingDown, AlertTriangle, FolderKanban } from 'lucide-react';
import { getAllProgrammeRollups } from '../../../services/programmeService';
import { platformDb } from '../../../services/supabase/supabaseClient';

const BenefitsRollup = memo(function BenefitsRollup({ organizationId }) {
  const [rollups, setRollups] = useState([]);
  const [projectBenefits, setProjectBenefits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewLevel, setViewLevel] = useState('programme'); // 'project', 'programme', 'portfolio'

  useEffect(() => {
    if (organizationId) {
      loadBenefitsData();
    }
  }, [organizationId, viewLevel]);

  const loadBenefitsData = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      if (viewLevel === 'programme') {
        const result = await getAllProgrammeRollups(organizationId);
        if (result.success) {
          setRollups(result.data || []);
        } else {
          setError(result.error);
        }
      } else if (viewLevel === 'project') {
        // Get project-level benefits
        const { data: projects } = await platformDb
          .from('projects')
          .select('id, project_name, project_code')
          .eq('account_id', organizationId)
          .eq('is_deleted', false)
          .limit(50);

        if (projects) {
          const projectIds = projects.map(p => p.id);
          
          const { data: benefits } = await platformDb
            .from('programme_benefits')
            .select('*')
            .in('project_id', projectIds)
            .eq('is_deleted', false);

          // Group by project
          const projectMap = new Map();
          projects.forEach(project => {
            projectMap.set(project.id, {
              ...project,
              planned: 0,
              current: 0,
              realized: 0
            });
          });

          (benefits || []).forEach(benefit => {
            if (benefit.project_id && projectMap.has(benefit.project_id)) {
              const project = projectMap.get(benefit.project_id);
              project.planned += parseFloat(benefit.target_value || 0);
              project.current += parseFloat(benefit.current_value || 0);
              project.realized += parseFloat(benefit.realized_value || 0);
            }
          });

          setProjectBenefits(Array.from(projectMap.values()));
        }
      }
    } catch (err) {
      console.error('Error loading benefits data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateAtRisk = (planned, current, realized) => {
    const totalRealized = current + realized;
    const percentage = planned > 0 ? (totalRealized / planned) * 100 : 0;
    return percentage < 80; // Less than 80% realized is at risk
  };

  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-100 mb-4">Benefits Roll-up</h2>
        <div className="bg-gray-800 rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400">Error loading benefits: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-100">Benefits Roll-up</h2>
        <select
          value={viewLevel}
          onChange={(e) => setViewLevel(e.target.value)}
          className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-1.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="project">Project Level</option>
          <option value="programme">Programme Level</option>
        </select>
      </div>

      {viewLevel === 'programme' ? (
        rollups.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <FolderKanban className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No programme benefits found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rollups.map(rollup => {
              const planned = parseFloat(rollup.total_planned_benefits || 0);
              const realized = parseFloat(rollup.total_realised_benefits || 0);
              const atRisk = calculateAtRisk(planned, 0, realized);

              return (
                <div
                  key={rollup.programme_id}
                  className={`bg-gray-800 rounded-lg p-6 border-l-4 ${atRisk ? 'border-red-500' : 'border-green-500'}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100 mb-1">
                        {rollup.programme_name}
                      </h3>
                      {rollup.programme_code && (
                        <p className="text-sm text-gray-400">{rollup.programme_code}</p>
                      )}
                    </div>
                    {atRisk && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-red-900/30 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-sm text-red-400">At Risk</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Planned</div>
                      <div className="text-2xl font-bold text-gray-100">
                        ${planned.toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Forecast</div>
                      <div className="text-2xl font-bold text-gray-100">
                        ${(parseFloat(rollup.total_forecast_benefits || 0)).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-1">Realised</div>
                      <div className={`text-2xl font-bold ${realized >= planned * 0.8 ? 'text-green-400' : 'text-red-400'}`}>
                        ${realized.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {planned > 0 ? `${((realized / planned) * 100).toFixed(1)}%` : '0%'} of planned
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        projectBenefits.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <Target className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No project benefits found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {projectBenefits.map(project => {
              const atRisk = calculateAtRisk(project.planned, project.current, project.realized);

              return (
                <div
                  key={project.id}
                  className={`bg-gray-800 rounded-lg p-4 border-l-4 ${atRisk ? 'border-red-500' : 'border-green-500'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-100">{project.project_name}</h4>
                      {project.project_code && (
                        <p className="text-sm text-gray-400">{project.project_code}</p>
                      )}
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Planned: </span>
                        <span className="text-gray-100">${project.planned.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Realised: </span>
                        <span className={project.realized >= project.planned * 0.8 ? 'text-green-400' : 'text-red-400'}>
                          ${project.realized.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
});

export default BenefitsRollup;
