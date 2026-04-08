/**
 * Person Responsible Selector Component
 * Team member picker for daily log entries
 */

import { useState, useEffect } from 'react';
import { platformDb } from '../../services/supabase/supabaseClient';
import { User } from 'lucide-react';

export default function PersonResponsibleSelector({ 
  projectId, 
  value, 
  onChange, 
  allowExternal = true,
  className = '' 
}) {
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [externalName, setExternalName] = useState('');

  useEffect(() => {
    if (projectId) {
      fetchTeamMembers();
    }
  }, [projectId]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      // Get project members
      const { data, error } = await platformDb
        .from('user_projects')
        .select(`
          user_id,
          users:user_id(id, full_name, email)
        `)
        .eq('project_id', projectId)
        .eq('is_deleted', false)
        .eq('is_active', true);

      if (error) throw error;

      const members = (data || [])
        .filter(item => item.users)
        .map(item => ({
          id: item.user_id,
          name: item.users.full_name || item.users.email,
          email: item.users.email
        }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInternalChange = (userId) => {
    onChange({ person_responsible_id: userId || null, person_responsible_name: null });
    setExternalName('');
  };

  const handleExternalChange = (name) => {
    setExternalName(name);
    onChange({ person_responsible_id: null, person_responsible_name: name || null });
  };

  // Determine if current value is internal or external
  const isInternal = value?.person_responsible_id && !value?.person_responsible_name;
  const isExternal = value?.person_responsible_name && !value?.person_responsible_id;
  const currentExternalName = isExternal ? (value.person_responsible_name || '') : externalName;
  const currentInternalId = isInternal ? (value.person_responsible_id || '') : '';

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
        <User className="w-4 h-4" />
        Person Responsible
      </label>
      
      {loading ? (
        <div className="text-sm text-gray-500">Loading team members...</div>
      ) : (
        <>
          <select
            value={currentInternalId}
            onChange={(e) => handleInternalChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="">Select team member...</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          
          {allowExternal && (
            <div className="mt-2">
              <input
                type="text"
                value={currentExternalName}
                onChange={(e) => handleExternalChange(e.target.value)}
                placeholder="Or enter external person name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank if using team member above
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
