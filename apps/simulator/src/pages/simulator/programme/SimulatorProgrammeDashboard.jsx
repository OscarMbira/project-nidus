import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { simDb } from '../../../services/supabase/supabaseClient';
import { Layers, GitBranch, Award, Users } from 'lucide-react';
import LearningPathWidget from '../../../components/sim/role/LearningPathWidget';
import RoleWelcomeTips from '../../../components/sim/role/RoleWelcomeTips';

export default function SimulatorProgrammeDashboard() {
  const [stats, setStats] = useState({ programmes: 0, dependencies: 0, benefits: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pgm, deps, ben] = await Promise.all([
          simDb.from('practice_programmes').select('id', { count: 'exact', head: true }),
          simDb.from('practice_programme_dependencies').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
          simDb.from('practice_benefits').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
        ]);
        setStats({
          programmes: pgm.count || 0,
          dependencies: deps.count || 0,
          benefits: ben.count || 0,
        });
      } catch (err) {
        console.error('Programme dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Active Programmes', value: stats.programmes, icon: Layers, link: '/simulator/programme/roadmap' },
    { label: 'Cross-Project Dependencies', value: stats.dependencies, icon: GitBranch, link: '/simulator/programme/dependencies' },
    { label: 'Benefits Tracked', value: stats.benefits, icon: Award, link: '/simulator/programme/benefits' },
    { label: 'Stakeholder Engagement', value: '—', icon: Users, link: '/simulator/programme/stakeholders' },
  ];

  return (
    <div className="space-y-6">
      <RoleWelcomeTips roleId="programme_manager" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Programme Manager Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Coordinate related projects, manage dependencies, and realise strategic benefits.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-10 w-10 border-b-2 border-orange-600 rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.link} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-orange-500 transition-colors">
              <c.icon className="h-6 w-6 text-orange-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
            </Link>
          ))}
        </div>
      )}
      <LearningPathWidget roleId="programme_manager" />
    </div>
  );
}
