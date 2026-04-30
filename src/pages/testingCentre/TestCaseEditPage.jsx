import { useParams } from 'react-router-dom'
import TestCaseWizard from '../../components/testingCentre/TestCaseForm/TestCaseWizard'

export default function TestCaseEditPage({ pathPrefix = '/platform/testing-centre', mode = 'platform' }) {
  const { id } = useParams()
  return <TestCaseWizard pathPrefix={pathPrefix} mode={mode} testCaseId={id} />
}
