import { useState, useEffect, useRef, useCallback } from 'react';
import { Target, AlertCircle, CheckCircle, TrendingUp, Info, Edit2 } from 'lucide-react';
import { getStakeholderAnalysis } from '../../services/stakeholderService';

function quadrantFromPowerInterest(power, interest) {
  const high = (v) => v >= 4;
  const low = (v) => v <= 2;
  if (high(power) && high(interest)) return 'manage-closely';
  if (high(power) && low(interest)) return 'keep-satisfied';
  if (low(power) && high(interest)) return 'keep-informed';
  return 'monitor';
}

export default function PowerInterestMatrix({ projectId, stakeholders = [], refreshTrigger, onStakeholderClick, onEditAnalysis, onReposition }) {
  const [analysis, setAnalysis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draggingItem, setDraggingItem] = useState(null);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const svgRef = useRef(null);
  const justRepositionedRef = useRef(false);

  useEffect(() => {
    if (projectId) {
      fetchAnalysis();
    }
  }, [projectId, refreshTrigger]);

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

  // Convert SVG coords (grid 10–210) to power_level and interest_level (1–5)
  const svgToPowerInterest = useCallback((svgX, svgY) => {
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    const gridX = svgX - 10;
    const gridY = svgY - 10;
    const power = clamp(Math.round((gridX / 200) * 4) + 1, 1, 5);
    const interest = clamp(Math.round(((200 - gridY) / 200) * 4) + 1, 1, 5);
    return { power_level: power, interest_level: interest, matrix_quadrant: quadrantFromPowerInterest(power, interest) };
  }, []);

  const getSvgPoint = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const { x, y } = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x, y };
  }, []);

  const handlePointerDown = useCallback((e, item) => {
    if (!onReposition || !item.stakeholder_id && !item.stakeholder?.id) return;
    e.preventDefault();
    setDraggingItem(item);
    const pos = getStakeholderPosition(item);
    setDragPosition({ x: pos.x + 10, y: pos.y + 10 });
  }, [onReposition, getStakeholderPosition]);

  useEffect(() => {
    if (!draggingItem) return;
    const handlePointerMove = (e) => {
      const pt = getSvgPoint(e.clientX, e.clientY);
      if (pt) setDragPosition({ x: pt.x, y: pt.y });
    };
    const handlePointerUp = (e) => {
      const pt = getSvgPoint(e.clientX, e.clientY);
      if (pt && onReposition) {
        justRepositionedRef.current = true;
        const { power_level, interest_level, matrix_quadrant } = svgToPowerInterest(pt.x, pt.y);
        const stakeholderId = draggingItem.stakeholder_id || draggingItem.stakeholder?.id;
        onReposition(
          { ...draggingItem, stakeholder_id: stakeholderId },
          { power_level, interest_level, matrix_quadrant }
        );
      }
      setDraggingItem(null);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draggingItem, onReposition, getSvgPoint, svgToPowerInterest]);

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
          <svg
            ref={svgRef}
            width="100%"
            height="400"
            viewBox="0 0 220 220"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
          >
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
            
            {/* Stakeholder Points – click opens profile; drag to reposition when onReposition provided */}
            {allItems.map((item, index) => {
              if (!item.power_level || !item.interest_level) return null;
              const pos = getStakeholderPosition(item);
              const stakeholder = item.stakeholder || item;
              const name = stakeholder.stakeholder_name || 'Unknown';
              const stakeholderId = item.stakeholder_id || stakeholder?.id;
              const isClickable = onStakeholderClick && stakeholderId;
              const isDraggable = onReposition && (item.id || stakeholderId);
              const isDragging = draggingItem && (draggingItem.id === item.id || (draggingItem.stakeholder_id || draggingItem.stakeholder?.id) === stakeholderId);
              const cx = isDragging ? dragPosition.x : pos.x + 10;
              const cy = isDragging ? dragPosition.y : pos.y + 10;
              return (
                <g
                  key={item.id || index}
                  onClick={() => {
                    if (justRepositionedRef.current) { justRepositionedRef.current = false; return; }
                    if (isClickable) onStakeholderClick(stakeholderId);
                  }}
                  onPointerDown={(e) => isDraggable && handlePointerDown(e, item)}
                  style={{ cursor: isDraggable ? 'grab' : isClickable ? 'pointer' : 'default' }}
                  className={isClickable || isDraggable ? 'hover:opacity-90' : ''}
                >
                  <circle
                    cx={cx}
                    cy={cy}
                    r="6"
                    fill={isDragging ? '#2563eb' : '#3b82f6'}
                    stroke="#1e40af"
                    strokeWidth={isDragging ? 2 : 1}
                    style={isDragging ? { cursor: 'grabbing' } : undefined}
                  />
                  <title>{name}{isDraggable ? ' — drag to reposition' : ''}</title>
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
                  const stakeholderId = item.stakeholder_id || stakeholder?.id;
                  const hasAnalysis = item.id && (item.power_level != null || item.interest_level != null);
                  return (
                    <div
                      key={item.id || stakeholder?.id || index}
                      className="text-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded px-2 py-1 flex items-center justify-between gap-2 group"
                    >
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => onStakeholderClick && stakeholderId && onStakeholderClick(stakeholderId)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && onStakeholderClick && stakeholderId && onStakeholderClick(stakeholderId)}
                      >
                        <span className="font-medium">{name}</span>
                        {item.power_level != null && item.interest_level != null && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            Power: {item.power_level}/5, Interest: {item.interest_level}/5
                          </div>
                        )}
                      </div>
                      {onEditAnalysis && projectId && stakeholderId && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEditAnalysis({ projectId, stakeholderId, analysisRecord: hasAnalysis ? item : null }); }}
                          className="flex-shrink-0 p-1 rounded text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                          title="Edit analysis"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
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

