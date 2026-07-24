import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import {
  Bold, Italic, Heading, Link as LinkIcon, Code, List, ListOrdered,
  Eye, Edit3, Columns, ExternalLink, Save, X, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getGuideById,
  loadDocumentationFile,
  saveGuideMetadata,
  uploadDocumentationFile,
} from '../../services/documentationService';
import { platformDb } from '@nidus/supabase';

// All modules from the registry
const PLATFORM_MODULES = [
  { value: 'general',               label: 'General' },
  { value: 'planning-hub',          label: 'Planning Hub' },
  { value: 'risk-module',           label: 'Risk Management' },
  { value: 'quality-module',        label: 'Quality Management' },
  { value: 'financial-module',      label: 'Financial Management' },
  { value: 'change-module',         label: 'Change Management' },
  { value: 'stakeholder-module',    label: 'Stakeholder Management' },
  { value: 'delays-module',         label: 'Delays' },
  { value: 'stage-gates-module',    label: 'Stage Gates' },
  { value: 'pmo-module',            label: 'PMO' },
  { value: 'portfolio-module',      label: 'Portfolio' },
  { value: 'programme-module',      label: 'Programme' },
  { value: 'benefits-module',       label: 'Benefits' },
  { value: 'issues-module',         label: 'Issues' },
  { value: 'communications-module', label: 'Communications' },
  { value: 'reports-module',        label: 'Reports' },
  { value: 'admin-module',          label: 'Administration' },
];

const SIMULATOR_MODULES = [
  { value: 'general',                label: 'General' },
  { value: 'sim-planning-module',    label: 'Sim Planning' },
  { value: 'sim-risk-module',        label: 'Sim Risk' },
  { value: 'sim-quality-module',     label: 'Sim Quality' },
  { value: 'sim-pmo-module',         label: 'Sim PMO' },
  { value: 'sim-scenarios-module',   label: 'Sim Scenarios' },
  { value: 'sim-leaderboard-module', label: 'Sim Leaderboard' },
  { value: 'sim-admin-module',       label: 'Sim Administration' },
];

const toSlug = (str) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const toFileName = (title, system, module) =>
  `${title.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '')}.md`;

const DRAFT_KEY = (guideId, system) => `doc_draft_${system}_${guideId}`;
const AUTO_SAVE_MS = 30_000;

// ── Markdown toolbar helpers ──────────────────────────────────────────────────
function insertAtCursor(textarea, before, after = '') {
  const start = textarea.selectionStart;
  const end   = textarea.selectionEnd;
  const sel   = textarea.value.slice(start, end);
  const replacement = before + (sel || 'text') + after;
  const newVal = textarea.value.slice(0, start) + replacement + textarea.value.slice(end);
  // Return new value and new cursor position
  return { value: newVal, cursor: start + before.length + (sel || 'text').length + after.length };
}

const TOOLBAR = [
  { icon: Bold,         title: 'Bold',        before: '**', after: '**' },
  { icon: Italic,       title: 'Italic',      before: '_',  after: '_'  },
  { icon: Heading,      title: 'Heading',     before: '## ', after: '' },
  { icon: LinkIcon,     title: 'Link',        before: '[',  after: '](url)' },
  { icon: Code,         title: 'Code block',  before: '```\n', after: '\n```' },
  { icon: List,         title: 'Bullet list', before: '- ', after: '' },
  { icon: ListOrdered,  title: 'Numbered list', before: '1. ', after: '' },
];

