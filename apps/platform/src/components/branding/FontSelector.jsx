/**
 * FontSelector
 * Dropdown font-family chooser that injects a Google Fonts
 * <link> on selection and renders a live preview sentence.
 */

const FONTS = [
  { value: 'system',      label: 'System Default',  url: null },
  { value: 'inter',       label: 'Inter',            url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap' },
  { value: 'roboto',      label: 'Roboto',           url: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap' },
  { value: 'open-sans',   label: 'Open Sans',        url: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap' },
  { value: 'lato',        label: 'Lato',             url: 'https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap' },
  { value: 'poppins',     label: 'Poppins',          url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap' },
  { value: 'nunito',      label: 'Nunito',           url: 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600&display=swap' },
  { value: 'source-sans', label: 'Source Sans 3',    url: 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap' },
]

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

function injectFont(url) {
  if (!url) return
  const id = `gfont-${encodeURIComponent(url)}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id   = id
  link.rel  = 'stylesheet'
  link.href = url
  document.head.appendChild(link)
}

export default function FontSelector({ value = 'inter', onChange }) {
  const selectedFont = FONTS.find((f) => f.value === value) || FONTS[1]

  const handleChange = (e) => {
    const chosen = FONTS.find((f) => f.value === e.target.value)
    if (chosen?.url) injectFont(chosen.url)
    onChange(e.target.value)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Font Family
        </label>
        <select
          value={value}
          onChange={handleChange}
          className="w-full max-w-xs px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          {FONTS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      {/* Live preview */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Preview – {selectedFont.label}</p>
        <p
          style={{ fontFamily: FONT_STACKS[value] || FONT_STACKS.inter }}
          className="text-2xl text-gray-900 dark:text-white font-semibold"
        >
          The quick brown fox jumps over the lazy dog.
        </p>
        <p
          style={{ fontFamily: FONT_STACKS[value] || FONT_STACKS.inter }}
          className="text-sm text-gray-600 dark:text-gray-300 mt-1"
        >
          ABCDEFGHIJKLMNOPQRSTUVWXYZ &nbsp; abcdefghijklmnopqrstuvwxyz &nbsp; 0123456789
        </p>
      </div>
    </div>
  )
}
