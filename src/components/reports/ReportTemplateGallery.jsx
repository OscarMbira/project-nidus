import { useState, useEffect } from 'react';
import { FileText, Star, Download, Plus } from 'lucide-react';
import { getReportTemplates } from '../../services/reportBuilderService';

export default function ReportTemplateGallery({ onSelectTemplate, onCreateFromTemplate, className = '' }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    fetchTemplates();
  }, [selectedCategory]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const filters = {};
      if (selectedCategory) filters.category_id = selectedCategory;
      
      const data = await getReportTemplates(filters);
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching report templates:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center ${className}`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Report Templates
        </h3>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Templates Available
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Report templates will appear here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onSelectTemplate && onSelectTemplate(template)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {template.template_name}
                  </h4>
                  {template.is_system_template && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <Star className="h-3 w-3 fill-current" />
                      System Template
                    </span>
                  )}
                </div>
              </div>
              
              {template.template_description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {template.template_description}
                </p>
              )}

              {template.category && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Category: {template.category.category_name}
                </div>
              )}

              <div className="flex items-center gap-2">
                {onCreateFromTemplate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCreateFromTemplate(template);
                    }}
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Use Template
                  </button>
                )}
                {onSelectTemplate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTemplate(template);
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm transition-colors"
                  >
                    Preview
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

