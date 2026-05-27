import { Award } from 'lucide-react'
import PmisGapListHub from '../../components/PmisGapListHub'
import { listGapRecords } from '../../services/gapDataService'

export default function SimExamModePage() {
  return (
    <PmisGapListHub
      title="Certification Exams"
      description="Browse and sit practice certification exams."
      icon={Award}
      storageKey="gap-sim-exams"
      columns={[
        { key: 'exam_title', label: 'Exam' },
        { key: 'exam_code', label: 'Code' },
        { key: 'duration_minutes', label: 'Duration (min)' },
        { key: 'is_active', label: 'Active' },
      ]}
      loadRows={() => listGapRecords('certification_exams', { sim: true, orderBy: 'exam_title' })}
      baseFilename="Certification-Exams"
    />
  )
}
