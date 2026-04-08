import { downloadCSVTemplate, downloadJSONTemplate, downloadXMLTemplate } from '../../services/testImportService'

export default function TestCaseImportTemplate() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={downloadCSVTemplate}
        className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-xs text-gray-200 hover:bg-gray-700"
      >
        CSV template
      </button>
      <button
        type="button"
        onClick={downloadJSONTemplate}
        className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-xs text-gray-200 hover:bg-gray-700"
      >
        JSON sample
      </button>
      <button
        type="button"
        onClick={downloadXMLTemplate}
        className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-600 text-xs text-gray-200 hover:bg-gray-700"
      >
        XML sample
      </button>
    </div>
  )
}
