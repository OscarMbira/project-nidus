import { useState, useEffect } from 'react';
import { Database, ChevronDown, Check } from 'lucide-react';
import { getAvailableDataSources } from '../../services/reportBuilderService';

export default function DataSourceSelector({ selectedDataSource, onSelect, className = '' }) {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const sources = await getAvailableDataSources();
      setDataSources(sources);
    } catch (error) {
      console.error('Error fetching data sources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (source) => {
    onSelect(source);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium">
            {selectedDataSource ? selectedDataSource.name : 'Select Data Source'}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : dataSources.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                No data sources available
              </div>
            ) : (
              <div className="py-1">
                {dataSources.map((source) => (
                  <button
                    key={source.id}
                    onClick={() => handleSelect(source)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                      selectedDataSource?.id === source.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{source.name}</div>
                      {source.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {source.description}
                        </div>
                      )}
                    </div>
                    {selectedDataSource?.id === source.id && (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

