/**
 * Simulator PMO - Practice RFP Print view
 */

import RFPPrintView from '../../../components/rfp/RFPPrintView'
import * as simRfpService from '../../../services/simRfpService'

export default function SimulatorPMORFPPrint() {
  return (
    <div className="min-h-screen bg-white">
      <RFPPrintView rfpService={simRfpService} />
    </div>
  )
}
