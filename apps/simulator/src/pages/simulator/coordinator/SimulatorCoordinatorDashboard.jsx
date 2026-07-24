import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { simDb } from '../../../services/supabase/supabaseClient';
import { ClipboardList, Calendar, FileText, CheckSquare } from 'lucide-react';
import LearningPathWidget from '../../../components/sim/role/LearningPathWidget';
import RoleWelcomeTips from '../../../components/sim/role/RoleWelcomeTips';

export default function SimulatorCoordinatorDashboard() {
  const [stats, setStats] = useState({ tasks: 0, issues: 0, risks: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [tasks, issues, risks] = await Promise.all([
          simDb.from('practice_tasks').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
          simDb.from('practice_issues').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
          simDb.from('practice_risks').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        ]);
        setStats({ tasks: tasks.count || 0, issues: issues.count || 0, risks: risks.count || 0 });
      } catch (err) {
        console.error('Coordinator dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Open Tasks', value: stats.tasks, icon: CheckSquare, link: '/simulator/coordinator/actions' },
    { label: 'Schedule Updates', value: '—', icon: Calendar, link: '/simulator/coordinator/schedule' },
    { label: 'Documents', value: '—', icon: FileText, link: '/simulator/coordinator/documents' },
    { label: 'RAID Items', value: stats.issues + stats.risks, icon: ClipboardList, link: '/simulator/coordinator/raid' },
  ];

  return (
    <div className="space-y-6">
      <RoleWelcomeTips roleId="project_coordinator" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Project Coordinator Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Support delivery through scheduling, documentation, communications, and action tracking.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-10 w-10 border-b-2 border-green-600 rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.link} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-green-500 transition-colors">
              <c.icon className="h-6 w-6 text-green-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
            </Link>
          ))}
        </div>
      )}
      <LearningPathWidget roleId="project_coordinator" />
    </div>
  );
}
