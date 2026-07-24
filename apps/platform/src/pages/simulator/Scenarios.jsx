import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ScenarioCard from '../../components/sim/ScenarioCard';

import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'
const Scenarios = () => {
  const { theme } = useTheme();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    industry: '',
    methodology: '',
    difficulty_level: '',
    target_role: '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadScenarios();
  }, [filters]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      // Mock data for now
      const mockScenarios = [
        {
          id: '1',
          name: 'IT Project Kickoff',
          short_description: 'Learn to initiate and plan a software development project using Scrum methodology.',
          industry: 'IT/Software',
          methodology: 'Scrum',
          difficulty_level: 'beginner',
          duration_minutes: 60,
          is_premium: false,
          completions_count: 1250,
          rating: 4.5,
        },
        {
          id: '2',
          name: 'Construction Site Management',
          short_description: 'Manage a building construction project from foundation to completion using Structured PM.',
          industry: 'Construction',
          methodology: 'Structured PM',
          difficulty_level: 'intermediate',
          duration_minutes: 120,
          is_premium: false,
          completions_count: 890,
          rating: 4.3,
        },
        {
          id: '3',
          name: 'Product Launch Campaign',
          short_description: 'Coordinate a multi-team product launch using Kanban for continuous delivery.',
          industry: 'Marketing',
          methodology: 'Kanban',
          difficulty_level: 'intermediate',
          duration_minutes: 90,
          is_premium: true,
          completions_count: 650,
          rating: 4.7,
        },
        {
          id: '4',
          name: 'Healthcare System Implementation',
          short_description: 'Lead the implementation of a new healthcare information system.',
          industry: 'Healthcare',
          methodology: 'Hybrid',
          difficulty_level: 'advanced',
          duration_minutes: 180,
          is_premium: true,
          completions_count: 420,
          rating: 4.6,
        },
        {
          id: '5',
          name: 'Financial System Migration',
          short_description: 'Manage a complex financial system migration with strict compliance requirements.',
          industry: 'Finance',
          methodology: 'Structured PM',
          difficulty_level: 'expert',
          duration_minutes: 240,
          is_premium: true,
          completions_count: 180,
          rating: 4.8,
        },
        {
          id: '6',
          name: 'Mobile App Development',
          short_description: 'Build a mobile application from concept to app store release.',
          industry: 'IT/Software',
          methodology: 'Agile',
          difficulty_level: 'beginner',
          duration_minutes: 75,
          is_premium: false,
          completions_count: 2100,
          rating: 4.4,
        },
        {
          id: '7',
          name: 'Event Planning & Execution',
          short_description: 'Plan and execute a major corporate event with multiple stakeholders.',
          industry: 'Events',
          methodology: 'Kanban',
          difficulty_level: 'beginner',
          duration_minutes: 60,
          is_premium: false,
          completions_count: 980,
          rating: 4.2,
        },
        {
          id: '8',
          name: 'Manufacturing Process Improvement',
          short_description: 'Lead a Six Sigma project to improve manufacturing efficiency.',
          industry: 'Manufacturing',
          methodology: 'Structured PM',
          difficulty_level: 'advanced',
          duration_minutes: 150,
          is_premium: true,
          completions_count: 340,
          rating: 4.5,
        },
      ];

      // Apply filters
      let filtered = mockScenarios;
      if (filters.industry) {
        filtered = filtered.filter((s) => s.industry === filters.industry);
      }
      if (filters.methodology) {
        filtered = filtered.filter((s) => s.methodology === filters.methodology);
      }
      if (filters.difficulty_level) {
        filtered = filtered.filter((s) => s.difficulty_level === filters.difficulty_level);
      }
      if (searchTerm) {
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.short_description.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      setScenarios(filtered);
    } catch (error) {
      console.error('Error loading scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setFilters({
      industry: '',
      methodology: '',
      difficulty_level: '',
      target_role: '',
    });
    setSearchTerm('');
  };

  const industries = ['IT/Software', 'Construction', 'Marketing', 'Healthcare', 'Finance', 'Events', 'Manufacturing'];
  const methodologies = ['Scrum', 'Kanban', 'Structured PM', 'Agile', 'Hybrid'];
  const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Scenario Library</h1>
        <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Choose a scenario to practice your project management skills
        </p>
      </div>

      {/* Search & Filters */}
      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <svg
              className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search scenarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 focus:border-blue-500'
                  : 'bg-white border-gray-300 focus:border-blue-500'
              } focus:outline-none focus:ring-1 focus:ring-blue-500`}
            />
          </div>
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filters.industry}
            onChange={(e) => handleFilterChange('industry', e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-white border-gray-300'
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
          >
            <option value="">All Industries</option>
            {industries.map((i, index) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>

          <select
            value={filters.methodology}
            onChange={(e) => handleFilterChange('methodology', e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-white border-gray-300'
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
          >
            <option value="">All Methodologies</option>
            {methodologies.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={filters.difficulty_level}
            onChange={(e) => handleFilterChange('difficulty_level', e.target.value)}
            className={`px-3 py-2 rounded-lg border ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600'
                : 'bg-white border-gray-300'
            } focus:outline-none focus:ring-1 focus:ring-blue-500`}
          >
            <option value="">All Difficulties</option>
            {difficulties.map((d, index) => (
              <option key={d} value={d} className="capitalize">
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </option>
            ))}
          </select>

          <button
            onClick={clearFilters}
            className={`px-3 py-2 rounded-lg ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-100 hover:bg-gray-200'
            } transition-colors`}
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results Count */}
      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
      </div>

      {/* Scenarios Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : scenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {scenarios.map((scenario, index) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      ) : (
        <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium mb-2">No scenarios found</h3>
          <p>Try adjusting your filters or search term</p>
        </div>
      )}
    </div>
  );
};

export default Scenarios;
