import { useState } from 'react'
import WebhookManager from '../components/webhooks/WebhookManager'
import WebhookLogs from '../components/webhooks/WebhookLogs'
import { Webhook, FileText } from 'lucide-react'

export default function Webhooks() {
  const [activeTab, setActiveTab] = useState('webhooks')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Webhooks
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure webhooks to receive real-time notifications about events in your projects
        </p>
      </div>

      <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'webhooks'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </div>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'logs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs
          </div>
        </button>
      </div>

      {activeTab === 'webhooks' && <WebhookManager />}
      {activeTab === 'logs' && <WebhookLogs />}
    </div>
  )
}

