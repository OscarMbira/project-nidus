import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ApprovalWorkflowPanel from '../../components/forms/ApprovalWorkflowPanel'
import FormVersionHistory from '../../components/forms/FormVersionHistory'
import FormAuditTimeline from '../../components/forms/FormAuditTimeline'
import { approveForm, getFormInstance, rejectForm } from '../../services/formEngineService'

export default function FormView({ mode = 'platform' }) {
  const { formInstanceId } = useParams()
  const [instance, setInstance] = useState(null)

  useEffect(() => {
    getFormInstance(formInstanceId, mode).then((r) => r.success && setInstance(r.data))
  }, [formInstanceId, mode])

  return (
    <div className="space-y-4 p-4 text-gray-100">
      <h1 className="text-lg font-semibold">Form View</h1>
      <pre className="rounded bg-gray-950 p-3 text-xs text-gray-300">{JSON.stringify(instance, null, 2)}</pre>
      <ApprovalWorkflowPanel
        status={instance?.status}
        onApprove={() => approveForm(formInstanceId, null, 'Approved', mode)}
        onReject={() => rejectForm(formInstanceId, null, 'Rejected', mode)}
      />
      <FormVersionHistory versions={[]} />
      <FormAuditTimeline events={[]} />
    </div>
  )
}
