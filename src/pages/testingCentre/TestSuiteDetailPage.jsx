import { useParams, Link } from 'react-router-dom'
export default function TestSuiteDetailPage({ pathPrefix }) {
  const { id } = useParams()
  return (
    <div className="p-6 min-h-screen bg-gray-950 text-gray-100">
      <h1 className="text-xl">Suite {id}</h1>
      <Link to={`${pathPrefix}/runs/new`} className="text-blue-400">Run suite</Link>
    </div>
  )
}
