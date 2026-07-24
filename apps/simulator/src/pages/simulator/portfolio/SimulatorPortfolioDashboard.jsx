import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { simDb } from '../../../services/supabase/supabaseClient';
import { PieChart, TrendingUp, Target, BarChart3 } from 'lucide-react';
import LearningPathWidget from '../../../components/sim/role/LearningPathWidget';
import RoleWelcomeTips from '../../../components/sim/role/RoleWelcomeTips';

export default function SimulatorPortfolioDashboard() {
  const [stats, setStats] = useState({ portfolios: 0, programmes: 0, projects: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [pf, pgm, proj] = await Promise.all([
          simDb.from('practice_portfolios').select('id', { count: 'exact', head: true }),
          simDb.from('practice_programmes').select('id', { count: 'exact', head: true }),
          simDb.from('practice_projects').select('id', { count: 'exact', head: true }),
        ]);
        setStats({
          portfolios: pf.count || 0,
          programmes: pgm.count || 0,
          projects: proj.count || 0,
        });
      } catch (err) {
        console.error('Portfolio dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Practice Portfolios', value: stats.portfolios, icon: PieChart, link: '/simulator/portfolio/strategic-alignment' },
    { label: 'Programmes in Portfolio', value: stats.programmes, icon: TrendingUp, link: '/simulator/programme/dashboard' },
    { label: 'Projects Tracked', value: stats.projects, icon: BarChart3, link: '/simulator/practice-portfolio/projects' },
    { label: 'Strategic Alignment', value: '—', icon: Target, link: '/simulator/portfolio/strategic-alignment' },
  ];

  return (
    <div className="space-y-6">
      <RoleWelcomeTips roleId="portfolio_manager" />
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Portfolio Manager Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Prioritise investments, balance risk and return, and align delivery with strategy.
        </p>
      </div>
      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Link key={c.label} to={c.link} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 hover:border-indigo-500 transition-colors">
              <c.icon className="h-6 w-6 text-indigo-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{c.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{c.label}</p>
            </Link>
          ))}
        </div>
      )}
      <LearningPathWidget roleId="portfolio_manager" />
    </div>
  );
}
