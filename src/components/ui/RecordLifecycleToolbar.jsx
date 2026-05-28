import { Send, RotateCcw, Archive, Trash2, CheckCircle, Eye } from 'lucide-react'
import Button from './Button'

export default function RecordLifecycleToolbar({
  recordStatus = 'live',
  onSubmit,
  onAmend,
  onReverse,
  onArchive,
  onDelete,
  onValidate,
  onView,
  loading = false,
  className = '',
}) {
  const btn = (label, icon, handler, variant = 'secondary') => (
    <Button type="button" variant={variant} size="sm" disabled={loading || !handler} onClick={handler}>
      {icon}
      <span className="ml-1">{label}</span>
    </Button>
  )

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {recordStatus === 'unauthorised' && (
        <>
          {btn('Submit', <Send className="h-4 w-4" />, onSubmit)}
          {btn('Validate', <CheckCircle className="h-4 w-4" />, onValidate, 'primary')}
          {btn('Delete', <Trash2 className="h-4 w-4" />, onDelete, 'danger')}
        </>
      )}
      {recordStatus === 'live' && (
        <>
          {btn('Amend', <RotateCcw className="h-4 w-4" />, onAmend)}
          {btn('Reverse', <RotateCcw className="h-4 w-4" />, onReverse)}
        </>
      )}
      {recordStatus === 'history' && btn('Archive', <Archive className="h-4 w-4" />, onArchive)}
      {btn('View', <Eye className="h-4 w-4" />, onView)}
    </div>
  )
}
