import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import ScenarioCard from '../../components/sim/ScenarioCard';
import { getScenarios } from '../../services/simulatorService';
import { SIMULATOR_ROLE_LIST } from '@nidus/shared/constants/simulatorRoles';
import { simDb } from '../../services/supabase/supabaseClient';
import { getPreferredRole } from '../../services/sim/rolePreferenceService';

export default function Scenarios() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    industry: '',
    methodology: '',
    difficulty_level: '',
    target_role: searchParams.get('role') || '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await simDb.auth.getUser();
      if (user && !filters.target_role) {
        const pref = await getPreferredRole(user.id);
        if (pref) setFilters((f) => ({ ...f, target_role: pref }));
      }
    })();
  }, []);

  useEffect(() => {
    loadScenarios();
  }, [filters]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      setError(null);
      const dbFilters = { ...filters };
      if (!dbFilters.target_role) delete dbFilters.target_role;
      const data = await getScenarios(dbFilters);
      let filtered = data || [];
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name?.toLowerCase().includes(q) ||
            s.short_description?.toLowerCase().includes(q),
        );
      }
      setScenarios(filtered);
    } catch (err) {
      console.error('Error loading scenarios:', err);
      setError('Failed to load scenarios from the database.');
      setScenarios([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    if (key === 'target_role') {
      setSearchParams(value ? { role: value } : {});
    }
  };

  const industries = [...new Set(scenarios.map((s) => s.industry).filter(Boolean))];
  const methodologies = [...new Set(scenarios.map((s) => s.methodology).filter(Boolean))];
  const difficulties = ['beginner', 'intermediate', 'advanced', 'expert'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Scenario Library</h1>
        <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Scenarios filtered for your practice role by default
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleFilterChange('target_role', '')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${!filters.target_role ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
        >
          All roles
        </button>
        {SIMULATOR_ROLE_LIST.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => handleFilterChange('target_role', r.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${filters.target_role === r.id ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow`}>
        <input
          type="text"
          placeholder="Search scenarios..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadScenarios()}
          className={`w-full mb-4 px-4 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select value={filters.industry} onChange={(e) => handleFilterChange('industry', e.target.value)} className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
            <option value="">All Industries</option>
            {industries.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <select value={filters.methodology} onChange={(e) => handleFilterChange('methodology', e.target.value)} className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
            <option value="">All Methodologies</option>
            {methodologies.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={filters.difficulty_level} onChange={(e) => handleFilterChange('difficulty_level', e.target.value)} className={`px-3 py-2 rounded-lg border ${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}>
            <option value="">All Difficulties</option>
            {difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button type="button" onClick={() => { setFilters({ industry: '', methodology: '', difficulty_level: '', target_role: '' }); setSearchTerm(''); }} className={`px-3 py-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
            Clear Filters
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
        Showing {scenarios.length} scenario{scenarios.length !== 1 ? 's' : ''}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
        </div>
      ) : scenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {scenarios.map((scenario) => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      ) : (
        <div className={`text-center py-12 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          <h3 className="text-lg font-medium mb-2">No scenarios found</h3>
          <p>Try adjusting your filters or select a different role tab.</p>
        </div>
      )}
    </div>
  );
}
