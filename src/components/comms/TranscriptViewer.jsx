export default function TranscriptViewer({ segments = [] }) {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto text-sm text-gray-800 dark:text-gray-200">
      {(segments || []).map((s) => (
        <p key={s.id || `${s.segment_index}-${s.start_time_sec}`}>
          <span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs">
            [{s.speaker_label || 'Speaker'} {s.start_time_sec != null ? `${Number(s.start_time_sec).toFixed(1)}s` : ''}]
          </span>{' '}
          {s.text}
        </p>
      ))}
    </div>
  )
}
