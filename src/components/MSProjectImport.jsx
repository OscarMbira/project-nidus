import { useState } from 'react'
import { Upload, FileText, CheckCircle, XCircle, Download } from 'lucide-react'
import { parseMSProjectFile, convertMSProjectToInternal, exportToMSProjectXML, downloadMSProjectXML } from '../utils/msProjectImport'
import { supabase } from '../services/supabaseClient'

export default function MSProjectImport({ projectId, onImportComplete, onCancel }) {
  const [file, setFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [importing, setImporting] = useState(false)
  const [step, setStep] = useState('upload') // upload, review, importing, complete

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setParsing(true)

    try {
      const data = await parseMSProjectFile(selectedFile)
      setParsedData(data)
      setStep('review')
    } catch (error) {
      console.error('Error parsing file:', error)
      alert('Error parsing MS Project file: ' + error.message)
    } finally {
      setParsing(false)
    }
  }

  const handleImport = async () => {
    if (!parsedData || !projectId) return

    setImporting(true)
    setStep('importing')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      const converted = convertMSProjectToInternal(parsedData, projectId)

      // Import tasks
      const taskPromises = converted.tasks.map(task => 
        supabase.from('tasks').insert({
          ...task,
          created_by: user.id,
        })
      )

      await Promise.all(taskPromises)

      // Import resources (if any)
      if (converted.resources && converted.resources.length > 0) {
        const resourcePromises = converted.resources.map(resource =>
          supabase.from('resources').insert({
            ...resource,
            created_by: user.id,
          })
        )
        await Promise.all(resourcePromises)
      }

      setStep('complete')
      if (onImportComplete) {
        onImportComplete(converted)
      }
    } catch (error) {
      console.error('Error importing data:', error)
      alert('Error importing data: ' + error.message)
      setStep('review')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Import from Microsoft Project
          </h2>
        </div>

        <div className="p-6">
          {step === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <label className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                    Select MS Project file (.mpp or .xml)
                  </span>
                  <input
                    type="file"
                    accept=".mpp,.xml"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <span className="mt-2 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                    Choose File
                  </span>
                </label>
                {parsing && (
                  <div className="mt-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Parsing file...</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 'review' && parsedData && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-800 dark:text-green-300">
                  File parsed successfully!
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {parsedData.tasks?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Tasks</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {parsedData.resources?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Resources</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {parsedData.assignments?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Assignments</div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Project Information</h3>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div><strong>Name:</strong> {parsedData.name}</div>
                  {parsedData.startDate && <div><strong>Start Date:</strong> {parsedData.startDate}</div>}
                  {parsedData.finishDate && <div><strong>Finish Date:</strong> {parsedData.finishDate}</div>}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setStep('upload')
                    setFile(null)
                    setParsedData(null)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Import Data
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Importing data...</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Import Complete!
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Successfully imported {parsedData?.tasks?.length || 0} tasks
              </p>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

