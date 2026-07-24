import { useState } from 'react'
import { FileText, Code, BookOpen, ExternalLink } from 'lucide-react'

export default function ApiDocumentation() {
  const [activeSection, setActiveSection] = useState('overview')

  const sections = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'authentication', label: 'Authentication', icon: FileText },
    { id: 'endpoints', label: 'Endpoints', icon: Code }
  ]

  const endpoints = [
    {
      method: 'GET',
      path: '/api/v1/projects',
      description: 'List all projects',
      params: [
        { name: 'page', type: 'integer', description: 'Page number' },
        { name: 'limit', type: 'integer', description: 'Items per page' }
      ]
    },
    {
      method: 'POST',
      path: '/api/v1/projects',
      description: 'Create a new project',
      body: {
        project_name: 'string',
        description: 'string',
        start_date: 'date',
        end_date: 'date'
      }
    },
    {
      method: 'GET',
      path: '/api/v1/projects/:id',
      description: 'Get project details',
      params: [
        { name: 'id', type: 'uuid', description: 'Project ID' }
      ]
    },
    {
      method: 'PUT',
      path: '/api/v1/projects/:id',
      description: 'Update project',
      body: {
        project_name: 'string',
        description: 'string'
      }
    },
    {
      method: 'DELETE',
      path: '/api/v1/projects/:id',
      description: 'Delete project'
    },
    {
      method: 'GET',
      path: '/api/v1/tasks',
      description: 'List all tasks',
      params: [
        { name: 'project_id', type: 'uuid', description: 'Filter by project' },
        { name: 'status', type: 'string', description: 'Filter by status' }
      ]
    },
    {
      method: 'POST',
      path: '/api/v1/tasks',
      description: 'Create a new task',
      body: {
        task_name: 'string',
        project_id: 'uuid',
        description: 'string',
        due_date: 'date'
      }
    },
    {
      method: 'GET',
      path: '/api/v1/tasks/:id',
      description: 'Get task details'
    },
    {
      method: 'PUT',
      path: '/api/v1/tasks/:id',
      description: 'Update task'
    },
    {
      method: 'DELETE',
      path: '/api/v1/tasks/:id',
      description: 'Delete task'
    }
  ]

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              API Documentation
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete API reference for Project Nidus
            </p>
          </div>
        </div>
        <a
          href="/api-docs/openapi.yaml"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          <ExternalLink className="h-4 w-4" />
          OpenAPI Spec
        </a>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeSection === section.id
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {section.label}
              </div>
            </button>
          )
        })}
      </div>

      <div className="prose dark:prose-invert max-w-none">
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Introduction
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                The Project Nidus API provides a RESTful interface to interact with your projects, tasks, resources, and more. 
                All API requests must be authenticated using an API key.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Base URL
              </h3>
              <code className="px-3 py-2 bg-gray-100 dark:bg-gray-900 rounded text-sm font-mono block">
                https://api.projectnidus.com/api/v1
              </code>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Rate Limiting
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                API requests are rate-limited per API key. The default rate limit is 60 requests per minute. 
                Rate limit information is included in response headers:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mt-2 space-y-1">
                <li><code>X-RateLimit-Limit</code>: Maximum requests allowed</li>
                <li><code>X-RateLimit-Remaining</code>: Remaining requests in current window</li>
                <li><code>X-RateLimit-Reset</code>: Time when rate limit resets</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Response Format
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                All API responses are returned in JSON format. Successful responses include a <code>data</code> field, 
                while errors include an <code>error</code> field with details.
              </p>
              <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
                <code>{`{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}`}</code>
              </pre>
            </div>
          </div>
        )}

        {activeSection === 'authentication' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                API Key Authentication
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                All API requests must include an API key in the request header:
              </p>
              <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-sm overflow-x-auto">
                <code>{`Authorization: Bearer YOUR_API_KEY`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Creating API Keys
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                API keys can be created from the API Management section in your account settings. 
                Each API key can have specific scopes and rate limits configured.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Scopes
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                API keys can be scoped to specific resources and actions:
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                <li><code>projects:read</code> - Read project data</li>
                <li><code>projects:write</code> - Create and update projects</li>
                <li><code>tasks:read</code> - Read task data</li>
                <li><code>tasks:write</code> - Create and update tasks</li>
                <li><code>resources:read</code> - Read resource data</li>
                <li><code>resources:write</code> - Create and update resources</li>
              </ul>
            </div>
          </div>
        )}

        {activeSection === 'endpoints' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Available Endpoints
              </h3>
              <div className="space-y-4">
                {endpoints.map((endpoint, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded text-sm font-medium ${
                        endpoint.method === 'GET'
                          ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
                          : endpoint.method === 'POST'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                          : endpoint.method === 'PUT'
                          ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                          : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-sm font-mono text-gray-900 dark:text-white">
                        {endpoint.path}
                      </code>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">
                      {endpoint.description}
                    </p>
                    {endpoint.params && endpoint.params.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Query Parameters:
                        </p>
                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1 ml-4">
                          {endpoint.params.map((param, pIndex) => (
                            <li key={pIndex}>
                              <code>{param.name}</code> ({param.type}) - {param.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {endpoint.body && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          Request Body:
                        </p>
                        <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-xs overflow-x-auto">
                          <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

