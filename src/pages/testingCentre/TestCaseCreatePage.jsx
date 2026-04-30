import TestCaseWizard from '../../components/testingCentre/TestCaseForm/TestCaseWizard'

export default function TestCaseCreatePage({ pathPrefix = '/platform/testing-centre', mode = 'platform' }) {
  return <TestCaseWizard pathPrefix={pathPrefix} mode={mode} testCaseId={null} />
}
