/**
 * PMORFPPrint - Print-friendly RFP page (minimal layout for printing)
 */

import RFPPrintView from '../../components/rfp/RFPPrintView'

export default function PMORFPPrint() {
  return (
    <div className="min-h-screen bg-white">
      <RFPPrintView />
    </div>
  )
}
