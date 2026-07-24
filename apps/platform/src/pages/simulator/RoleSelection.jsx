import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const RoleSelection = () => {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);

  const roles = [
    {
      id: 'team_member',
      name: 'Team Member',
      description: 'Execute tasks, collaborate with team, learn fundamentals',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      difficulty: 'Beginner',
      color: 'from-green-500 to-emerald-600',
      skills: ['Task execution', 'Time management', 'Collaboration', 'Reporting'],
    },
    {
      id: 'team_lead',
      name: 'Team Lead',
      description: 'Coordinate team activities, manage workload, mentor members',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      difficulty: 'Intermediate',
      color: 'from-blue-500 to-cyan-600',
      skills: ['Team coordination', 'Task delegation', 'Performance tracking', 'Conflict resolution'],
    },
    {
      id: 'project_manager',
      name: 'Project Manager',
      description: 'Lead entire projects, manage stakeholders, control scope/budget',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
      difficulty: 'Advanced',
      color: 'from-purple-500 to-violet-600',
      skills: ['Project planning', 'Risk management', 'Stakeholder management', 'Budget control'],
    },
    {
      id: 'programme_manager',
      name: 'Programme Manager',
      description: 'Oversee multiple projects, strategic alignment, portfolio management',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      difficulty: 'Expert',
      color: 'from-orange-500 to-red-600',
      skills: ['Strategic planning', 'Resource optimization', 'Benefits realization', 'Executive reporting'],
    },
  ];

  const getDifficultyColor = (difficulty) => {
    const colors = {
      Beginner: 'text-green-500',
      Intermediate: 'text-blue-500',
      Advanced: 'text-purple-500',
      Expert: 'text-orange-500',
    };
    return colors[difficulty] || 'text-gray-500';
  };

  const handleContinue = () => {
    if (selectedRole) {
      // In a real app, save to database
      localStorage.setItem('simulator_preferred_role', selectedRole);
      navigate('/simulator');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Role</h1>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Select the role you want to practice. You can change this anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setSelectedRole(role.id)}
            className={`text-left p-6 rounded-xl transition-all duration-300 ${
              selectedRole === role.id
                ? `ring-2 ring-offset-2 ${theme === 'dark' ? 'ring-offset-gray-900' : 'ring-offset-white'} ring-blue-500`
                : ''
            } ${
              theme === 'dark'
                ? 'bg-gray-800 hover:bg-gray-750'
                : 'bg-white hover:bg-gray-50'
            } shadow-lg hover:shadow-xl transform hover:-translate-y-1`}
          >
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg bg-gradient-to-r ${role.color} text-white`}>
                {role.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-semibold">{role.name}</h3>
                  <span className={`text-xs font-medium ${getDifficultyColor(role.difficulty)}`}>
                    {role.difficulty}
                  </span>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                  {role.description}
                </p>
                <div className="flex flex-wrap gap-1">
                  {role.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`px-2 py-0.5 text-xs rounded ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {selectedRole === role.id && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-blue-500">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Selected
                </div>
              </div>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-center">
        <button
          onClick={handleContinue}
          disabled={!selectedRole}
          className={`px-8 py-3 rounded-lg font-medium transition-all ${
            selectedRole
              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg'
              : `${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} text-gray-500 cursor-not-allowed`
          }`}
        >
          Continue to Dashboard
        </button>
      </div>

      <p className={`text-center mt-4 text-sm ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>
        Scenarios will be filtered based on your selected role, but you can always access all scenarios.
      </p>
    </div>
  );
};

export default RoleSelection;
