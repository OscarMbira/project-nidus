import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { BookOpen, Search, ChevronRight, ChevronDown, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ThemeToggle';
import PlatformFooter from '../components/homepage/PlatformFooter';
import SimulatorFooter from '../components/homepage/SimulatorFooter';
import {
  getModules,
  getDocumentationGuides,
  getGuideById,
  loadDocumentationFile,
} from '../services/documentationService';

// Human-readable display names for module slugs
const MODULE_DISPLAY_NAMES = {
  'general':               'General',
  'planning-hub':          'Planning Hub',
  'risk-module':           'Risk Management',
  'quality-module':        'Quality Management',
  'financial-module':      'Financial Management',
  'change-module':         'Change Management',
  'stakeholder-module':    'Stakeholder Management',
  'delays-module':         'Delays',
  'stage-gates-module':    'Stage Gates',
  'pmo-module':            'PMO',
  'portfolio-module':      'Portfolio',
  'programme-module':      'Programme',
  'benefits-module':       'Benefits',
  'issues-module':         'Issues',
  'communications-module': 'Communications',
  'reports-module':        'Reports',
  'admin-module':          'Administration',
  'sim-planning-module':   'Sim Planning',
  'sim-risk-module':       'Sim Risk',
  'sim-quality-module':    'Sim Quality',
  'sim-pmo-module':        'Sim PMO',
  'sim-scenarios-module':  'Sim Scenarios',
  'sim-leaderboard-module':'Sim Leaderboard',
  'sim-admin-module':      'Sim Administration',
};

const moduleDisplayName = (slug) => MODULE_DISPLAY_NAMES[slug] || slug;

// Sidebar skeleton shown while the guide index loads
const SidebarSkeleton = () => (
  <div className="animate-pulse space-y-4">
    {[1, 2, 3].map(i => (
      <div key={i}>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="space-y-1 pl-2">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-5/6" />
        </div>
      </div>
    ))}
  </div>
);

const Documentation = () => {
  const { platform: platformParam = 'platform', guideId: guideIdParam } = useParams();
  const navigate = useNavigate();

  const platform = platformParam === 'pm-platform' || platformParam === 'pm' ? 'platform' : platformParam;
  const guideId  = guideIdParam || 'getting-started';

  // Guide index state
  const [modules, setModules]           = useState([]);
  const [allGuides, setAllGuides]       = useState([]);
  const [currentGuide, setCurrentGuide] = useState(null);
  const [indexLoading, setIndexLoading] = useState(true);
  const [indexError, setIndexError]     = useState(null);

  // Expanded modules in sidebar (set holds open module slugs)
  const [expandedModules, setExpandedModules] = useState(new Set(['general']));

  // Content state
  const [content, setContent]       = useState('');
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError]     = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const isPlatform = platform === 'platform' || platform === 'pm' || platform === 'pm-platform';

  // ------------------------------------------------------------------
  // Load guide index from DB
  // ------------------------------------------------------------------
  const loadIndex = useCallback(async () => {
    setIndexLoading(true);
    setIndexError(null);
    try {
      const [mods, guides] = await Promise.all([
        getModules(platform),
        getDocumentationGuides(platform),
      ]);
      setModules(mods);
      setAllGuides(guides);
    } catch (err) {
      setIndexError('Failed to load documentation index.');
      console.error(err);
    } finally {
      setIndexLoading(false);
    }
  }, [platform]);

  useEffect(() => { loadIndex(); }, [loadIndex]);

  // ------------------------------------------------------------------
  // Resolve current guide and expand its module when index is ready
  // ------------------------------------------------------------------
  useEffect(() => {
    if (indexLoading || allGuides.length === 0) return;
    const guide = allGuides.find(g => g.guide_id === guideId) || null;
    setCurrentGuide(guide);
    if (guide) {
      setExpandedModules(prev => new Set([...prev, guide.module]));
    } else if (!guideIdParam) {
      // Redirect to first available guide
      const first = allGuides[0];
      if (first) navigate(`/documentation/${platform}/${first.guide_id}`, { replace: true });
    }
  }, [allGuides, guideId, guideIdParam, indexLoading, navigate, platform]);

  // ------------------------------------------------------------------
  // Load guide content from Supabase Storage (with local fallback)
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!currentGuide) return;
    let cancelled = false;

    const load = async () => {
      setContentLoading(true);
      setContentError(null);
      try {
        const md = await loadDocumentationFile(
          currentGuide.file_name,
          platform,
          currentGuide.module,
        );
        if (!cancelled) setContent(processMarkdown(md, currentGuide.title));
      } catch (err) {
        if (!cancelled) setContentError(`Could not load: ${currentGuide.file_name}`);
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [currentGuide, platform]);

  // Smooth scroll on hash in URL
  useEffect(() => {
    if (contentLoading || !content) return;
    const timer = setTimeout(() => {
      const hash = window.location.hash;
      if (!hash) return;
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(timer);
  }, [contentLoading, content]);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const processMarkdown = (markdown, title) => {
    const lines = markdown.split('\n');
    if (!lines[0]?.startsWith('# ')) return markdown;
    const h1 = lines[0].replace(/^#\s+/, '').trim().toLowerCase();
    const t  = (title || '').toLowerCase();
    if (h1 === t || h1.includes(t) || t.includes(h1)) {
      const rest = lines.slice(1);
      return (rest[0]?.trim() === '' ? rest.slice(1) : rest).join('\n');
    }
    return markdown;
  };

  const toggleModule = (mod) => {
    setExpandedModules(prev => {
      const next = new Set(prev);
      next.has(mod) ? next.delete(mod) : next.add(mod);
      return next;
    });
  };

  // Filtered guide list for search
  const filteredGuides = searchQuery
    ? allGuides.filter(g =>
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        moduleDisplayName(g.module).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  // Guides to show per module (null filteredGuides = show all)
  const guidesForModule = (mod) => {
    const base = allGuides.filter(g => g.module === mod);
    if (!filteredGuides) return base;
    return base.filter(g => filteredGuides.some(fg => fg.guide_id === g.guide_id));
  };

  const headerStyle = isPlatform
    ? { background: 'linear-gradient(135deg, #0F2027 0%, #203A43 100%)', borderColor: '#203A43' }
    : { background: 'linear-gradient(to right, #065f46, #047857, #059669)', borderColor: '#047857' };
  const accentColor  = isPlatform ? '#A8DADC' : '#d1fae5';
  const badgeColor   = isPlatform ? '#E63946'  : '#34d399';
  const btnBg        = isPlatform ? '#E63946'  : '#059669';
  const btnHover     = isPlatform ? '#d62839'  : '#047857';
  const loginTo      = isPlatform ? '/platform/login'    : '/simulator/login';
  const registerTo   = isPlatform ? '/platform/register' : '/simulator/register';
  const homeTo       = isPlatform ? '/'        : '/';
  const systemLabel  = isPlatform ? 'Platform' : 'Simulator';

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-50 shadow-sm border-b backdrop-blur-md" style={headerStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={homeTo} className="flex items-center gap-3">
            <Zap className="h-6 w-6" style={{ color: accentColor }} />
            <div className="flex flex-col">
              <span className="text-3xl font-bold">
                {isPlatform ? (
                  <>
                    <span style={{ color: '#A8DADC' }}>Project</span>
                    <span style={{ color: '#E63946' }} className="ml-1">Nidus</span>
                  </>
                ) : (
                  <>
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">Project</span>
                    <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent ml-1">Nidus</span>
                  </>
                )}
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium mt-0.5" style={{ color: accentColor }}>{systemLabel}</span>
                <div className="h-0.5 mt-0.5" style={{ background: badgeColor }} />
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
            <Link to={homeTo} className="text-sm font-medium transition-colors" style={{ color: accentColor }}
              onMouseEnter={e => e.target.style.color='#fff'} onMouseLeave={e => e.target.style.color=accentColor}>
              Home
            </Link>
            <span className="text-sm font-semibold text-white">Documentation</span>
          </nav>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" asChild className="bg-transparent shadow-lg"
              style={{ borderColor: accentColor, color: accentColor }}>
              <Link to={loginTo}>Login</Link>
            </Button>
            <Button asChild className="text-white shadow-lg" style={{ background: btnBg }}
              onMouseEnter={e => e.currentTarget.style.background=btnHover}
              onMouseLeave={e => e.currentTarget.style.background=btnBg}>
              <Link to={registerTo}>Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

          {/* ── Sidebar ── */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              {/* Search */}
              <div className="mb-6 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search documentation..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Navigation */}
              {indexLoading ? (
                <SidebarSkeleton />
              ) : indexError ? (
                <p className="text-sm text-red-500 dark:text-red-400">{indexError}</p>
              ) : (
                <nav className="space-y-1">
                  {modules.map(mod => {
                    const guides = guidesForModule(mod);
                    if (guides.length === 0) return null;
                    const isOpen = expandedModules.has(mod) || !!searchQuery;
                    const hasActive = guides.some(g => g.guide_id === guideId);

                    return (
                      <div key={mod}>
                        {/* Module header */}
                        <button
                          onClick={() => toggleModule(mod)}
                          className={`w-full flex items-center justify-between px-2 py-2 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors ${
                            hasActive
                              ? isPlatform
                                ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                                : 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="h-3.5 w-3.5 shrink-0" />
                            {moduleDisplayName(mod)}
                          </span>
                          <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'}`} />
                        </button>

                        {/* Guides within this module, grouped by category */}
                        {isOpen && (() => {
                          const categories = [...new Set(guides.map(g => g.category))];
                          return (
                            <div className="mt-1 ml-2 border-l border-gray-200 dark:border-gray-600 pl-3 space-y-3 mb-2">
                              {categories.map(cat => {
                                const catGuides = guides.filter(g => g.category === cat);
                                return (
                                  <div key={cat}>
                                    {categories.length > 1 && (
                                      <p className="text-xs text-gray-400 dark:text-gray-500 font-medium mb-1">{cat}</p>
                                    )}
                                    <ul className="space-y-0.5">
                                      {catGuides.map(guide => (
                                        <li key={guide.guide_id}>
                                          <Link
                                            to={`/documentation/${platform}/${guide.guide_id}`}
                                            className={`block px-2 py-1.5 rounded text-sm transition-colors ${
                                              guide.guide_id === guideId
                                                ? isPlatform
                                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                                                  : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                            }`}
                                          >
                                            {guide.title}
                                          </Link>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </nav>
              )}
            </div>
          </aside>

          {/* ── Main Content ── */}
          <main className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 lg:p-12">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6 flex-wrap gap-y-1">
              <Link to={homeTo} className="hover:text-gray-700 dark:hover:text-gray-200">Home</Link>
              <ChevronRight className="h-4 w-4 shrink-0" />
              <Link to={`/documentation/${platform}`} className="hover:text-gray-700 dark:hover:text-gray-200">Documentation</Link>
              {currentGuide && (
                <>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                  <span className="text-gray-500 dark:text-gray-400">{moduleDisplayName(currentGuide.module)}</span>
                  <ChevronRight className="h-4 w-4 shrink-0" />
                  <span className="text-gray-900 dark:text-gray-100">{currentGuide.title}</span>
                </>
              )}
            </nav>

            {/* Content loading */}
            {contentLoading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
            )}

            {/* Content error */}
            {contentError && !contentLoading && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
                <p className="text-red-800 dark:text-red-200">{contentError}</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Please ensure the documentation file is uploaded to Supabase Storage.
                </p>
              </div>
            )}

            {/* Guide not found */}
            {!contentLoading && !currentGuide && !indexLoading && (
              <div className="text-center py-20">
                <p className="text-gray-500 dark:text-gray-400 mb-4">Guide not found.</p>
                <Link to={`/documentation/${platform}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
                  Back to documentation
                </Link>
              </div>
            )}

            {/* Rendered markdown */}
            {!contentLoading && !contentError && content && (
              <article className="prose prose-lg dark:prose-invert max-w-none">
                <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">{currentGuide?.title}</h1>
                  <div className="flex items-center gap-3 flex-wrap text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {systemLabel}
                    </span>
                    {currentGuide && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {moduleDisplayName(currentGuide.module)}
                      </span>
                    )}
                  </div>
                </div>

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug]}
                  components={{
                    h1: ({ node, ...props }) => <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2" {...props} />,
                    h2: ({ node, id, ...props }) => <h2 id={id} className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 scroll-mt-20" {...props} />,
                    h3: ({ node, id, ...props }) => <h3 id={id} className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white scroll-mt-20" {...props} />,
                    h4: ({ node, id, ...props }) => <h4 id={id} className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white scroll-mt-20" {...props} />,
                    p:  ({ node, ...props }) => <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />,
                    li: ({ node, ...props }) => <li className="ml-4" {...props} />,
                    code: ({ node, inline, ...props }) =>
                      inline
                        ? <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm text-red-600 dark:text-red-400 font-mono" {...props} />
                        : <code className="block bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                    pre:        ({ node, ...props }) => <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 dark:text-gray-400" {...props} />,
                    table: ({ node, ...props }) => <div className="overflow-x-auto my-6"><table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} /></div>,
                    th: ({ node, ...props }) => <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-left" {...props} />,
                    td: ({ node, ...props }) => <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" {...props} />,
                    a:  ({ node, href, ...props }) => {
                      if (href?.startsWith('#')) {
                        return (
                          <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                            onClick={e => {
                              e.preventDefault();
                              setTimeout(() => {
                                const el = document.getElementById(decodeURIComponent(href.slice(1)));
                                if (el) {
                                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                  window.history.pushState(null, '', `${window.location.pathname}${href}`);
                                }
                              }, 100);
                            }} {...props} />
                        );
                      }
                      return <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline"
                        target={href?.startsWith('http') ? '_blank' : undefined}
                        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined} {...props} />;
                    },
                    strong: ({ node, ...props }) => <strong className="font-semibold text-gray-900 dark:text-white" {...props} />,
                  }}
                >
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </main>
        </div>
      </div>

      {isPlatform ? <PlatformFooter /> : <SimulatorFooter />}
    </div>
  );
};

export default Documentation;
