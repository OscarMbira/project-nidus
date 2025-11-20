import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabaseClient'

export default function ProtectedRoute({ children, requiredRoles = [] }) {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [userRoles, setUserRoles] = useState([])
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      // Check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        setAuthenticated(false)
        setLoading(false)
        return
      }

      setAuthenticated(true)

      // If roles are required, check user roles
      if (requiredRoles.length > 0) {
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select(`
            roles:role_id (
              role_code,
              role_name
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .eq('is_deleted', false)

        if (rolesError && rolesError.code !== '42P01') {
          console.error('Error fetching user roles:', rolesError)
          setAuthenticated(false)
          setLoading(false)
          return
        }

        const roles = rolesData?.map(ur => ur.roles?.role_code).filter(Boolean) || []
        setUserRoles(roles)

        // Check if user has at least one required role
        const hasRequiredRole = requiredRoles.some(role => roles.includes(role))
        if (!hasRequiredRole) {
          setAuthenticated(false)
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error checking authentication:', error)
      setAuthenticated(false)
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    // Redirect to home page (or login page if you have one)
    // Store the attempted location so we can redirect back after login
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return children
}

