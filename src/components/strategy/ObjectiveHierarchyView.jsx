import { useState, useEffect } from 'react';
import { Target, ChevronDown, ChevronRight, Plus, Edit2, Trash2, GitBranch } from 'lucide-react';
import { getStrategicObjectives, getObjectiveHierarchies, deleteObjectiveHierarchy } from '../../services/strategicService';

export default function ObjectiveHierarchyView({ onEdit, onAddHierarchy }) {
  const [objectives, setObjectives] = useState([]);
  const [hierarchies, setHierarchies] = useState([]);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [objectivesData, hierarchiesData] = await Promise.all([
        getStrategicObjectives(),
        getObjectiveHierarchies(),
      ]);
      setObjectives(objectivesData || []);
      setHierarchies(hierarchiesData || []);
      
      // Expand root nodes by default
      const rootNodes = (objectivesData || [])
        .filter(obj => !obj.parent_objective_id)
        .map(obj => obj.id);
      setExpandedNodes(new Set(rootNodes));
    } catch (error) {
      console.error('Error fetching hierarchy data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHierarchy = async (hierarchy) => {
    if (!window.confirm(`Are you sure you want to remove this hierarchy relationship?`)) {
      return;
    }

    try {
      setDeleting(hierarchy.id);
      await deleteObjectiveHierarchy(hierarchy.id);
      fetchData();
    } catch (error) {
      console.error('Error deleting hierarchy:', error);
      alert('Error deleting hierarchy: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const buildTree = () => {
    const tree = {};
    const rootNodes = [];

    // Initialize all nodes
    objectives.forEach(obj => {
      tree[obj.id] = {
        objective: obj,
        children: [],
      };
    });

    // Build parent-child relationships from hierarchies
    hierarchies.forEach(hierarchy => {
      if (hierarchy.hierarchy_type === 'parent_child') {
        const parentId = hierarchy.parent_objective_id;
        const childId = hierarchy.child_objective_id;
        if (tree[parentId] && tree[childId]) {
          tree[parentId].children.push({
            hierarchy,
            node: tree[childId],
          });
        }
      }
    });

    // Also use parent_objective_id from objectives for direct parent relationships
    objectives.forEach(obj => {
      if (obj.parent_objective_id && tree[obj.parent_objective_id]) {
        const existing = tree[obj.parent_objective_id].children.find(
          child => child.node.objective.id === obj.id
        );
        if (!existing) {
          tree[obj.parent_objective_id].children.push({
            hierarchy: null,
            node: tree[obj.id],
          });
        }
      }
    });

    // Find root nodes
    objectives.forEach(obj => {
      if (!obj.parent_objective_id) {
        const hasParentInHierarchies = hierarchies.some(
          h => h.child_objective_id === obj.id && h.hierarchy_type === 'parent_child'
        );
        if (!hasParentInHierarchies) {
          rootNodes.push(tree[obj.id]);
        }
      }
    });

    return rootNodes;
  };

  const renderNode = (node, level = 0) => {
    const { objective, children } = node;
    const isExpanded = expandedNodes.has(objective.id);
    const hasChildren = children.length > 0;

    return (
      <div key={objective.id} className="select-none">
        <div
          className={`flex items-center gap-2 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
            level === 0 ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 mb-2' : ''
          }`}
          style={{ marginLeft: `${level * 24}px` }}
        >
          <button
            onClick={() => hasChildren && toggleNode(objective.id)}
            className="w-6 h-6 flex items-center justify-center"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>

          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                {objective.objective_name}
              </span>
              {objective.objective_code && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({objective.objective_code})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded capitalize ${
                objective.objective_status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                objective.objective_status === 'completed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {objective.objective_status?.replace('_', ' ')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {objective.objective_category} • {objective.objective_level}
              </span>
              {objective.strategic_importance && (
                <span className="text-xs text-purple-600 dark:text-purple-400">
                  {Math.round(objective.strategic_importance)}% importance
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(objective)}
                className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20"
                title="Edit Objective"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            )}
            {onAddHierarchy && (
              <button
                onClick={() => onAddHierarchy(objective)}
                className="p-1.5 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 rounded hover:bg-green-50 dark:hover:bg-green-900/20"
                title="Add Child"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {children.map(({ hierarchy, node }) => (
              <div key={node.objective.id}>
                {hierarchy && (
                  <div
                    className="flex items-center gap-2 mb-1"
                    style={{ marginLeft: `${(level + 1) * 24 + 24}px` }}
                  >
                    <GitBranch className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {hierarchy.hierarchy_type?.replace('_', ' ')} • {Math.round(hierarchy.contribution_percentage || 100)}%
                    </span>
                    <button
                      onClick={() => handleDeleteHierarchy(hierarchy)}
                      disabled={deleting === hierarchy.id}
                      className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                      title="Remove Hierarchy"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {renderNode(node, level + 1)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const treeNodes = buildTree();

  if (treeNodes.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Target className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No Strategic Objectives
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          Create strategic objectives to view the hierarchy
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {treeNodes.map(node => renderNode(node))}
    </div>
  );
}

