/**
 * Simulator Application Dashboard
 * Dashboard for Simulator system
 * Route: /simulator/dashboard
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { simDb } from '../../services/supabase/supabaseClient'
import { Play, Trophy, Target, TrendingUp, BookOpen, Award } from 'lucide-react'

export default function SimulatorDashboard() {
  const [stats, setStats] = useState({
    activeScenarios: 0,
    completedScenarios: 0,
    totalScore: 0,
    certificatesEarned: 0,
  })
  const [recentScenarios, setRecentScenarios] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSimulatorData()
  }, [])

  const fetchSimulatorData = async () => {
    try {
      setLoading(true)

      // Fetch simulation runs from sim schema
      // Note: These tables will need to be created in the sim schema
      const { data: runs, error: runsError } = await simDb
        .from('simulation_runs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      if (runsError && runsError.code !== '42P01') {
        console.warn('simulation_runs table not found:', runsError)
      }

      // Calculate stats (placeholder values for now)
      setStats({
        activeScenarios: runs?.filter(r => r.status === 'in_progress').length || 0,
        completedScenarios: runs?.filter(r => r.status === 'completed').length || 0,
        totalScore: 0,
        certificatesEarned: 0,
      })

      setRecentScenarios(runs || [])
    } catch (error) {
      console.error('Error fetching simulator data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading simulator...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Simulator Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Practice project management with realistic scenarios
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/simulator/scenarios')}
          className="flex items-center gap-3 p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-left"
        >
          <Play className="h-6 w-6" />
          <div>
            <div className="font-semibold">Start Scenario</div>
            <div className="text-sm text-purple-100">Begin a new simulation</div>
          </div>
        </button>
        <button
          onClick={() => navigate('/simulator/runs')}
          className="flex items-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-left"
        >
          <Target className="h-6 w-6" />
          <div>
            <div className="font-semibold">Continue Simulation</div>
            <div className="text-sm text-blue-100">Resume active scenarios</div>
          </div>
        </button>
        <button
          onClick={() => navigate('/simulator/leaderboard')}
          className="flex items-center gap-3 p-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-left"
        >
          <Trophy className="h-6 w-6" />
          <div>
            <div className="font-semibold">Leaderboard</div>
            <div className="text-sm text-amber-100">View rankings</div>
          </div>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Scenarios</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.activeScenarios}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Play className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.completedScenarios}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Score</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalScore}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Certificates</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.certificatesEarned}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scenarios */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Recent Scenarios
        </h3>
        {recentScenarios.length === 0 ? (
          <div className="text-center py-12">
            <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">No scenarios started yet</p>
            <button
              onClick={() => navigate('/simulator/scenarios')}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Browse Scenarios
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {recentScenarios.map((scenario, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/simulator/runs/${scenario.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <Play className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      Scenario #{index + 1}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Status: {scenario.status || 'In Progress'}
                    </p>
                  </div>
                </div>
                <button className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium">
                  Continue →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
