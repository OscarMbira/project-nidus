/**
 * Workspace Switcher (v982 Phase 4 — Workspace Switching)
 * Header-level control listing every workspace (account) the signed-in user can access
 * (get_user_accounts(), via getAccessibleWorkspaces()), current one indicated, click-to-switch.
 * Owned workspaces are shown first and visually distinguished from invited/member workspaces
 * (decision 2, accepted by default per user authorization).
 *
 * On switch: setActiveWorkspace() persists the selection + wipes the sidebar cache, then this
 * component forces a full page reload to a safe landing route — never a soft client-side
 * re-render — so every piece of state that assumed a single resolved account (menu, entitlements,
 * industry packs, in-flight caches, page-level component state) recomputes from a clean slate.
 * This is the deliberate, simplest way to guarantee zero stale-cache leakage between workspaces.
 *
 * Renders nothing for a user with 0 or 1 accessible workspace (zero switcher friction for the
 * common single-org case — task C/rule "preserve today's behaviour exactly"). Renders a compact
 * "no workspace" prompt instead of the switcher for the zero-workspace edge case (PRD open
 * decision 7).
 */
import { useState, useEffect, useRef } from 'react'
import { Building2, ChevronDown, Check, Crown, Plus } from 'lucide-react'
import { getAccessibleWorkspaces, setActiveWorkspace, getCurrentUserAccountId } from '@nidus/shared/utils/accountResolution'

const ONBOARDING_ROUTE = '/onboarding/organisation-setup'

export default function WorkspaceSwitcher({ subtextColor = 'text-gray-600 dark:text-gray-400', hoverBgClass = 'hover:bg-gray-100 dark:hover:bg-gray-700', borderColor = 'border-gray-200 dark:border-gray-800', headerBgClass = 'bg-white dark:bg-gray-900', textColor = 'text-gray-900 dark:text-white', landingRoute = '/platform/dashboard' }) {
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState([])
  const [currentAccountId, setCurrentAccountId] = useState(null)
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const [wsRes, accountId] = await Promise.all([getAccessibleWorkspaces(), getCurrentUserAccountId()])
      if (cancelled) return
      if (wsRes.success) setWorkspaces(wsRes.data)
      setCurrentAccountId(accountId)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  if (loading) return null

  // Zero-workspace edge case (PRD open decision 7) — a user with no accessible workspace at all
  // (e.g. removed from their only org) sees a lightweight prompt, not a broken/empty switcher and
  // not a raw error page.
  if (workspaces.length === 0) {
    return (
      <a
        href={ONBOARDING_ROUTE}
        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-amber-700 dark:text-amber-400 ${hoverBgClass} rounded-lg transition-colors`}
      >
        <Plus className="w-4 h-4" />
        Create or join a workspace
      </a>
    )
  }

  // Zero switcher friction for the common single-workspace case — resolution already resolves the
  // same account it always did, so there is nothing to switch between and no UI to show.
  if (workspaces.length === 1) return null

  const owned = workspaces.filter((w) => w.is_owner).sort((a, b) => String(a.account_name || '').localeCompare(String(b.account_name || '')))
  const member = workspaces.filter((w) => !w.is_owner).sort((a, b) => String(a.account_name || '').localeCompare(String(b.account_name || '')))
  const current = workspaces.find((w) => w.account_id === currentAccountId)

  const handleSwitch = async (accountId) => {
    if (accountId === currentAccountId || switching) return
    setSwitching(true)
    const result = await setActiveWorkspace(accountId)
    if (!result.success) {
      setSwitching(false)
      // eslint-disable-next-line no-alert
      alert(result.error || 'Failed to switch workspace')
      return
    }
    // Full reload, deliberately — see file header. Never a soft navigate here.
    window.location.href = landingRoute
  }

  return (
    <div className="relative workspace-switcher-container" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs sm:text-sm font-medium ${subtextColor} ${hoverBgClass} rounded-lg transition-colors max-w-[10rem] sm:max-w-[14rem] disabled:opacity-60`}
        aria-label={`Current workspace: ${current?.account_name || 'Workspace'}`}
        aria-expanded={open}
        title={current?.account_name || 'Switch workspace'}
      >
        <Building2 className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">{switching ? 'Switching…' : (current?.account_name || 'Workspace')}</span>
        <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" />
      </button>

      {open && (
        <div className={`absolute right-0 sm:left-0 mt-2 w-72 max-w-[90vw] rounded-lg shadow-xl border ${borderColor} ${headerBgClass} py-1 z-50 max-h-96 overflow-y-auto`}>
          <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${subtextColor}`}>
            Your Workspaces
          </div>

          {owned.length > 0 && (
            <>
              <div className={`px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-wide ${subtextColor}`}>Owned by you</div>
              {owned.map((w) => (
                <WorkspaceRow key={w.account_id} workspace={w} isCurrent={w.account_id === currentAccountId} onSelect={handleSwitch} textColor={textColor} subtextColor={subtextColor} hoverBgClass={hoverBgClass} owner />
              ))}
            </>
          )}

          {member.length > 0 && (
            <>
              <div className={`px-4 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide ${subtextColor}`}>Member of</div>
              {member.map((w) => (
                <WorkspaceRow key={w.account_id} workspace={w} isCurrent={w.account_id === currentAccountId} onSelect={handleSwitch} textColor={textColor} subtextColor={subtextColor} hoverBgClass={hoverBgClass} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function WorkspaceRow({ workspace, isCurrent, onSelect, textColor, subtextColor, hoverBgClass, owner }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(workspace.account_id)}
      className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm ${hoverBgClass} transition-colors`}
    >
      <span className="w-4 flex-shrink-0">{isCurrent && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}</span>
      <span className={`flex-1 truncate ${textColor}`}>{workspace.account_name || workspace.account_code || 'Workspace'}</span>
      {owner && <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" aria-label="Owned by you" />}
      {typeof workspace.total_members === 'number' && (
        <span className={`text-xs ${subtextColor} flex-shrink-0`}>{workspace.total_members}</span>
      )}
    </button>
  )
}
