import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'
import { Plus, Users, Calendar, TrendingUp, AlertTriangle, Search, Filter } from 'lucide-react'
import ResourceForm from '../components/ResourceForm'
import ResourceList from '../components/ResourceList'
import Pagination from '../components/Pagination'

export default function Resources() {
  const navigate = useNavigate()
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [selectedResource, setSelectedResource] = useState(null)
  const [filters, setFilters] = useState({
    resource_type: '',
    resource_category: '',
    is_active: '',
    is_available: '',
    search: '',
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    fetchResources()
  }, [filters, currentPage])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  const fetchResources = async () => {
    try {
      setLoading(true)
      
      // Build count query
      let countQuery = supabase
        .from('resources')
        .select('id', { count: 'exact', head: true })
        .eq('is_deleted', false)

      // Build data query
      let query = supabase
        .from('resources')
        .select(`
          *,
          user:user_id (id, email, full_name),
          team:team_id (id, team_name)
        `)
        .eq('is_deleted', false)

      // Apply filters
      if (filters.resource_type) {
        query = query.eq('resource_type', filters.resource_type)
        countQuery = countQuery.eq('resource_type', filters.resource_type)
      }
      if (filters.resource_category) {
        query = query.eq('resource_category', filters.resource_category)
        countQuery = countQuery.eq('resource_category', filters.resource_category)
      }
      if (filters.is_active !== '') {
        query = query.eq('is_active', filters.is_active === 'true')
        countQuery = countQuery.eq('is_active', filters.is_active === 'true')
      }
      if (filters.is_available !== '') {
        query = query.eq('is_available', filters.is_available === 'true')
        countQuery = countQuery.eq('is_available', filters.is_available === 'true')
      }
      if (filters.search) {
        query = query.or(`resource_name.ilike.%${filters.search}%,resource_description.ilike.%${filters.search}%`)
        countQuery = countQuery.or(`resource_name.ilike.%${filters.search}%,resource_description.ilike.%${filters.search}%`)
      }

      // Get total count
      const { count, error: countError } = await countQuery
      if (countError) throw countError
      setTotalCount(count || 0)

      // Apply pagination
      const from = (currentPage - 1) * itemsPerPage
      const to = from + itemsPerPage - 1
      
      const { data, error } = await query
        .order('resource_name', { ascending: true })
        .range(from, to)

      if (error) throw error
      setResources(data || [])
    } catch (error) {
      console.error('Error fetching resources:', error)
      alert('Error loading resources: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateResource = () => {
    setSelectedResource(null)
    setShowResourceForm(true)
  }

  const handleEditResource = (resource) => {
    navigate(`/resources/${resource.id}`)
  }

  const handleResourceSaved = () => {
    setShowResourceForm(false)
    setSelectedResource(null)
    fetchResources()
  }

  const stats = {
    total: resources.length,
    active: resources.filter(r => r.is_active).length,
    available: resources.filter(r => r.is_available).length,
    human: resources.filter(r => r.resource_type === 'human').length,
    equipment: resources.filter(r => r.resource_type === 'equipment').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Resource Planning
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Manage resources, capacity, and assignments
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Resources</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-green-200 dark:border-green-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.available}</p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Human</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.human}</p>
            </div>
            <Users className="h-8 w-8 text-gray-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Equipment</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.equipment}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-gray-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <select
            value={filters.resource_type}
            onChange={(e) => setFilters({ ...filters, resource_type: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Types</option>
            <option value="human">Human</option>
            <option value="equipment">Equipment</option>
            <option value="facility">Facility</option>
            <option value="other">Other</option>
          </select>
          <select
            value={filters.is_active}
            onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <select
            value={filters.is_available}
            onChange={(e) => setFilters({ ...filters, is_available: e.target.value })}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Availability</option>
            <option value="true">Available</option>
            <option value="false">Unavailable</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Resources ({totalCount})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/resources/conflicts')}
            className="px-4 py-2 bg-orange-200 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-300 dark:hover:bg-orange-700 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            View Conflicts
          </button>
          <button
            onClick={() => navigate('/resources/capacity')}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            View Capacity
          </button>
          <button
            onClick={handleCreateResource}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Resource
          </button>
        </div>
      </div>

      {/* Resources List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading resources...</p>
          </div>
        </div>
      ) : (
        <>
          <ResourceList
            resources={resources}
            onEdit={handleEditResource}
            onRefresh={fetchResources}
          />
          {totalCount > itemsPerPage && (
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / itemsPerPage)}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={totalCount}
            />
          )}
        </>
      )}

      {/* Resource Form Modal */}
      {showResourceForm && (
        <ResourceForm
          resource={selectedResource}
          onSave={handleResourceSaved}
          onCancel={() => {
            setShowResourceForm(false)
            setSelectedResource(null)
          }}
        />
      )}
    </div>
  )
}

