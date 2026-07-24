import React from 'react'

export default function SimEVMPanel({ evm = {}, theme }) {
  const cpi = evm.cpi ?? 1
  const spi = evm.spi ?? 1
  const tint = (x) => (x >= 0.9 ? 'text-green-600' : x >= 0.75 ? 'text-amber-600' : 'text-red-600')
  return (
    <div className={`rounded-lg p-4 border ${theme === 'dark' ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-gray-50'}`}>
      <div className="grid grid-cols-3 gap-3 text-center text-sm">
        <div>
          <div className={`text-2xl font-bold ${tint(cpi)}`}>{cpi?.toFixed ? cpi.toFixed(2) : cpi}</div>
          <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>CPI</div>
        </div>
        <div>
          <div className={`text-2xl font-bold ${tint(spi)}`}>{spi?.toFixed ? spi.toFixed(2) : spi}</div>
          <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>SPI</div>
        </div>
        <div>
          <div className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            {evm.eac != null ? Number(evm.eac).toLocaleString() : '—'}
          </div>
          <div className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>EAC</div>
        </div>
      </div>
    </div>
  )
}
