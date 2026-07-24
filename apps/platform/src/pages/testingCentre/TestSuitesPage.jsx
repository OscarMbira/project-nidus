import { Link } from 'react-router-dom'
export default function TestSuitesPage({ pathPrefix }) {
  return (
    <div className="p-6 min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 max-w-5xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Test suites</h1>
      <Link to={`${pathPrefix}/suites/new`} className="text-blue-500">New suite</Link>
    </div>
  )
}
