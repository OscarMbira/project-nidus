import { BarChart3, LineChart, PieChart, TrendingUp, Table } from 'lucide-react';

export default function ChartTypeSelector({ selectedType, onSelect, className = '' }) {
  const chartTypes = [
    { value: 'table', label: 'Table', icon: Table, description: 'Tabular data view' },
    { value: 'bar', label: 'Bar Chart', icon: BarChart3, description: 'Vertical or horizontal bars' },
    { value: 'line', label: 'Line Chart', icon: LineChart, description: 'Line graph for trends' },
    { value: 'pie', label: 'Pie Chart', icon: PieChart, description: 'Circular chart for proportions' },
    { value: 'area', label: 'Area Chart', icon: TrendingUp, description: 'Filled area under line' },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          Visualization Type
        </h3>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {chartTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selectedType === type.value;

          return (
            <button
              key={type.value}
              onClick={() => onSelect(type.value)}
              className={`p-4 rounded-lg border-2 transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-2">
                <Icon
                  className={`h-6 w-6 ${
                    isSelected
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-400'
                  }`}
                />
                <div>
                  <div
                    className={`text-sm font-medium ${
                      isSelected
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    {type.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {type.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

