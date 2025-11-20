import { useState, useEffect } from 'react';
import { Target, AlertCircle, CheckCircle, TrendingUp, Info } from 'lucide-react';
import { getStakeholderAnalysis } from '../../services/stakeholderService';

export default function PowerInterestMatrix({ projectId, stakeholders = [] }) {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchAnalysis();
    }
  }, [projectId]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      const data = await getStakeholderAnalysis({ project_id: projectId });
      setAnalysis(data || []);
    } catch (error) {
      console.error('Error fetching stakeholder analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group stakeholders by matrix quadrant
  const quadrantData = {
    'manage-closely': [], // High Power, High Interest
    'keep-satisfied': [], // High Power, Low Interest
    'monitor': [], // Low Power, Low Interest
    'keep-informed': [], // Low Power, High Interest
  };

  analysis.forEach(item => {
    const quadrant = item.matrix_quadrant || 'monitor';
    if (quadrantData[quadrant]) {
      quadrantData[quadrant].push(item);
    }
  });

  // Also include stakeholders without analysis
  stakeholders.forEach(stakeholder => {
    const hasAnalysis = analysis.some(a => a.stakeholder_id === stakeholder.id);
    if (!hasAnalysis) {
      quadrantData['monitor'].push({
        stakeholder,
        power_level: null,
        interest_level: null,
        matrix_quadrant: 'monitor',
      });
    }
  });

  const getQuadrantColor = (quadrant) => {
    switch (quadrant) {
      case 'manage-closely':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'keep-satisfied':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'monitor':
        return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
      case 'keep-informed':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600';
    }
  };

  const getQuadrantTitle = (quadrant) => {
    switch (quadrant) {
      case 'manage-closely':
        return 'Manage Closely';
      case 'keep-satisfied':
        return 'Keep Satisfied';
      case 'monitor':
        return 'Monitor';
      case 'keep-informed':
        return 'Keep Informed';
      default:
        return quadrant?.replace('-', ' ') || 'Unclassified';
    }
  };

  const getStakeholderPosition = (item) => {
    const power = item.power_level || 3;
    const interest = item.interest_level || 3;
    // Position on a 200x200 grid (0-200 range)
    const x = ((power - 1) / 4) * 200;
    const y = 200 - ((interest - 1) / 4) * 200; // Invert Y axis (0 at bottom, 200 at top)
    return { x, y };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const allItems = [...analysis, ...stakeholders.filter(s => !analysis.some(a => a.stakeholder_id === s.id)).map(s => ({ stakeholder: s, power_level: null, interest_level: null }))];

  return (
    <div className="space-y-6">
      {/* Matrix Visualization */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Target className="h-5 w-5" />
          Power/Interest Matrix
        </h3>
        
        <div className="relative">
          {/* Matrix Grid */}
          <svg width="100%" height="400" viewBox="0 0 220 220" className="border border-gray-300 dark:border-gray-600 rounded-lg">
            {/* Grid Lines */}
            <line x1="110" y1="0" x2="110" y2="220" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4" />
            <line x1="0" y1="110" x2="220" y2="110" stroke="#e5e7eb" strokeWidth="2" strokeDasharray="4" />
            
            {/* Quadrants */}
            <rect x="0" y="0" width="110" height="110" fill="#fef2f2" opacity="0.3" />
            <rect x="110" y="0" width="110" height="110" fill="#fefce8" opacity="0.3" />
            <rect x="0" y="110" width="110" height="110" fill="#eff6ff" opacity="0.3" />
            <rect x="110" y="110" width="110" height="110" fill="#f3f4f6" opacity="0.3" />
            
            {/* Labels */}
            <text x="55" y="15" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
              Manage Closely
            </text>
            <text x="165" y="15" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
              Keep Satisfied
            </text>
            <text x="55" y="205" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
              Keep Informed
            </text>
            <text x="165" y="205" textAnchor="middle" className="text-xs font-medium fill-gray-700 dark:fill-gray-300">
              Monitor
            </text>
            
            {/* Axis Labels */}
            <text x="110" y="235" textAnchor="middle" className="text-xs font-medium fill-gray-600 dark:fill-gray-400">
              Low Interest
            </text>
            <text x="110" y="-10" textAnchor="middle" className="text-xs font-medium fill-gray-600 dark:fill-gray-400">
              High Interest
            </text>
            <text x="-20" y="110" textAnchor="middle" transform="rotate(-90 -20 110)" className="text-xs font-medium fill-gray-600 dark:fill-gray-400">
              Low Power
            </text>
            <text x="240" y="110" textAnchor="middle" transform="rotate(90 240 110)" className="text-xs font-medium fill-gray-600 dark:fill-gray-400">
              High Power
            </text>
            
            {/* Stakeholder Points */}
            {allItems.map((item, index) => {
              if (!item.power_level || !item.interest_level) return null;
              const pos = getStakeholderPosition(item);
              const stakeholder = item.stakeholder || item;
              const name = stakeholder.stakeholder_name || 'Unknown';
              return (
                <g key={item.id || index}>
                  <circle
                    cx={pos.x + 10}
                    cy={pos.y + 10}
                    r="4"
                    fill="#3b82f6"
                    stroke="#1e40af"
                    strokeWidth="1"
                  />
                  <title>{name}</title>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <circle r="4" fill="#3b82f6" />
            <span>Stakeholder</span>
          </div>
        </div>
      </div>

      {/* Quadrant Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(quadrantData).map(([quadrant, items]) => (
          <div
            key={quadrant}
            className={`rounded-lg border p-4 ${getQuadrantColor(quadrant)}`}
          >
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              {quadrant === 'manage-closely' && <AlertCircle className="h-4 w-4 text-red-600" />}
              {quadrant === 'keep-satisfied' && <TrendingUp className="h-4 w-4 text-yellow-600" />}
              {quadrant === 'monitor' && <Info className="h-4 w-4 text-gray-600" />}
              {quadrant === 'keep-informed' && <CheckCircle className="h-4 w-4 text-blue-600" />}
              {getQuadrantTitle(quadrant)}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                ({items.length})
              </span>
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No stakeholders in this quadrant</p>
              ) : (
                items.slice(0, 10).map((item, index) => {
                  const stakeholder = item.stakeholder || item;
                  const name = stakeholder.stakeholder_name || 'Unknown';
                  return (
                    <div
                      key={item.id || stakeholder.id || index}
                      className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded px-2 py-1"
                    >
                      {name}
                      {item.power_level && item.interest_level && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Power: {item.power_level}/5, Interest: {item.interest_level}/5
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {items.length > 10 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  + {items.length - 10} more
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

