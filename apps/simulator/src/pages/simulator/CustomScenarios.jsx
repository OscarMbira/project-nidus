import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Upload, FileText, CheckCircle, XCircle, Clock, Globe, Edit, Eye } from 'lucide-react';
import {
  getUserCustomScenarios,
  uploadScenarioDocument,
  uploadScenarioText,
  validateCustomScenario,
  publishCustomScenario,
  calculateQualityScore,
} from '../../services/customScenarioService';
import { simDb } from '../../services/supabase/supabaseClient';

const CustomScenarios = () => {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [scenarios, setScenarios] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('document'); // 'document' or 'text'
  const [textContent, setTextContent] = useState('');
  const [scenarioName, setScenarioName] = useState('');
  const [userId, setUserId] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [validating, setValidating] = useState(null);
  const [publishing, setPublishing] = useState(null);

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      loadScenarios();
    }
  }, [userId]);

  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await simDb.auth.getUser();
      setUserId(user?.id);
    } catch (error) {
      console.error('Error getting user:', error);
    }
  };

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const data = await getUserCustomScenarios(userId);
      setScenarios(data);
    } catch (error) {
      console.error('Error loading custom scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      await uploadScenarioDocument(userId, file);
      await loadScenarios();
      setShowUploadModal(false);
      alert('Document uploaded successfully! Processing will begin shortly.');
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error uploading file: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleTextUpload = async () => {
    if (!textContent.trim() || !scenarioName.trim()) {
      alert('Please provide both scenario name and content');
      return;
    }

    try {
      setUploading(true);
      await uploadScenarioText(userId, textContent, scenarioName);
      await loadScenarios();
      setShowUploadModal(false);
      setTextContent('');
      setScenarioName('');
      alert('Text uploaded successfully! Processing will begin shortly.');
    } catch (error) {
      console.error('Error uploading text:', error);
      alert('Error uploading text: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleValidate = async (scenarioId) => {
    try {
      setValidating(scenarioId);
      await validateCustomScenario(scenarioId);
      await loadScenarios();
    } catch (error) {
      console.error('Error validating scenario:', error);
      alert('Error validating scenario: ' + error.message);
    } finally {
      setValidating(null);
    }
  };

  const handlePublish = async (scenarioId) => {
    if (!confirm('Publish this scenario to make it available to other users?')) {
      return;
    }

    try {
      setPublishing(scenarioId);
      await publishCustomScenario(scenarioId);
      await loadScenarios();
      alert('Scenario published successfully!');
    } catch (error) {
      console.error('Error publishing scenario:', error);
      alert('Error publishing scenario: ' + error.message);
    } finally {
      setPublishing(null);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'valid':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'invalid':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'invalid':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Custom Scenarios</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Create your own scenarios by uploading documents or entering text
            </p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Upload className="w-5 h-5" />
            <span>Create Scenario</span>
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 max-w-2xl w-full mx-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Create Custom Scenario</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                ×
              </button>
            </div>

            {/* Upload Type Toggle */}
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setUploadType('document')}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  uploadType === 'document'
                    ? 'bg-blue-500 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Upload Document
              </button>
              <button
                onClick={() => setUploadType('text')}
                className={`flex-1 px-4 py-2 rounded-lg ${
                  uploadType === 'text'
                    ? 'bg-blue-500 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                Enter Text
              </button>
            </div>

            {uploadType === 'document' ? (
              <div>
                <label className="block mb-2 font-medium">Upload Document</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="w-full px-4 py-2 border rounded-lg"
                />
                <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Supported formats: PDF, Word, Text
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block mb-2 font-medium">Scenario Name</label>
                  <input
                    type="text"
                    value={scenarioName}
                    onChange={(e) => setScenarioName(e.target.value)}
                    placeholder="Enter scenario name"
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium">Scenario Content</label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Enter scenario description, requirements, and details..."
                    rows={10}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-gray-200'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                <button
                  onClick={handleTextUpload}
                  disabled={uploading || !textContent.trim() || !scenarioName.trim()}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Text'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scenarios List */}
      {scenarios.length === 0 ? (
        <div className={`rounded-xl p-12 text-center ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
          <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No custom scenarios yet</h3>
          <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Create your first custom scenario by uploading a document or entering text
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Create Scenario
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario) => (
            <div
              key={scenario.id}
              className={`rounded-xl p-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-lg">{scenario.name}</h3>
                    {getStatusIcon(scenario.validation_status)}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(scenario.validation_status)}`}
                    >
                      {scenario.validation_status}
                    </span>
                    {scenario.is_public && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>Public</span>
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {scenario.description || 'No description available'}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Source: {scenario.source_type}</span>
                    <span>•</span>
                    <span>Created: {new Date(scenario.created_at).toLocaleDateString()}</span>
                    {scenario.downloads > 0 && (
                      <>
                        <span>•</span>
                        <span>{scenario.downloads} downloads</span>
                      </>
                    )}
                  </div>
                  {scenario.validation_errors && scenario.validation_errors.length > 0 && (
                    <div className={`mt-4 p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900' : 'bg-red-50'}`}>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Validation Errors:</p>
                      <ul className="text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                        {scenario.validation_errors.map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {scenario.validation_status === 'pending' && (
                    <button
                      onClick={() => handleValidate(scenario.id)}
                      disabled={validating === scenario.id}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      } flex items-center space-x-2`}
                    >
                      {validating === scenario.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current"></div>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Validate</span>
                        </>
                      )}
                    </button>
                  )}
                  {scenario.validation_status === 'valid' && !scenario.is_public && (
                    <button
                      onClick={() => handlePublish(scenario.id)}
                      disabled={publishing === scenario.id}
                      className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 flex items-center space-x-2"
                    >
                      {publishing === scenario.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <Globe className="w-4 h-4" />
                          <span>Publish</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      theme === 'dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                    } flex items-center space-x-2`}
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomScenarios;

