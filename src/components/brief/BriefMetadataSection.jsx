/**
 * Brief Metadata Section
 * Reference, author, owner, client, dates
 */

import { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'

export default function BriefMetadataSection({ formData, onChange, errors = {}, readOnly = false }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!readOnly) {
      fetchUsers()
    }
  }, [readOnly])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('is_deleted', false)
        .order('full_name', { ascending: true })
        .limit(100)

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    onChange({ target: { name, value } })
  }

  const handleUserSelect = (fieldName, userId) => {
    const user = users.find(u => u.id === userId)
    onChange({
      target: {
        name: fieldName,
        value: userId
      }
    })
    if (user) {
      onChange({
        target: {
          name: fieldName.replace('_id', '_name'),
          value: user.full_name
        }
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Document Metadata
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Basic information about the Project Brief document
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brief Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Brief Reference <span className="text-red-500">*</span>
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white font-mono">{formData.brief_reference || 'Auto-generated'}</p>
          ) : (
            <input
              type="text"
              name="brief_reference"
              value={formData.brief_reference || ''}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-lg ${
                errors.brief_reference ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Auto-generated if empty"
            />
          )}
          {errors.brief_reference && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.brief_reference}</p>
          )}
        </div>

        {/* Version Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Version Number
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white">{formData.version_number || '1.0'}</p>
          ) : (
            <input
              type="text"
              name="version_number"
              value={formData.version_number || '1.0'}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          )}
        </div>

        {/* Document Reference */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Document Reference
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white">{formData.document_ref || 'N/A'}</p>
          ) : (
            <input
              type="text"
              name="document_ref"
              value={formData.document_ref || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="External document reference"
            />
          )}
        </div>

        {/* Release */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Release
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white">{formData.release || 'N/A'}</p>
          ) : (
            <input
              type="text"
              name="release"
              value={formData.release || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Release identifier"
            />
          )}
        </div>

        {/* Created Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Created Date
          </label>
          {readOnly ? (
            <p className="text-gray-900 dark:text-white">{formData.created_date || 'N/A'}</p>
          ) : (
            <input
              type="date"
              name="created_date"
              value={formData.created_date || ''}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          )}
        </div>

        {/* Document Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <p className="text-gray-900 dark:text-white capitalize">
            {formData.document_status || 'draft'}
          </p>
        </div>
      </div>

      {/* Authorship Section */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Authorship</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author
            </label>
            {readOnly ? (
              <p className="text-gray-900 dark:text-white">
                {formData.author_name || (formData.author_id ? 'User ID: ' + formData.author_id : 'N/A')}
              </p>
            ) : (
              <>
                <select
                  name="author_id"
                  value={formData.author_id || ''}
                  onChange={(e) => handleUserSelect('author_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  <option value="">Select author...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="author_name"
                  value={formData.author_name || ''}
                  onChange={handleChange}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Or enter external author name"
                />
              </>
            )}
          </div>

          {/* Owner */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Owner
            </label>
            {readOnly ? (
              <p className="text-gray-900 dark:text-white">
                {formData.owner_name || (formData.owner_id ? 'User ID: ' + formData.owner_id : 'N/A')}
              </p>
            ) : (
              <>
                <select
                  name="owner_id"
                  value={formData.owner_id || ''}
                  onChange={(e) => handleUserSelect('owner_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  <option value="">Select owner...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="owner_name"
                  value={formData.owner_name || ''}
                  onChange={handleChange}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Or enter external owner name"
                />
              </>
            )}
          </div>

          {/* Client */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Client
            </label>
            {readOnly ? (
              <p className="text-gray-900 dark:text-white">
                {formData.client_name || (formData.client_id ? 'User ID: ' + formData.client_id : 'N/A')}
              </p>
            ) : (
              <>
                <select
                  name="client_id"
                  value={formData.client_id || ''}
                  onChange={(e) => handleUserSelect('client_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  disabled={loading}
                >
                  <option value="">Select client...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name || ''}
                  onChange={handleChange}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Or enter external client name"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
