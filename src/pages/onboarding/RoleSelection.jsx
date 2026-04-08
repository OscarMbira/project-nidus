import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { getAvailableRoles, assignUserRoles } from '../../services/roleService'
import { 
  User, 
  Users, 
  Briefcase, 
  Shield, 
  Eye, 
  CheckCircle, 
  Loader, 
  AlertCircle,
  ArrowRight,
  Info
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import MainHeader from '../../components/homepage/MainHeader'
import Footer from '../../components/homepage/Footer'

// Role icons mapping
const roleIcons = {
  project_manager: Briefcase,
  team_lead: Users,
  team_member: User,
  stakeholder: Eye,
  viewer: Eye,
}

// Role descriptions
const roleDescriptions = {
  project_manager: {
    title: 'Project Manager',
    description: 'Manage projects, teams, and tasks. Full access to project planning, execution, and reporting.',
    features: ['Create and manage projects', 'Assign tasks to team members', 'Generate reports', 'Manage project budgets']
  },
  team_lead: {
    title: 'Team Lead',
    description: 'Lead teams and manage work packages. Coordinate team activities and track progress.',
    features: ['Manage team tasks', 'Coordinate work packages', 'Track team progress', 'Assign work to team members']
  },
  team_member: {
    title: 'Team Member',
    description: 'Execute assigned tasks and update progress. Participate in project activities.',
    features: ['View assigned tasks', 'Update task progress', 'Submit deliverables', 'Report issues']
  },
  stakeholder: {
    title: 'Stakeholder',
    description: 'View project information and provide feedback. Read-only access to project data.',
    features: ['View project information', 'Access project reports', 'Provide feedback', 'Track project status']
  },
  viewer: {
    title: 'Viewer',
    description: 'Minimal read-only access. View basic project and task information.',
    features: ['View projects', 'View tasks', 'View reports', 'Read-only access']
  }
}

export default function RoleSelection() {
  const navigate = useNavigate()
  const [roles, setRoles] = useState([])
  const [selectedRoles, setSelectedRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    loadRoles()
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserEmail(user.email || '')
      }
    } catch (err) {
      console.error('Error loading user info:', err)
    }
  }

  const loadRoles = async () => {
    try {
      setLoading(true)
      const result = await getAvailableRoles()
      
      if (result.success) {
        setRoles(result.data)
        // Pre-select default role if exists
        const defaultRole = result.data.find(r => r.is_default_role)
        if (defaultRole) {
          setSelectedRoles([defaultRole.id])
        }
      } else {
        setError(result.message || 'Failed to load roles')
      }
    } catch (err) {
      console.error('Error loading roles:', err)
      setError('An error occurred while loading roles')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleToggle = (roleId) => {
    setSelectedRoles(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(id => id !== roleId)
      } else {
        return [...prev, roleId]
      }
    })
  }

  const handleContinue = async () => {
    if (selectedRoles.length === 0) {
      setError('Please select at least one role')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('User not authenticated')
      }

      const result = await assignUserRoles(user.id, selectedRoles)

      if (result.success) {
        // Redirect to dashboard
        navigate('/dashboard', { replace: true })
      } else {
        setError(result.message || 'Failed to assign roles')
      }
    } catch (err) {
      console.error('Error assigning roles:', err)
      setError(err.message || 'An error occurred while assigning roles')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    // Allow user to skip and assign default role later
    navigate('/dashboard', { replace: true })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading roles...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <MainHeader />
      <div className="flex-grow py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full">
              <User className="h-10 w-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            Select Your Role
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Choose the role(s) that best describe your responsibilities in projects
          </p>
          {userEmail && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Setting up account for: <span className="font-medium">{userEmail}</span>
            </p>
          )}
        </div>

        {/* Info Banner */}
        <div className="mb-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="ml-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Tip:</strong> You can select multiple roles if you have different responsibilities. 
                Your role determines what features and permissions you'll have access to in the system.
              </p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  {error}
                </h3>
              </div>
            </div>
          </div>
        )}

        {/* Role Selection Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {roles.map((role) => {
            const Icon = roleIcons[role.role_name] || User
            const roleInfo = roleDescriptions[role.role_name] || {
              title: role.role_display_name,
              description: role.role_description || 'No description available',
              features: []
            }
            const isSelected = selectedRoles.includes(role.id)

            return (
              <Card
                key={role.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isSelected
                    ? 'ring-2 ring-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:border-gray-400 dark:hover:border-gray-600'
                }`}
                onClick={() => handleRoleToggle(role.id)}
              >
                <Card.Header>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <Card.Title className="text-lg font-semibold">
                          {roleInfo.title}
                        </Card.Title>
                        {role.is_default_role && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                            Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}>
                      {isSelected && (
                        <CheckCircle className="h-4 w-4 text-white" />
                      )}
                    </div>
                  </div>
                </Card.Header>
                <Card.Content>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {roleInfo.description}
                  </p>
                  {roleInfo.features.length > 0 && (
                    <ul className="space-y-2">
                      {roleInfo.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card.Content>
              </Card>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={saving}
            className="sm:w-auto"
          >
            Skip for Now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={saving || selectedRoles.length === 0}
            className="sm:w-auto"
            size="lg"
          >
            {saving ? (
              <>
                <Loader className="h-5 w-5 animate-spin mr-2" />
                Setting up...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            You can change your roles later in your profile settings.
          </p>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

