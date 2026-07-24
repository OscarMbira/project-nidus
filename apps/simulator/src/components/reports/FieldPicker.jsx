import { useState } from 'react';
import { CheckSquare, Square, Search } from 'lucide-react';
import { getDataSourceFields } from '../../services/reportBuilderService';

export default function FieldPicker({ dataSource, selectedFields = [], onFieldsChange, className = '' }) {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useState(() => {
    if (dataSource) {
      fetchFields();
    }
  }, [dataSource]);

  const fetchFields = async () => {
    if (!dataSource) return;
    
    try {
      setLoading(true);
      const fieldList = await getDataSourceFields(dataSource.id);
      setFields(fieldList);
    } catch (error) {
      console.error('Error fetching fields:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (field) => {
    const isSelected = selectedFields.some(f => f.name === field.name);
    if (isSelected) {
      onFieldsChange(selectedFields.filter(f => f.name !== field.name));
    } else {
      onFieldsChange([...selectedFields, field]);
    }
  };

  const filteredFields = fields.filter(field =>
    field.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    field.label?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!dataSource) {
    return (
      <div className={`p-4 text-center text-gray-500 dark:text-gray-400 ${className}`}>
        Please select a data source first
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Available Fields
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            ({selectedFields.length} selected)
          </span>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            Loading fields...
          </div>
        ) : filteredFields.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No fields match your search' : 'No fields available'}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFields.map((field) => {
              const isSelected = selectedFields.some(f => f.name === field.name);
              return (
                <button
                  key={field.name}
                  onClick={() => toggleField(field)}
                  className={`w-full px-3 py-2 rounded-lg text-left flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Square className="h-4 w-4 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium">{field.label || field.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {field.name} ({field.type})
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

