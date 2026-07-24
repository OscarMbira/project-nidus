/**
 * BrandingPreview
 * A mini live-preview panel showing how the current branding
 * settings will look in the app UI (header, sidebar, buttons).
 * Reads directly from the `branding` prop (not from DOM).
 */

const FONT_STACKS = {
  system:       '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  inter:        '"Inter", sans-serif',
  roboto:       '"Roboto", sans-serif',
  'open-sans':  '"Open Sans", sans-serif',
  lato:         '"Lato", sans-serif',
  poppins:      '"Poppins", sans-serif',
  nunito:       '"Nunito", sans-serif',
  'source-sans':'"Source Sans 3", sans-serif',
}

export default function BrandingPreview({ branding }) {
  const {
    app_display_name,
    app_tagline,
    primary_logo_url,
    header_bg_color    = '#1F2937',
    sidebar_bg_color   = '#111827',
    sidebar_active_color = '#3B82F6',
    sidebar_text_color = '#F9FAFB',
    primary_color      = '#3B82F6',
    secondary_color    = '#1E40AF',
    button_color       = '#3B82F6',
    link_color         = '#60A5FA',
    font_family        = 'inter',
    base_font_size     = 'medium',
  } = branding || {}

  const fontStack = FONT_STACKS[font_family] || FONT_STACKS.inter
  const sizeMap = { small: '14px', medium: '16px', large: '18px', 'x-large': '20px' }
  const fontSize = sizeMap[base_font_size] || sizeMap.medium
  const displayName = app_display_name || 'Project Nidus'

  return (
    <div
      className="rounded-xl overflow-hidden border border-gray-300 dark:border-gray-600 shadow-lg select-none"
      style={{ fontFamily: fontStack, fontSize }}
    >
      {/* Mini Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ backgroundColor: header_bg_color }}
      >
        <div className="flex items-center gap-2">
          {primary_logo_url ? (
            <img src={primary_logo_url} alt="Logo" className="h-6 object-contain" />
          ) : (
            <div
              className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: primary_color }}
            >
              {displayName[0]?.toUpperCase() || 'P'}
            </div>
          )}
          <div>
            <p className="text-white text-xs font-bold leading-tight">{displayName}</p>
            {app_tagline && (
              <p className="text-gray-400 text-[10px] leading-tight">{app_tagline}</p>
            )}
          </div>
        </div>
        <div className="flex gap-1.5">
          <div className="w-4 h-4 rounded-full bg-gray-600" />
          <div className="w-4 h-4 rounded-full bg-gray-600" />
        </div>
      </div>

      {/* Body: Sidebar + Content */}
      <div className="flex" style={{ minHeight: '120px' }}>
        {/* Mini Sidebar */}
        <div
          className="flex flex-col gap-1 p-2 flex-shrink-0 w-24"
          style={{ backgroundColor: sidebar_bg_color }}
        >
          {['Dashboard', 'Projects', 'Tasks', 'Reports'].map((item, i) => (
            <div
              key={item}
              className="px-2 py-1 rounded text-[10px] truncate"
              style={
                i === 0
                  ? { backgroundColor: sidebar_active_color, color: '#ffffff', fontWeight: 600 }
                  : { color: sidebar_text_color, opacity: 0.75 }
              }
            >
              {item}
            </div>
          ))}
        </div>

        {/* Mini Content */}
        <div className="flex-1 p-3 bg-white dark:bg-gray-900 space-y-2">
          <p
            className="text-xs font-semibold"
            style={{ color: primary_color }}
          >
            Page Heading
          </p>
          <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-relaxed">
            Sample content text in {font_family} font.{' '}
            <span style={{ color: link_color }} className="underline cursor-pointer">
              A link example
            </span>{' '}
            appears here.
          </p>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded text-[10px] text-white font-medium"
              style={{ backgroundColor: button_color }}
            >
              Primary
            </button>
            <button
              className="px-3 py-1 rounded text-[10px] text-white font-medium"
              style={{ backgroundColor: secondary_color }}
            >
              Secondary
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
