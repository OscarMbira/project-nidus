import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { simDb } from '../../services/supabase/supabaseClient'
import SimEVMPanel from '../../components/sim/SimEVMPanel'
import { TableRowNumberHeader, TableRowNumberCell } from '../../components/ui/Table'
import { getDisplayRowNumber } from '../../utils/tableRowNumberUtils'

export default function SimEVMDashboard() {
  const { runId } = useParams()
  const [evm, setEvm] = useState({})

  useEffect(() => {
    ;(async () => {
      const { data } = await simDb.from('simulation_runs').select('evm_snapshot').eq('id', runId).single()
      setEvm(data?.evm_snapshot || {})
    })()
  }, [runId])

  const actuals = Array.isArray(evm.period_actuals) ? evm.period_actuals : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold">EVM dashboard</h1>
      <SimEVMPanel evm={evm} theme="dark" />
      <section>
        <h2 className="font-semibold mb-2">Period actuals (seed / tick)</h2>
        <table className="w-full text-sm border-collapse border border-gray-700">
          <thead>
            <tr className="bg-gray-800">
                <TableRowNumberHeader className="!normal-case" />
              <th className="border border-gray-700 p-2 text-left">Sim day</th>
              <th className="border border-gray-700 p-2 text-left">AC</th>
            </tr>
          </thead>
          <tbody>
            {actuals.map((row, i) => (
              <tr key={i}>
                    <TableRowNumberCell number={getDisplayRowNumber(index)} />
                <td className="border border-gray-700 p-2">{row.sim_day}</td>
                <td className="border border-gray-700 p-2">{row.ac}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}