// ── Main component ────────────────────────────────────────────────────────────
export default function DocumentationAdminEditor() {
  const { id }           = useParams();           // undefined = create mode
  const [params]         = useSearchParams();
  const navigate         = useNavigate();
  const isEdit           = !!id;

  // Metadata form
  const [system,    setSystem]    = useState(params.get('system') || 'platform');
  const [title,     setTitle]     = useState('');
  const [guideId,   setGuideId]   = useState('');
  const [module,    setModule]    = useState('general');
  const [category,  setCategory]  = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive,  setIsActive]  = useState(true);
  const [fileName,  setFileName]  = useState('');

  // Editor state
  const [mdContent, setMdContent] = useState('');
  const [paneMode,  setPaneMode]  = useState('split'); // 'edit' | 'split' | 'preview'
  const textareaRef = useRef(null);

  // UI state
  const [loading,   setLoading]   = useState(isEdit);
  const [saving,    setSaving]    = useState(false);
  const [dirty,     setDirty]     = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [showDiscardPrompt, setShowDiscardPrompt] = useState(false);
  const autoSaveTimer = useRef(null);

  const moduleOptions = system === 'simulator' ? SIMULATOR_MODULES : PLATFORM_MODULES;

  // Word / char count
  const words = mdContent.trim() ? mdContent.trim().split(/\s+/).length : 0;
  const chars = mdContent.length;

  // ── Load existing guide in edit mode ───────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      setLoading(true);
      try {
        // Fetch row directly (admin sees inactive too)
        const { data, error } = await platformDb
          .from('documentation_guides')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;

        setSystem(data.system);
        setTitle(data.title);
        setGuideId(data.guide_id);
        setModule(data.module);
        setCategory(data.category);
        setSortOrder(data.sort_order);
        setIsActive(data.is_active);
        setFileName(data.file_name);

        // Check for draft first
        const draftKey = DRAFT_KEY(data.guide_id, data.system);
        const draft = localStorage.getItem(draftKey);
        if (draft) {
          setMdContent(draft);
          setDraftRestored(true);
        } else {
          const md = await loadDocumentationFile(data.file_name, data.system, data.module);
          setMdContent(md);
        }
      } catch (err) {
        toast.error('Failed to load guide');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  // In create mode, check for draft by slug
  useEffect(() => {
    if (isEdit || !guideId) return;
    const draft = localStorage.getItem(DRAFT_KEY(guideId, system));
    if (draft && !draftRestored) {
      setMdContent(draft);
      setDraftRestored(true);
    }
  }, [guideId, system, isEdit, draftRestored]);

  // ── Auto-derive guide id from title (create mode) ─────────────────────────
  useEffect(() => {
    if (isEdit) return;
    setGuideId(toSlug(title));
    setFileName(toFileName(title, system, module));
  }, [title, isEdit, system, module]);

  // ── Auto-save draft ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!dirty || !guideId) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY(guideId, system), mdContent);
    }, AUTO_SAVE_MS);
    return () => clearTimeout(autoSaveTimer.current);
  }, [mdContent, dirty, guideId, system]);

  const handleContentChange = (val) => {
    setMdContent(val);
    setDirty(true);
  };

  // ── Toolbar insert ─────────────────────────────────────────────────────────
  const handleToolbar = (before, after) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { value, cursor } = insertAtCursor(ta, before, after);
    setMdContent(value);
    setDirty(true);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    }, 0);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!module)       { toast.error('Module is required'); return; }
    if (!category.trim()) { toast.error('Category is required'); return; }
    if (!mdContent.trim()) { toast.error('Content cannot be empty'); return; }

    setSaving(true);
    try {
      const effectiveFileName = fileName || toFileName(title, system, module);

      // 1. Upload .md to Storage
      await uploadDocumentationFile(system, module, effectiveFileName, mdContent);

      // 2. Upsert DB row
      const row = {
        ...(isEdit ? { id } : {}),
        guide_id:   guideId || toSlug(title),
        title:      title.trim(),
        file_name:  effectiveFileName,
        category:   category.trim(),
        module,
        system,
        sort_order: Number(sortOrder) || 0,
        is_active:  isActive,
      };
      await saveGuideMetadata(row);

      // 3. Clear draft
      localStorage.removeItem(DRAFT_KEY(row.guide_id, system));

      toast.success(`Guide "${title}" ${isEdit ? 'updated' : 'created'}`);
      navigate(`/app/admin/documentation?system=${system}`);
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel / discard ──────────────────────────────────────────────────────
  const handleCancel = () => {
    if (dirty) { setShowDiscardPrompt(true); return; }
    navigate(`/app/admin/documentation?system=${system}`);
  };

  const confirmDiscard = () => {
    if (guideId) localStorage.removeItem(DRAFT_KEY(guideId, system));
    navigate(`/app/admin/documentation?system=${system}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white mr-2">
          {isEdit ? 'Edit Guide' : 'New Guide'}
        </h1>

        {draftRestored && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-1 rounded-full">
            Draft restored
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          {guideId && (
            <a
              href={`/documentation/${system}/${guideId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Preview in Docs
            </a>
          )}
          <button onClick={handleCancel}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
            <X className="h-5 w-5" />
          </button>
          <button onClick={handleSave} disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Guide'}
          </button>
        </div>
      </div>

      {/* ── Metadata form ── */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* Title */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Getting Started with Risk Management"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Guide ID */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Guide ID (slug)</label>
            <input value={guideId} onChange={e => setGuideId(e.target.value)}
              placeholder="auto-derived from title"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* System */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">System *</label>
            <div className="flex gap-2 mt-1">
              {['platform', 'simulator'].map(s => (
                <label key={s} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" value={s} checked={system === s} onChange={() => { setSystem(s); setModule('general'); }}
                    className="text-blue-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Module */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Module *</label>
            <select value={module} onChange={e => setModule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {moduleOptions.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category *</label>
            <input value={category} onChange={e => setCategory(e.target.value)}
              placeholder="e.g. Getting Started, Advanced"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Sort order */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sort Order</label>
            <input type="number" value={sortOrder} onChange={e => setSortOrder(e.target.value)} min={0} step={10}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Active toggle */}
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                onClick={() => setIsActive(p => !p)}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isActive ? 'translate-x-5' : ''}`} />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Editor area ── */}
      <div className="flex-1 flex flex-col">

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-1 flex-wrap">
          {/* Markdown insert buttons */}
          {TOOLBAR.map(({ icon: Icon, title: t, before, after }) => (
            <button key={t} onClick={() => handleToolbar(before, after)} title={t}
              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors">
              <Icon className="h-4 w-4" />
            </button>
          ))}

          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 mx-1" />

          {/* Pane mode */}
          {[
            { mode: 'edit',    icon: Edit3,   label: 'Edit'    },
            { mode: 'split',   icon: Columns, label: 'Split'   },
            { mode: 'preview', icon: Eye,     label: 'Preview' },
          ].map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => setPaneMode(mode)} title={label}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors ${
                paneMode === mode
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}

          {/* Word / char count */}
          <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 hidden sm:block">
            {words} words · {chars} chars
          </span>
        </div>

        {/* Panes */}
        <div className={`flex-1 flex ${paneMode === 'split' ? 'flex-row divide-x divide-gray-200 dark:divide-gray-700' : 'flex-col'} min-h-0`}>

          {/* Edit pane */}
          {paneMode !== 'preview' && (
            <div className={`flex flex-col ${paneMode === 'split' ? 'w-1/2' : 'flex-1'}`}>
              <textarea
                ref={textareaRef}
                value={mdContent}
                onChange={e => handleContentChange(e.target.value)}
                placeholder="Write your documentation in Markdown…"
                className="flex-1 w-full p-6 font-mono text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 resize-none focus:outline-none leading-relaxed"
                spellCheck={false}
              />
            </div>
          )}

          {/* Preview pane */}
          {paneMode !== 'edit' && (
            <div className={`flex flex-col ${paneMode === 'split' ? 'w-1/2' : 'flex-1'} overflow-auto`}>
              <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
                {mdContent ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeSlug]}
                    components={{
                      h1: ({ node, ...p }) => <h1 className="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2" {...p} />,
                      h2: ({ node, ...p }) => <h2 className="text-xl font-bold mt-5 mb-2 text-gray-900 dark:text-white" {...p} />,
                      h3: ({ node, ...p }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900 dark:text-white" {...p} />,
                      p:  ({ node, ...p }) => <p className="mb-3 text-gray-700 dark:text-gray-300 leading-relaxed" {...p} />,
                      ul: ({ node, ...p }) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300" {...p} />,
                      ol: ({ node, ...p }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700 dark:text-gray-300" {...p} />,
                      li: ({ node, ...p }) => <li className="ml-3" {...p} />,
                      code: ({ node, inline, ...p }) =>
                        inline
                          ? <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-xs text-red-600 dark:text-red-400 font-mono" {...p} />
                          : <code className="block bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mb-3" {...p} />,
                      pre: ({ node, ...p }) => <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mb-3" {...p} />,
                      blockquote: ({ node, ...p }) => <blockquote className="border-l-4 border-blue-500 pl-3 italic text-gray-600 dark:text-gray-400 my-3" {...p} />,
                      table: ({ node, ...p }) => <div className="overflow-x-auto my-4"><table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 text-sm" {...p} /></div>,
                      th: ({ node, ...p }) => <th className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 font-semibold text-left" {...p} />,
                      td: ({ node, ...p }) => <td className="border border-gray-300 dark:border-gray-600 px-3 py-1.5" {...p} />,
                      a:  ({ node, href, ...p }) => <a href={href} className="text-blue-600 dark:text-blue-400 hover:underline" target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" {...p} />,
                      strong: ({ node, ...p }) => <strong className="font-semibold text-gray-900 dark:text-white" {...p} />,
                    }}
                  >
                    {mdContent}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-400 dark:text-gray-500 italic text-sm">Preview will appear here as you type…</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Discard confirmation */}
      {showDiscardPrompt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Discard changes?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  You have unsaved changes. They will be lost if you leave.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDiscardPrompt(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Keep editing
              </button>
              <button onClick={confirmDiscard}
                className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors">
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
