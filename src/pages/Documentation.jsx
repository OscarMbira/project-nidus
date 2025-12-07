import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { BookOpen, Search, ChevronRight, Home, Zap } from 'lucide-react';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ThemeToggle';
import {
  getDocumentationGuides,
  getGuideById,
  getCategories,
  loadDocumentationFile
} from '../services/documentationService';

const Documentation = () => {
  const { platform: platformParam = 'pm', guideId: guideIdParam } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  // Normalize platform name
  const platform = platformParam === 'pm-platform' ? 'pm' : platformParam;
  const guideId = guideIdParam || 'getting-started';

  const platformData = getDocumentationGuides(platform);
  const categories = getCategories(platform);
  const currentGuide = getGuideById(platform, guideId);

  // Redirect to getting-started if no guideId provided
  useEffect(() => {
    if (!guideIdParam && platformData) {
      navigate(`/documentation/${platform}/getting-started`, { replace: true });
    }
  }, [guideIdParam, platform, platformData, navigate]);

  useEffect(() => {
    loadGuide();
  }, [platform, guideId]);

  // Handle hash navigation and smooth scrolling
  useEffect(() => {
    if (!loading && content) {
      // Wait for content to render, then handle hash
      const timer = setTimeout(() => {
        const hash = window.location.hash;
        if (hash) {
          const id = decodeURIComponent(hash.substring(1)); // Remove the # and decode
          const element = document.getElementById(id);
          if (element) {
            // Account for sticky header
            const headerOffset = 80;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }
      }, 300); // Increased timeout to ensure rehype-slug has processed

      return () => clearTimeout(timer);
    }
  }, [loading, content]);

  // Handle anchor link clicks - intercept clicks on anchor links in markdown
  useEffect(() => {
    const handleAnchorClick = (e) => {
      // Check if clicked element is an anchor link or inside one
      const anchor = e.target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const id = decodeURIComponent(href.substring(1));
          
          // Wait a bit for any re-renders
          setTimeout(() => {
            const element = document.getElementById(id);
            if (element) {
              // Account for sticky header
              const headerOffset = 80;
              const elementPosition = element.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

              window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
              });

              // Update URL
              window.history.pushState(null, '', `${window.location.pathname}${href}`);
            }
          }, 50);
        }
      }
    };

    document.addEventListener('click', handleAnchorClick, true); // Use capture phase
    return () => document.removeEventListener('click', handleAnchorClick, true);
  }, [content]);

  const processMarkdownContent = (markdown, title) => {
    // Remove the first H1 (# Title) if it matches the page title to avoid duplication
    const lines = markdown.split('\n');
    let processedLines = [...lines];
    
    // Check if first line is an H1 that matches the title
    if (lines[0] && lines[0].startsWith('# ')) {
      const firstH1Text = lines[0].replace(/^#\s+/, '').trim();
      // Normalize for comparison (case-insensitive, remove extra spaces)
      const normalizedH1 = firstH1Text.toLowerCase().replace(/\s+/g, ' ');
      const normalizedTitle = title?.toLowerCase().replace(/\s+/g, ' ') || '';
      
      // If the H1 matches the title or is very similar, remove it
      if (normalizedH1 === normalizedTitle || 
          normalizedH1.includes(normalizedTitle) || 
          normalizedTitle.includes(normalizedH1)) {
        processedLines = lines.slice(1);
        // Also remove the next blank line if present
        if (processedLines[0]?.trim() === '') {
          processedLines = processedLines.slice(1);
        }
      }
    }
    
    return processedLines.join('\n');
  };

  const loadGuide = async () => {
    if (!currentGuide) {
      setError('Guide not found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const markdown = await loadDocumentationFile(currentGuide.file);
      // Process markdown to remove duplicate title H1
      const processedMarkdown = processMarkdownContent(markdown, currentGuide.title);
      setContent(processedMarkdown);
    } catch (err) {
      console.error('Error loading guide:', err);
      setError(`Failed to load documentation: ${currentGuide.file}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuides = platformData?.guides.filter(guide =>
    guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    guide.category.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  if (!platformData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Platform not found</h1>
          <Link to="/" className="text-blue-600 hover:underline">Return to home</Link>
        </div>
      </div>
    );
  }

  // Determine header styling based on platform
  const isPMPlatform = platform === 'pm' || platform === 'pm-platform';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Platform-specific styling */}
      <header 
        className="sticky top-0 z-50 shadow-sm border-b backdrop-blur-md"
        style={isPMPlatform 
          ? { background: 'linear-gradient(135deg, #0F2027 0%, #203A43 100%)', borderColor: '#203A43' }
          : { background: 'linear-gradient(to right, #065f46, #047857, #059669)', borderColor: '#047857' }
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Zap 
              className="h-6 w-6" 
              style={isPMPlatform ? { color: '#A8DADC' } : { color: '#d1fae5' }} 
            />
            <div className="flex flex-col">
              <span className="text-3xl font-bold">
                {isPMPlatform ? (
                  <>
                    <span style={{ color: '#A8DADC' }}>Project</span>
                    <span style={{ color: '#E63946' }} className="ml-1">Nidus</span>
                  </>
                ) : (
                  <>
                    <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                      Project
                    </span>
                    <span className="bg-gradient-to-r from-orange-400 via-red-500 to-red-600 bg-clip-text text-transparent ml-1">
                      Nidus
                    </span>
                  </>
                )}
              </span>
              <div className="flex flex-col">
                <span 
                  className="text-sm font-medium mt-0.5"
                  style={isPMPlatform ? { color: '#A8DADC' } : { color: '#d1fae5' }}
                >
                  {platformData.name}
                </span>
                <div 
                  className="h-0.5 mt-0.5"
                  style={isPMPlatform ? { background: '#E63946' } : { background: '#34d399' }}
                ></div>
              </div>
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-10">
            <Link
              to={isPMPlatform ? "/pm" : "/simulator"}
              className="text-sm font-medium transition-colors"
              style={isPMPlatform ? { color: '#A8DADC' } : { color: '#d1fae5' }}
              onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
              onMouseLeave={(e) => e.target.style.color = isPMPlatform ? '#A8DADC' : '#d1fae5'}
            >
              Home
            </Link>
            <Link
              to={`/documentation/${platform}`}
              className="text-sm font-medium transition-colors"
              style={isPMPlatform ? { color: '#FFFFFF', fontWeight: '600' } : { color: '#FFFFFF', fontWeight: '600' }}
            >
              Documentation
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button 
              variant="outline" 
              asChild
              className="bg-transparent shadow-lg transition-colors"
              style={isPMPlatform 
                ? { borderColor: '#A8DADC', color: '#A8DADC' }
                : { borderColor: '#d1fae5', color: '#d1fae5' }
              }
              onMouseEnter={(e) => { 
                e.currentTarget.style.backgroundColor = isPMPlatform 
                  ? 'rgba(168, 218, 220, 0.1)' 
                  : 'rgba(209, 250, 229, 0.1)';
                e.currentTarget.style.borderColor = '#FFFFFF';
              }}
              onMouseLeave={(e) => { 
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = isPMPlatform ? '#A8DADC' : '#d1fae5';
              }}
            >
              <Link to="/login">Login</Link>
            </Button>
            <Button 
              asChild
              className="text-white shadow-lg transition-colors"
              style={isPMPlatform 
                ? { background: '#E63946' }
                : { background: '#059669' }
              }
              onMouseEnter={(e) => e.currentTarget.style.background = isPMPlatform ? '#d62839' : '#047857'}
              onMouseLeave={(e) => e.currentTarget.style.background = isPMPlatform ? '#E63946' : '#059669'}
            >
              <Link to="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 h-fit">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documentation..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Navigation */}
              <nav>
                {categories.map((category) => {
                  const categoryGuides = platformData.guides.filter(
                    g => g.category === category && 
                    (filteredGuides.length === 0 || filteredGuides.some(fg => fg.id === g.id))
                  );

                  if (categoryGuides.length === 0) return null;

                  return (
                    <div key={category} className="mb-6">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                        {category}
                      </h3>
                      <ul className="space-y-1">
                        {categoryGuides.map((guide) => (
                          <li key={guide.id}>
                            <Link
                              to={`/documentation/${platform}/${guide.id}`}
                              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                                guide.id === guideId
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
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
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <main className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 lg:p-12">
            {/* Breadcrumb */}
            <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
              <Link to="/" className="hover:text-gray-700 dark:hover:text-gray-200">Home</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to={`/documentation/${platform}`} className="hover:text-gray-700 dark:hover:text-gray-200">
                Documentation
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="text-gray-900 dark:text-gray-100">{currentGuide?.title || 'Guide'}</span>
            </nav>

            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
                <p className="text-red-800 dark:text-red-200">{error}</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  Please ensure the Documentation folder is accessible and contains the required markdown files.
                </p>
              </div>
            )}

            {!loading && !error && content && (
              <article className="prose prose-lg dark:prose-invert max-w-none">
                <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
                  <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3">
                    {currentGuide?.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {platformData.name}
                    </span>
                    <span>Last updated: {new Date().toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[
                      rehypeSlug
                    ]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2" {...props} />
                      ),
                      h2: ({ node, id, ...props }) => (
                        <h2 
                          id={id}
                          className="text-2xl font-bold mt-8 mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 scroll-mt-20" 
                          {...props} 
                        />
                      ),
                      h3: ({ node, id, ...props }) => (
                        <h3 
                          id={id}
                          className="text-xl font-semibold mt-6 mb-3 text-gray-900 dark:text-white scroll-mt-20" 
                          {...props} 
                        />
                      ),
                      h4: ({ node, id, ...props }) => (
                        <h4 
                          id={id}
                          className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white scroll-mt-20" 
                          {...props} 
                        />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="ml-4" {...props} />
                      ),
                      code: ({ node, inline, ...props }) => {
                        if (inline) {
                          return (
                            <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm text-red-600 dark:text-red-400 font-mono" {...props} />
                          );
                        }
                        return (
                          <code className="block bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
                        );
                      },
                      pre: ({ node, ...props }) => (
                        <pre className="bg-gray-900 dark:bg-gray-950 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4" {...props} />
                      ),
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 my-4 italic text-gray-600 dark:text-gray-400" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-6">
                          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600" {...props} />
                        </div>
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 bg-gray-100 dark:bg-gray-700 font-semibold text-left" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" {...props} />
                      ),
                      a: ({ node, href, ...props }) => {
                        // Handle anchor links with smooth scrolling
                        if (href && href.startsWith('#')) {
                          return (
                            <a
                              href={href}
                              className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const id = decodeURIComponent(href.substring(1));
                                
                                // Use setTimeout to ensure DOM is ready
                                setTimeout(() => {
                                  const element = document.getElementById(id);
                                  if (element) {
                                    const headerOffset = 80;
                                    const elementPosition = element.getBoundingClientRect().top;
                                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                                    window.scrollTo({
                                      top: offsetPosition,
                                      behavior: 'smooth'
                                    });

                                    // Update URL
                                    window.history.pushState(null, '', `${window.location.pathname}${href}`);
                                  }
                                }, 100);
                              }}
                              {...props}
                            />
                          );
                        }
                        // External links
                        return (
                          <a 
                            href={href}
                            className="text-blue-600 dark:text-blue-400 hover:underline"
                            target={href?.startsWith('http') ? '_blank' : undefined}
                            rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                            {...props} 
                          />
                        );
                      },
                      strong: ({ node, ...props }) => (
                        <strong className="font-semibold text-gray-900 dark:text-white" {...props} />
                      ),
                    }}
                  >
                    {content}
                  </ReactMarkdown>
                </div>
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Documentation;

