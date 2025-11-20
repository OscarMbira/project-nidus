import ApiDocumentation from '../components/api/ApiDocumentation'

export default function ApiDocs() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          API Documentation
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Complete API reference and interactive documentation for Project Nidus
        </p>
      </div>

      <ApiDocumentation />
    </div>
  )
}

