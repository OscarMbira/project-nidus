import { Activity, AlertTriangle, CheckCircle } from 'lucide-react';

export default function PortfolioHealthGauge({ healthScore = 0 }) {
  const normalizedScore = Math.max(0, Math.min(100, healthScore));
  
  // Color based on health score
  let color, label, bgColor;
  if (normalizedScore >= 80) {
    color = '#10B981'; // green
    label = 'Healthy';
    bgColor = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
  } else if (normalizedScore >= 60) {
    color = '#F59E0B'; // yellow
    label = 'At Risk';
    bgColor = 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
  } else {
    color = '#EF4444'; // red
    label = 'Critical';
    bgColor = 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
  }

  // Gauge calculation (semi-circle)
  const radius = 80;
  const centerX = 120;
  const centerY = 120;
  const strokeWidth = 16;
  const circumference = Math.PI * radius;
  const progress = (normalizedScore / 100) * circumference;
  const remaining = circumference - progress;

  // Start angle (left side) to end angle (right side)
  const startAngle = Math.PI; // 180 degrees (left)
  const endAngle = 0; // 0 degrees (right)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${bgColor} p-6`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio Health Score
        </h3>
        {normalizedScore >= 80 ? (
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : normalizedScore >= 60 ? (
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
        )}
      </div>

      <div className="flex items-center justify-center">
        <svg width={240} height={140} viewBox="0 0 240 140" className="mx-auto">
          {/* Background arc */}
          <path
            d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            className="dark:stroke-gray-700"
            strokeLinecap="round"
          />
          
          {/* Progress arc */}
          {progress > 0 && (
            <path
              d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 ${normalizedScore > 50 ? 1 : 0} 1 ${
                centerX - radius * Math.cos((normalizedScore / 100) * Math.PI)
              } ${centerY - radius * Math.sin((normalizedScore / 100) * Math.PI)}`}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          )}

          {/* Score text */}
          <text
            x={centerX}
            y={centerY - 10}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-4xl font-bold fill-gray-900 dark:fill-white"
          >
            {Math.round(normalizedScore)}
          </text>
          <text
            x={centerX}
            y={centerY + 15}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-lg font-medium"
            style={{ fill: color }}
          >
            {label}
          </text>
          
          {/* Min/Max labels */}
          <text
            x={centerX - radius - 10}
            y={centerY + 5}
            textAnchor="middle"
            className="text-xs fill-gray-500 dark:fill-gray-400"
          >
            0
          </text>
          <text
            x={centerX + radius + 10}
            y={centerY + 5}
            textAnchor="middle"
            className="text-xs fill-gray-500 dark:fill-gray-400"
          >
            100
          </text>
        </svg>
      </div>

      {/* Health indicators */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Health Level:</span>
          <span className="font-medium" style={{ color }}>
            {label}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${normalizedScore}%`,
              backgroundColor: color,
            }}
          />
        </div>
      </div>
    </div>
  );
}

