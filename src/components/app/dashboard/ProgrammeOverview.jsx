/**
 * Programme Overview Component
 * 
 * Displays grid of programme cards with:
 * - Programme RAG status visual
 * - Programme metrics (# projects, budget, benefits)
 * - "Create Programme" button
 * - Click to view programme details
 */

import { useState, useEffect, memo } from 'react';
import { 
  FolderKanban, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  Target,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { getProgramme, getAllProgrammeRollups } from '../../../services/programmeService';
import { platformDb } from '../../../services/supabase/supabaseClient';
import ProgrammeDetailModal from './ProgrammeDetailModal';
import CreateProgrammeModal from './CreateProgrammeModal';

const ProgrammeOverview = memo(function ProgrammeOverview({ organizationId }) {
  const [programmes, setProgrammes] = useState([]);
  const [rollups, setRollups] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProgramme, setSelectedProgramme] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadProgrammes();
    }
  }, [organizationId]);

  const loadProgrammes = async () => {
    if (!organizationId) return;

    setLoading(true);
    setError(null);

    try {
      // Get programmes - filter by projects in this account
      // First get project IDs for this account
      const { data: accountProjects } = await platformDb
        .from('projects')
        .select('id')
        .eq('account_id', organizationId)
        .eq('is_deleted', false);

      const projectIds = accountProjects?.map(p => p.id) || [];

      // Get programmes that have projects in this account
      let programmesData = [];
      if (projectIds.length > 0) {
        const { data: programmeProjects } = await platformDb
          .from('programme_projects')
          .select('programme_id')
          .in('project_id', projectIds)
          .eq('is_deleted', false);

        const programmeIds = [...new Set(programmeProjects?.map(pp => pp.programme_id) || [])];
        
        if (programmeIds.length > 0) {
          programmesData = await Promise.all(
            programmeIds.map(id => getProgramme(id))
          );
        }
      }
      
      // Also get programmes without projects (orphan programmes)
      const allProgrammes = await getProgrammes();
      const orphanProgrammes = (allProgrammes || []).filter(p => 
        !programmesData.find(ep => ep.id === p.id)
      );
      programmesData = [...programmesData, ...orphanProgrammes];
      
      // Get rollup data
      const rollupResult = await getAllProgrammeRollups(organizationId);
      
      if (rollupResult.success) {
        const rollupMap = {};
        (rollupResult.data || []).forEach(rollup => {
          rollupMap[rollup.programme_id] = rollout;
        });
        setRollups(rollupMap);
      }

      setProgrammes(programmesData || []);
    } catch (err) {
      console.error('Error loading programmes:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRAGColor = (ragStatus) => {
    const status = ragStatus?.toLowerCase() || 'green';
    if (status === 'red') return 'bg-red-500';
    if (status === 'amber' || status === 'yellow') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRAGLabel = (ragStatus) => {
    const status = ragStatus?.toLowerCase() || 'green';
    if (status === 'red') return 'Red';
    if (status === 'amber' || status === 'yellow') return 'Amber';
    return 'Green';
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">Programmes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-lg p-6 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-8">
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400">Error loading programmes: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">Programmes</h2>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5" />
            Create Programme
          </button>
        </div>

        {programmes.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-12 text-center">
            <FolderKanban className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No programmes found</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Create Your First Programme
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {programmes.map(programme => {
              const rollup = rollups[programme.id];
              const ragStatus = programme.rag_status || rollup?.programme_rag_status || 'green';

              return (
                <div
                  key={programme.id}
                  onClick={() => setSelectedProgramme(programme)}
                  className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 cursor-pointer transition-colors border border-gray-700 hover:border-gray-600"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-100 mb-1">
                        {programme.programme_name}
                      </h3>
                      {programme.programme_code && (
                        <p className="text-sm text-gray-400">{programme.programme_code}</p>
                      )}
                    </div>
                    <div className={`w-3 h-3 rounded-full ${getRAGColor(ragStatus)}`} title={getRAGLabel(ragStatus)} />
                  </div>

                  <div className="space-y-3">
                    {/* Projects Count */}
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <FolderKanban className="h-4 w-4 text-gray-400" />
                      <span>
                        {rollup?.total_projects || 0} Projects
                        {rollup?.active_projects > 0 && (
                          <span className="text-gray-500 ml-1">
                            ({rollup.active_projects} active)
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Budget */}
                    {rollup?.total_budget > 0 && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        <span>
                          ${(rollup.total_budget || 0).toLocaleString()}
                          {rollup.total_spent > 0 && (
                            <span className="text-gray-500 ml-1">
                              (${(rollup.total_spent || 0).toLocaleString()} spent)
                            </span>
                          )}
                        </span>
                      </div>
                    )}

                    {/* Benefits */}
                    {(rollup?.total_planned_benefits > 0 || rollup?.total_realised_benefits > 0) && (
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Target className="h-4 w-4 text-gray-400" />
                        <span>
                          Benefits: ${(rollup.total_realised_benefits || 0).toLocaleString()} / ${(rollup.total_planned_benefits || 0).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {/* Status */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className={`px-2 py-1 rounded text-xs ${
                        programme.programme_status === 'active' ? 'bg-green-900/30 text-green-400' :
                        programme.programme_status === 'on_hold' ? 'bg-yellow-900/30 text-yellow-400' :
                        programme.programme_status === 'completed' ? 'bg-blue-900/30 text-blue-400' :
                        'bg-gray-700 text-gray-400'
                      }`}>
                        {programme.programme_status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Programme Detail Modal */}
      {selectedProgramme && (
        <ProgrammeDetailModal
          programme={selectedProgramme}
          rollup={rollups[selectedProgramme.id]}
          onClose={() => setSelectedProgramme(null)}
          onRefresh={loadProgrammes}
        />
      )}

      {/* Create Programme Modal */}
      {showCreateModal && (
        <CreateProgrammeModal
          organizationId={organizationId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadProgrammes();
          }}
        />
      )}
    </>
  );
});

export default ProgrammeOverview;
